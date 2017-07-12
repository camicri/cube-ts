import * as path from "path";
import {Cube} from "./modules/cube"

export class Startup
{
    public static main():number
    {
        let cube:Cube = new Cube();

        cube.openProject(path.join(__dirname,"projects","camicri"))
        .then(cube.scanRepositories.bind(cube))
        .then(()=>{
            cube.packageQuery.getSectionPackages("games").forEach((p)=>{
                console.log(p.name)
            });
        });

        return 0;
    }
}

Startup.main();