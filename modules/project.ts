import * as fs from "fs";
import * as path from "path";
import * as jsonFile from "jsonfile";

export class ProjectInfo
{
    /* Metadata */
    name:string;
    version:string;
    hostName:string;
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
        let info:ProjectInfo = new ProjectInfo();

        info.name = name;
        info.version = "";
        info.hostName = "";
        info.operatingSystem = "";
        info.distribution = "";
        info.release = "";
        info.upstreamDistribution = "";
        info.upstreamCodename = "";
        info.upstreamRelease = "";
        info.architecture = "";
        info.dateCreated = "";

        let project:Project = new Project(info, path.join(destinationPath,name));

        this.createDirectories(project);
        this.saveProject(project);

        return this.openProject(path.join(destinationPath,name));
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