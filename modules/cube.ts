'use strict';

import {BaseManager} from "./base";
import {SourceManager, Source} from "./sources";
import {RepositoryManager, Package} from "./repositories";
import {ProjectManager, Project} from "./project";
import {DependencyManager} from "./dependency";
import {PackageQuery} from "./package_query"
import {EventEmitter} from "events"

export class Cube extends EventEmitter
{
    baseMgr:BaseManager;
    repositoryMgr:RepositoryManager;
    sourceMgr:SourceManager;
    depedencyMgr:DependencyManager;
    packageQuery:PackageQuery;
    projectMgr:ProjectManager;
    currentProject:Project;

    constructor()
    {
        super();
        this.baseMgr = new BaseManager();
        this.projectMgr = new ProjectManager();
    }

    openProject(path:string)
    {
        return new Promise((resolve, reject)=>{
            this.currentProject = this.projectMgr.openProject(path);
            if(!this.currentProject)
                reject();
            else
            {
                this.sourceMgr = new SourceManager(this.currentProject);
                this.repositoryMgr = new RepositoryManager(this.currentProject);
                resolve();
            }
        });
    }

    scanRepositories()
    {
        return new Promise((resolve, reject)=>{
            //TODO: Promisify this
            this.sourceMgr.scanSources();
            this.repositoryMgr.scanRepositories(this.sourceMgr.sources).then(function(){
                this.depedencyMgr = new DependencyManager(this.repositoryMgr.availablePackages, this.repositoryMgr.installedPackages, this.repositoryMgr.providedPackages);
                this.packageQuery = new PackageQuery(this.repositoryMgr.availablePackages, this.repositoryMgr.installedPackages, this.repositoryMgr.sectionPackages);
                resolve();
            }.bind(this)).catch(reject);
        });
    }

    
}