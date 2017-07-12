import {Package} from "./repositories"

export class PackageJSON
{
    name:string;
    version:string;
    status:number;
    section:string;
    description:string;
    size:number;
}

export class PackageQuery
{
    availablePackages:{[key:string]:Package} = {};
    installedPackages:{[key:string]:Package} = {};
    sectionPackages:{[key:string]:Array<string>} = {};
    index:number;

    constructor(availablePackages:{[key:string]:Package}, installedPackages:{[key:string]:Package}, sectionPackages:{[key:string]:Array<string>})
    {
        this.availablePackages = availablePackages;
		this.installedPackages = installedPackages;
        this.sectionPackages = sectionPackages;
        this.index = 0;
    }

    static jsonify(pkg:Package)
    {
        let p:PackageJSON = new PackageJSON();
        p.name = pkg.name;
        p.version = pkg.version;
        p.status = pkg.status;
        let info:{[key:string]:string} = pkg.getInfo(["Description", "Size", "Section"]);
        p.description = info["Description"];
        p.size = parseInt(info["Size"]);
        p.section = info["Section"];

        return p;
    }

    static jsonifyAll(pkgs:Array<Package>)
    {
        let parr = [];
        pkgs.forEach((p)=>parr.push(PackageQuery.jsonify(p)));
        return pkgs;
    }

    getSectionPackages(section:string, fromStart:Boolean=false):Array<PackageJSON>
    {
        if(fromStart)
            this.index = 0;

        let packages:Array<PackageJSON> = []
        this.sectionPackages[section].sort().slice(this.index, this.index+10).forEach((key:string)=>{
            let p:PackageJSON = PackageQuery.jsonify(this.availablePackages[key])
            packages.push(p);
        })

        this.index+=10;
        
        return packages;
    }

    getInstalledPackages(fromStart:Boolean=false):Array<PackageJSON>
    {
        if(fromStart)
            this.index = 0;
        
        let packages:Array<PackageJSON> = []
        Object.keys(this.installedPackages).sort().slice(this.index, this.index+10)
        .forEach((key)=>{
            packages.push(PackageQuery.jsonify(this.installedPackages[key]));
        });
        
        this.index+=10;
        
        return packages;
    }

    getPackages(fromStart:Boolean=false):Array<PackageJSON>
    {
        if(fromStart)
            this.index = 0;
        
        let packages:Array<PackageJSON> = []
        Object.keys(this.availablePackages).sort().slice(this.index, this.index+10)
        .forEach((key)=>{
            packages.push(PackageQuery.jsonify(this.availablePackages[key]));
        });
        
        this.index+=10;
        
        return packages;
    }
}