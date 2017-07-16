export class Globals {
    static application_name:string = "Camicri Cube";
    static application_version:string = "3.0.1";
    static authors = [
        "Jake Capangpangan <camicrisystems@gmail.com"
    ]

    static upstream_lsb_release_path:string = "/etc/upstream-release/lsb-release";
    static AptInformation = {
        sourceFilePath : "/etc/apt/sources.list",
        sourcesDirectoryPath : "/etc/apt/sources.list.d",
        listsDirectoryPath : "/var/lib/apt/lists",
        statusFilePath : "/var/lib/dpkg/status",
        preferencesFilePath : "/etc/apt/preferences",
        preferencesDirectoryPath : "/etc/apt/preferences.d/",
    }
}