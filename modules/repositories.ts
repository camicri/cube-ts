import * as fs from "fs";
import * as path from "path";
import * as readLine from "linebyline";
import * as sequential from "promise-sequential";

import {Source, AptConstraint} from "./sources";
import {Version} from "./version";
import {DependencyManager, DependencyItem} from "./dependency";
import {Project} from "./project"

export class Package
{
    name:string;
    version:string;
    installedVersion:string;
    //TODO: Change status to enum
    status:number;
    seekStart:number;
    seekEnd:number;
    source:Source;
    filename:String;
    section:String;
    forced:Boolean = false;
    reverseDepends:{[key:string]:DependencyItem};

    getInfo(keys:Array<string>):{[key:string]:string}
    {
        let filePath:string = this.source.listFilePath;
        let fd:number = fs.openSync(filePath,"r")
        let buffer:Buffer = new Buffer(this.seekEnd - this.seekStart);
        
        fs.readSync(fd, buffer, 0, buffer.length, this.seekStart);
        
        let keyDict:{[key:string]:string} = {}; 

        for(let s of buffer.toString().split("\n"))
        {
            for(let k of keys)
            {
                if(!keyDict[k] && s.startsWith(k+":"))
                {
                    keyDict[k] = s.split(/:(.+)/)[1].trim();
                }
            }
            if(keys.length === 1 && keyDict[keys[0]] !== undefined)
                break;
        }
        
        fs.closeSync(fd);
        
        return keyDict;
    }
}

export class RepositoryManager
{
    project:Project;

    availablePackages:{[key:string]:Package} = {};
    installedPackages:{[key:string]:Package} = {};
    providedPackages:{[key:string]:Array<string>} = {};
    upgradablePackages:Array<string> = [];
    downloadedPackages:Array<string> = [];
    cleanupPackages:Array<string> = [];
    sectionPackages:{[key:string]:Array<string>} = {};

    constructor(project:Project)
    {
        this.project = project;
    }

    scanRepositories(sources:Array<Source>)
    {
        var promises:Array<any> = [];
        
        this.reset();

        for(let source of sources)
            promises.push(()=>this.scanRepository(source));
        
        return sequential(promises);
    }

    scanRepository(source:Source)
    {
        let filePath:string = path.join(this.project.listsPath, source.filename);
        var that = this;

        console.log("Scanning %s", source.filename)
        
        if(source.filename === "status")
        {
            this.reset();
        }
        
        return new Promise((resolve,reject)=>{
            if(!fs.existsSync(filePath))
            {
                console.log("[ERROR] %s not found!",source.filename);
                resolve();
                return;
            }
        
            var rl = readLine(filePath);
            let currentPackage:Package = new Package();
            let prevPackage:string = undefined;
            let lastByteCount:number = undefined;
            
            rl.on("line", function(line:string , lineCount:number, byteCount:number){
                lastByteCount = byteCount;
                if(line.startsWith("Package:"))
                {
                    if(currentPackage.name !== undefined)
                    {
                        if(prevPackage)
                            currentPackage.seekEnd = byteCount - line.length - 1;
                            
                        if(source.filename !== "status")
                            that.addToAvailablePackages(currentPackage);
                        else
                            that.addToInstalledPackages(currentPackage);
                    }

                    currentPackage = new Package();
                    currentPackage.name = line.split(/:(.+)/)[1].trim();
                    currentPackage.source = source;
                    currentPackage.seekStart = byteCount - line.length;
                    
                    prevPackage = currentPackage.name;
                }
                else if(line.startsWith("Version:"))
                    currentPackage.version = line.split(/:(.+)/)[1].trim();
            });

            rl.on('close',()=>{
                if(currentPackage.name !== undefined)
                {
                    if(prevPackage)
                        currentPackage.seekEnd = lastByteCount - 1;
                        
                    if(source.filename !== "status")
                        that.addToAvailablePackages(currentPackage);
                    else
                        that.addToInstalledPackages(currentPackage);
                }
                resolve();
            });
        });
    }

    addToAvailablePackages(pkg:Package)
    {
        let repeated:Boolean = false;
        pkg.filename = pkg.source.url + pkg.filename;

        if(!this.availablePackages[pkg.name])
        {
            //Check constraint
            if(pkg.source.constraint)
                pkg.forced = this.isForcedByConstraint(pkg)
            this.availablePackages[pkg.name] = pkg
        }
        else //Duplicate package here
        {
            if(this.availablePackages[pkg.name].forced)
                return;

            if(Version.compare(this.availablePackages[pkg.name].version,pkg.version) === -1)
                this.availablePackages[pkg.name] = pkg;
            
            repeated = true;
        }

        let info:{[key:string]:string} = pkg.getInfo(["Provides","Section"]);

        if(!repeated)
        {    
            info["Section"] = info["Section"].includes("/")?info["Section"].split("/")[1]:info["Section"];

            if(this.sectionPackages[info["Section"]] === undefined)
                this.sectionPackages[info["Section"]] = [];
            
            this.sectionPackages[info["Section"]].push(pkg.name);    
        }
        
        if(info["Provides"])
        {
            this.addToProvidedPackages(pkg);
        }
        
    }

    addToInstalledPackages(pkg)
    {
        if(!this.installedPackages[pkg.name])
        {
            let status:string = pkg.getInfo(["Status"])["Status"];
            if(status !== undefined && status.includes("installed"))
                this.installedPackages[pkg.name] = pkg;
        }
    }

    addToProvidedPackages(pkg:Package)
	{		
		let provides = pkg.getInfo(["Provides"])["Provides"].split(",");

		for (let p of provides)
		{
			p = p.trim();

			if(!this.providedPackages[p])
				this.providedPackages[p] = [pkg.name];
			else if(!this.providedPackages[p].includes(pkg.name))
				this.providedPackages[p].push(pkg.name);
		}
	}

    isForcedByConstraint(pkg:Package):Boolean
	{
		for (var regex in pkg.source.constraint.packages)
		{
			if (regex === "*")
				return true;
			else if (!regex.includes("*") && regex === pkg.name)
				return true;
			else
			{
				regex = regex.replace(/^\*/,"^").replace(/\*$/,"$");
				if(pkg.name.match(regex))
					return true;
			}
		}
		
		return false;
	}
    
    markPackages(reset:Boolean=false)
	{
		var result;

        if(reset)
        {
            /* Reset */
            for(let key of Object.keys(this.availablePackages))
            {
                this.availablePackages[key].status = undefined;
                this.availablePackages[key].installedVersion = undefined;
                this.availablePackages[key].reverseDepends = undefined;
                this.availablePackages[key].forced = false;
            }
        }
        
        this.upgradablePackages = [];

		for (var name of Object.keys(this.installedPackages))
		{
			//Installed but not available in repo list
			if(!this.availablePackages[name])
				continue;

			this.availablePackages[name].installedVersion = this.installedPackages[name].version;

			result = Version.compare(this.availablePackages[name].version,this.installedPackages[name].version);

			if (result === 0)
			{
				this.availablePackages[name].status = 1; //Installed				
				this.installedPackages[name].status = 1;
				this.availablePackages[name].installedVersion = this.installedPackages[name].version;
			}
			else if(result === 1)
			{
				this.availablePackages[name].status = 2; //Upgradable
				this.installedPackages[name].status = 2;
				this.upgradablePackages.push(name);				
			}
			else if(result === -1)
			{
				//Experimental: Newer packages still marked as installed
				this.availablePackages[name].status = 1; //Installed
				this.installedPackages[name].status = 1;
				this.availablePackages[name].installedVersion = this.installedPackages[name].version;
			}
		}

		this.setReverseDependencies();
	}

    setReverseDependencies()
	{
		if (this.upgradablePackages.length === 0)
			return;

		let pkg:Package;
		let depItemGroup:{or:Array<Array<DependencyItem>>,and:Array<DependencyItem>};		

		for (var name of this.upgradablePackages)
		{
			pkg = this.availablePackages[name];

            let pkgInfo:{[key:string]:string} = pkg.getInfo(["Depends","Pre-Depends","Recommends"])

            let pkgDepends:string = pkgInfo["Depends"];
            let pkgPredepends:string = pkgInfo["Pre-Depends"];
            let pkgRecommends:string = pkgInfo["Recommends"];

			let depString:string = (pkgDepends)?pkgDepends:"";

			if (pkgPredepends && pkgPredepends !== "")
				depString += (depString!==""?",":"") + pkgPredepends;

			if (pkgRecommends && pkgRecommends !== "")
				depString += (depString!==""?",":"") + pkgRecommends;

			if (depString.trim().length === 0)
				continue;

			depItemGroup = DependencyManager.getDependencyItemGroup(depString);

			for (var depItem of depItemGroup.and)
			{
				if (!this.availablePackages[depItem.name])
					continue;

				if (!this.availablePackages[depItem.name].reverseDepends)				
					this.availablePackages[depItem.name].reverseDepends = {};
				this.availablePackages[depItem.name].reverseDepends[depItem.name] = depItem;
			}
		}
	}

    reset()
    {
        this.availablePackages = {};
        this.installedPackages = {};
        this.providedPackages = {};
        this.upgradablePackages = [];
        this.downloadedPackages = [];
    }
}