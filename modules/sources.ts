import * as fs from "fs";
import * as path from "path";
import * as readLine from "linebyline";
import {Project} from "./project";

export class Source
{
    sourceFilePath : string;
    listFilePath : string;
    entryLine : string;
    link : string;
    url : string;
    filename : string;
    release : string;
    origin : string;
    releaseFilename : string;
    ppa: string;
    ppaShort : string;
    component: string;
    priority: number;
    constraint: AptConstraint;

    constructor(sourceFilePath="",listPath="",entryLine="",link="",url="",release="",component="",releaseFilename="") {
        this.sourceFilePath = sourceFilePath;
        this.entryLine = entryLine;
        this.link = link;
        this.url = "http://"+url;
        this.filename = link.replace("http://", "").replace("http:/", "").replace(".gz", "").replace(/\//g, "_").trim();
        this.listFilePath = path.join(listPath, this.filename);
        this.release = release;
        this.origin = link.replace("http://", "").replace("http:/", "").split("/")[0];
        this.releaseFilename = releaseFilename;
        this.ppa = link.replace ("http://", "").replace ("http:/", "").split("/ubuntu/dists")[0].trim();
        this.ppaShort = this.ppa.replace("ppa.launchpad.net/","ppa:");
        this.component = component;
        this.priority = 0;
    }
}

export class AptConstraint
{
    packages: Array<string> = [];
    priority: number;
    pinOrigin: string;
    pinOriginURL: string;
    pinVersion: string;
    pinRelease: string;
    pinComponent: string;

    constructor(pkg:string, pin:string, priority:number)
    {
        let split:Array<string>;
        pkg = pkg.trim();

        this.pinOrigin = undefined;
        this.pinOriginURL = undefined;
        this.pinVersion = undefined;
        this.pinRelease = undefined;
        this.pinComponent = undefined;
		this.packages = [];

		if (pkg.includes(" "))
        {
			split = pkg.split(" ");
            for (let s of split)
                this.packages.push(s.trim());
		} else
			this.packages.push(pkg);

        pin = pin.trim();

        if (pin.includes(" "))
        {
            var pinSplitArray = pin.split(" ",2);
            var key = pinSplitArray[0].trim();
            var value = pinSplitArray[1].trim();
            
            if (key === "release")
            {
                var valueSplitArray = value.split(",");
                for (var valueItem of valueSplitArray)
                {
                    if (valueItem.includes("="))
                    {
                        let valueSplitArray = value.split("=");
                        let category = valueSplitArray[0].trim()

                        switch(category)
                        {
                            case "o" :
                                    this.pinOrigin = valueSplitArray[1].trim();
                                    if(this.pinOrigin.includes("LP-PPA")) //Convert to Launchpad PPA address
                                        this.pinOrigin = this.pinOrigin.replace("LP-PPA", "ppa.launchpad.net");
                                    break;
                            case "a" :
                                this.pinRelease = valueSplitArray[1].trim();
                                break;
                            case "c" :
                                this.pinComponent = valueSplitArray[1].trim();    
                            case "n" : /* TODO: To be investigated */
                            default : break;
                        }
                    }
                }
            }
            else if (key === "origin")
                this.pinOriginURL = value;
            else if (key === "version")
                this.pinVersion = value;
        }        
                
		this.priority = priority;
    }
}

export class SourceManager
{
    sources:Array<Source> = [];
    sourcesKeys:Array<string> = [];
    architecture:string = "binary-i386";
    constraintArray:Array<AptConstraint> = [];
    project:Project;

    constructor(project:Project)
    {
        this.project = project;
    }

    public scanSources()
    {
        this.scanSourceLists();
        this.scanSourceConstraints();
        this.sortSources();
    }

    public scanSourceLists()
    {
        var sourcePathArray = fs.readdirSync(this.project.sourcesPath);

        var counter = 0;    
        for (var sourcePath of sourcePathArray)
        {
            counter++;
            sourcePath = path.join(this.project.sourcesPath,sourcePath);

            if (!sourcePath.endsWith(".list"))
                continue;

            let data:string = fs.readFileSync(sourcePath,"utf-8");

            console.log("[%d/%d] Reading %s",counter,sourcePathArray.length,sourcePath);

            let dataSplitArray:Array<string> = data.split("\n");
            
            for (let line of dataSplitArray)
            {            
                line = line.trim();
                
                if (line.length === 0 || line.startsWith("#") || line.startsWith("deb-src") || line.startsWith("deb cdrom"))
                    continue;

                var sourceEntryLine = line;

                if (line.includes("#"))
                    line = line.split("#",2)[0];

                line = line.replace("deb ", "").replace("\"","").trim();
                line = line.replace("http://","").trim();

                
                let rawMainURL:string =  line.split(" ")[0].trim();
                if (line !== rawMainURL)
                    line = line.replace(rawMainURL,"").trim();
                
                let lineSplitArray:Array<string> = line.split(" ");

                if (!rawMainURL.endsWith("/"))
                    rawMainURL += "/";

                let rawMainSource:string = rawMainURL + "dists/" + lineSplitArray[0];
                let rawRelease:string = lineSplitArray[0];
                
                lineSplitArray.shift(); //Remove first element
                for (let rawComponent of lineSplitArray)
                {                
                    let link:string = "http://" + rawMainSource + "/" + rawComponent + "/" + this.architecture + "/Packages.gz";
                    if (!this.sourcesKeys.includes(link))
                    {
                        this.sourcesKeys.push(link);
                        var source = new Source(sourcePath, this.project.listsPath, sourceEntryLine,link,rawMainURL,rawRelease,rawComponent,"rel.ReleaseFilename");            
                        this.sources.push(source);                    
                    }
                }
            }
        }
    }

    public scanSourceConstraints()
    {
        let constraintsPathArray:Array<string> = fs.readdirSync(this.project.sourcesPath);
            
        for (var constrainPath of constraintsPathArray)
        {        
            constrainPath = path.join(this.project.sourcesPath,constrainPath);

            if (!(constrainPath.endsWith(".pref") || constrainPath === "preferences"))
                continue;

            let data:string = fs.readFileSync(constrainPath,"utf-8");

            console.log("Reading %s",constrainPath);

            let dataSplitArray:Array<string> = data.split("\n");        
            let pkg:string = undefined;
            let pin:string = undefined;
            let priority:number = undefined;
            
            for (let line of dataSplitArray)
            {            
                line = line.trim();

                if (line.includes(":"))
                {
                    let splitArray:Array<string> = line.split(":");
                    if (splitArray[0].trim() === "Package")
                        pkg = splitArray[1].trim();
                    else if (splitArray[0].trim() === "Pin")
                        pin = splitArray[1].trim();
                    else if (splitArray[0].trim() === "Pin-Priority")
                        priority = parseInt(splitArray[1].trim());
                }
                else if (line.length === 0)
                {                
                    if (pkg && pin && priority)
                    {
                        this.constraintArray.push(new AptConstraint(pkg,pin,priority))
                        pkg = pin = priority = undefined;
                    }
                }            
            }
            if (pkg && pin && priority)
                this.constraintArray.push(new AptConstraint(pkg,pin,priority))
        }
    }

    public sortSources()
    {                
        /* Assign priorities to sources */
        for (let constraint of this.constraintArray)
        {
            for (let source of this.sources)
            {
                if (constraint.pinRelease)
                {
                    if (source.release !== constraint.pinRelease)
                        continue;
                }
                if (constraint.pinOrigin)
                {
                    if (source.origin.toLowerCase() !== constraint.pinOrigin)                
                        continue;
                }
                if (constraint.pinOriginURL)
                {
                    if (source.ppa.replace(/\//g, "-") !== constraint.pinOriginURL)
                        continue;
                }
                    
                source.constraint = constraint;
                source.priority = constraint.priority;            
            }
        }

        this.sources.sort((a,b)=>{
            if (a.priority > b.priority)
                return 1;
            else if (a.priority < b.priority)
                return -1;
            else
                return 0;
        });
    }
}