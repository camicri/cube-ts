import {BaseManager} from "./modules/base";
import {SourceManager} from "./modules/sources";
import {Source} from "./modules/sources";
import {Package} from "./modules/repositories";
import {Project} from "./modules/project";
import {RepositoryManager} from "./modules/repositories";
import * as readLine from "linebyline";
import * as fs from "fs";
import * as path from "path";

export class Startup
{
    public static main():number
    {
        let project:Project = new Project("camicri", path.join(__dirname,"projects","camicri"));
        let sourceMgr:SourceManager = new SourceManager(project);
        let repositoryMgr:RepositoryManager = new RepositoryManager(project);

        sourceMgr.scanRepositories();

        let statusSource:Source = new Source("status");
        statusSource.sourceFilePath = "installed";
        statusSource.listFilePath = path.join(project.listsPath,"status");
        statusSource.filename = "status";
        sourceMgr.sources.push(statusSource);

        repositoryMgr.scanRepositories(sourceMgr.sources).then(()=>{
            console.log("Installed Packages: %d",Object.keys(repositoryMgr.installedPackages).length);
            console.log("Available Packages: %d",Object.keys(repositoryMgr.availablePackages).length);
            console.log("Provided Packages: %d",Object.keys(repositoryMgr.providedPackages).length);

            console.log("Marking packages...");
            repositoryMgr.markPackages();
            console.log("Upgradable Packages: %d",repositoryMgr.upgradablePackages.length);            
        });

        return 0;
    }
}

Startup.main()