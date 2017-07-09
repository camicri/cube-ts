import * as path from "path";

export class Project
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

    constructor(name:string, projectPath:string)
    {
        this.name = name;

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