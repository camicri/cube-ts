import * as path from "path";

export class BaseManager
{
    listDirectoryPath:string = path.join(__dirname,"lists");
    sourcesDirectoryPath:string = path.join(__dirname,"sources"); 
}