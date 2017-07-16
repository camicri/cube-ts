import * as fs from "fs";
import * as path from "path";
import * as jsonFile from "jsonfile";
import * as os from "os";
import * as shell from "shelljs"
import {Globals} from "./globals"


export class ProjectInfo
{
    /* Metadata */
    name:string;
    version:string;
    hostname:string;
    username:string
    operatingSystem:string;
    distribution:string;
    codename:string;
    release:string;
    upstreamDistribution:string;
    upstreamCodename:string;
    upstreamRelease:string;
    architecture:string;
    dateCreated:string;
}

export class ProjectManager
{
    createProject(name:string, destinationPath:string):Project
    {
        let info:ProjectInfo = this.generateProjectInformation(name);
        let project:Project = new Project(info, path.join(destinationPath,name));
        
        this.createDirectories(project);
        this.saveProject(project);
        this.updateProjectFiles(project);

        return this.openProject(path.join(destinationPath,name));
    }

    generateProjectInformation(name:string):ProjectInfo
    {
        let info:ProjectInfo = new ProjectInfo();

        info.name = name;
        info.version = Globals.application_version;
        info.hostname = os.hostname();
        info.operatingSystem = os.platform();
        info.distribution = shell.exec("lsb_release -d").stdout.split(":")[1].trim();
        info.codename = shell.exec("lsb_release -c").stdout.split(":")[1].trim();
        info.release = shell.exec("lsb_release -r").stdout.split(":")[1].trim();

        if (fs.existsSync(Globals.upstream_lsb_release_path))
        {
            let dict:{[key:string]:string} = {};
            
            shell.cat(Globals.upstream_lsb_release_path).split("\n").forEach((s)=>{
                let output:Array<string> = s.split("=");
                if(output.length === 2)
                    dict[output[0].trim()] = output[1].trim().replace(/\"/g,"");
            });;
            
            info.upstreamDistribution = dict["DISTRIB_ID"];
            info.upstreamCodename = dict["DISTRIB_CODENAME"];
            info.upstreamRelease = dict["DISTRIB_RELEASE"];
        }

        if(os.arch() == "x86")
            info.architecture = "binary-i386";
        else if(os.arch() == "x64")
            info.architecture = "binary-amd64";
            
        info.dateCreated = new Date().toDateString()+" "+new Date().toTimeString();

        return info;
    }

    updateProjectFiles(proj:Project, statusOnly:Boolean=false)
    {
        /* Update status file */
        shell.exec("cp " + Globals.AptInformation.statusFilePath + " \"" + proj.listsPath + "\"");

        if(!statusOnly)
        {
            /* Update lists */
            shell.exec("cp " + path.join(Globals.AptInformation.listsDirectoryPath,"*_Packages") + " \"" + proj.listsPath + "\"");
            
            /* Update sources */
            shell.exec("cp " + path.join(Globals.AptInformation.sourcesDirectoryPath,"*.list") + " \"" + proj.sourcesPath + "\"");
            shell.exec("cp " + Globals.AptInformation.sourceFilePath + " \"" + proj.sourcesPath + "\""); 
            
            /* Update preferences */
            shell.exec("cp " + path.join(Globals.AptInformation.preferencesDirectoryPath,"*") + " \"" + proj.sourcesPath + "\"");
            shell.exec("cp " + Globals.AptInformation.preferencesDirectoryPath + " \"" + proj.sourcesPath + "\""); 
        }
    }

    createDirectories(proj:Project)
    {
        fs.mkdirSync(proj.projectPath);
        fs.mkdirSync(proj.sourcesPath);
        fs.mkdirSync(proj.listsPath);
        fs.mkdirSync(proj.listsPartialPath);
        fs.mkdirSync(proj.packagesPath);
        fs.mkdirSync(proj.tempPath);
    }

    saveProject(proj:Project)
    {
        jsonFile.writeFileSync(proj.projectFile, proj.projectInfo);
    }

    openProject(projPath:string):Project
    {
        if(!fs.existsSync(projPath))
            return undefined;

        let infoPath:string = path.join(projPath,"info.cube");
        let projInfo:ProjectInfo = jsonFile.readFileSync(infoPath);

        return new Project(projInfo, projPath);
    }
}

export class Project
{
    /* Project Information */
    projectInfo:ProjectInfo;

    /* Paths */
    projectPath:string;
    sourcesPath:string;
    listsPath:string;
    listsPartialPath:string;
    packagesPath:string;
    tempPath:string;

    /* Files */
    projectFile:string;
    sourcesListFile:string;
    preferecesFile:string;
    statusFile:string;
    systemFile:string;

    constructor(projectInfo:ProjectInfo, projectPath:string)
    {
        this.projectInfo = projectInfo;

        /* Initialize Directory Paths */
        this.projectPath = projectPath;
        this.sourcesPath = path.join(this.projectPath,"sources");
        this.listsPath = path.join(this.projectPath,"lists");
        this.listsPartialPath = path.join(this.listsPath,"partial");
        this.packagesPath = path.join(this.projectPath,"packages");
        this.tempPath = path.join(this.projectPath,"temp");
        
        /* Initialize File Paths */
        this.projectFile = path.join(this.projectPath,"info.cube");
        this.sourcesListFile = path.join(this.sourcesPath,"sources.list");
        this.preferecesFile = path.join(this.sourcesPath,"preferences");
        this.statusFile = path.join(this.sourcesPath,"status");
    }
}