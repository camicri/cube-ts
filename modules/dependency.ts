import {Package} from "./repositories"
import {Version} from "./version"

export class DependencyItem
{
    name:string;
    operator:string;
    versionRequired:string;

	toString()
	{
		return this.name + ((this.versionRequired)?(" ("+this.operator+" "+this.versionRequired+")"):"");
	}
}

export class DependencyManager
{
    availablePackages:{[key:string]:Package} = {};
    installedPackages:{[key:string]:Package} = {};
    providedPackages:{[key:string]:Array<string>} = {};

	constructor(availablePackages:{[key:string]:Package}, installedPackages:{[key:string]:Package}, providedPackages:{[key:string]:Array<string>})
	{
		this.availablePackages = availablePackages;
		this.installedPackages = installedPackages;
		this.providedPackages = providedPackages;
	}

	getDependencies(pkg:Package,dependencies:{[key:string]:Package})
	{
		let pkgInfo:{[key:string]:string} = pkg.getInfo(["Depends","Pre-Depends","Recommends"])

        let pkgDepends:string = pkgInfo["Depends"];
        let pkgPredepends:string = pkgInfo["Pre-Depends"];
        let pkgRecommends:string = pkgInfo["Recommends"];
        
		let depString:string = (pkgDepends)?pkgDepends:"";

		if (pkgPredepends && pkgPredepends !== "")
			depString += (depString!==""?",":"") + pkgPredepends;

		if (pkgRecommends && pkgRecommends !== "")
			depString += (depString!==""?",":"") + pkgRecommends;

		if (depString.trim().length === 0)
		{
			if (!dependencies[pkg.name])
				dependencies[pkg.name] = pkg;
		}

		let depItemGroup = DependencyManager.getDependencyItemGroup(depString);

		for (var depItemOrList of depItemGroup.or)
		{
			let currDepItem:DependencyItem = undefined;
			let skippedByProvides:Boolean = false;

			for (var depItem of depItemOrList)
			{
				//For available packages
				if (this.availablePackages[depItem.name])
				{
					let pkg:Package = this.availablePackages[depItem.name];					

					//Prioritize installed/upgradable items
					if (pkg.status === undefined /*Available*/ || dependencies[pkg.name])
					{
						currDepItem = depItem;
						break;
					}
					//If still not satisfied by above requirements, pick the first package
					if (!currDepItem)
						currDepItem = depItem;
				}				
				//For not available packages (Maybe virtual package)
				//Check if it is virtually provided by other packages
				else if (!currDepItem)
				{
					let pkgProvider:Package = this.getProvider(depItem);
					if (pkgProvider)
					{	
						let newDepItem:DependencyItem = new DependencyItem();
						newDepItem.name = pkgProvider.name;					
						currDepItem = newDepItem;
						break;
					}
				}
			}

			if (currDepItem)
				depItemGroup.and.push(currDepItem);
			else
				console.log("[ERROR] OR Dependency not satisfied for %s",pkg.name);
		}

		for (var depItemAnd of depItemGroup.and)
		{
			//For not available packages (Maybe virtual package)			
			if (!this.availablePackages[depItemAnd.name])
			{
				let pkgProvider:Package = this.getProvider(depItemAnd);
				if (pkgProvider)
				{	
					depItemAnd = new DependencyItem();
					depItemAnd.name = pkgProvider.name;					
				}
				else
				{					
					console.log("[ERROR] AND Dependency not satisfied for %s. Package not found!",depItem.name);
				}
			}
			
			this.getDependencyOne(depItemAnd, dependencies);
		}

		return true;
	}

	getDependencyOne(depItem, dependencies)
	{
		if (this.availablePackages[depItem.name])
		{
			var pkg = this.availablePackages[depItem.name];

			/* Installed */
			if (pkg.status === 1 && Version.compareByEqualityString(pkg.installedVersion,depItem.versionRequired,depItem.operator))
				return true;			
			else if (Version.compareByEqualityString(pkg.version,depItem.versionRequired,depItem.operator))
			{								
				//Dependency Satisfied. Will add to dependency list because it is not installed
				if(!dependencies[pkg.name])
				{
					dependencies[pkg.name] = pkg;
					this.getDependencies(pkg,dependencies);
				}

				return true;
			}				
			else
			{
				console.log("[ERROR] Available package not satisfied %s %s %s %s", pkg.name, pkg.version,depItem.operator,depItem.versionRequired);
				return false;
			}
		}
	}

	getProvider(depItem:DependencyItem):Package
	{
		
		if (!this.providedPackages[depItem.name])
			return undefined;

		let pkg:Package = undefined;
		for (var name of this.providedPackages[depItem.name])
		{
			if (!this.availablePackages[name])
				continue;
			
			let currPkg:Package = this.availablePackages[name];

			//Prioritize installed/upgradable/downloaded packages
			if (currPkg.status === undefined /*Available*/)
			{
				pkg = currPkg;
				break;
			}
			//Get the first entry only (Experimental)
			else if (!pkg)
				pkg = currPkg;
		}

		return pkg;
	}

	static getDependencyItemGroup(depString:string):{or:Array<Array<DependencyItem>>,and:Array<DependencyItem>}
	{
	    let depArray:{or:Array<Array<DependencyItem>>,and:Array<DependencyItem>} = {or:[],and:[]};
		let depOrArray:Array<DependencyItem> = [];
		let depOrSplitArray:Array<string>;
		let depOrString:string = "";
		let depAndString:string = "";	
		let depItem:DependencyItem = new DependencyItem();	

		let depStringSplitArray:Array<string> = depString.trim().split(",");	

		for (let incDep:number = 0; incDep < depStringSplitArray.length; incDep++)
		{
			//Or relation dependency here
			if (depStringSplitArray[incDep].includes("|"))
			{
				depOrArray = [];
				depOrSplitArray = depStringSplitArray[incDep].split("|");
				for (let incDepOr:number = 0; incDepOr < depOrSplitArray.length; incDepOr++)
				{
					depOrString = depOrSplitArray[incDepOr].trim();
					depItem = this.convertToDependencyItem(depOrString);
					if(depItem)
						depOrArray.push(depItem);
				}
				depArray.or.push(depOrArray);
			}
			else //And relation dependency here
			{					
				depAndString = depStringSplitArray[incDep].trim();
				if(depAndString.length > 0)
				{
					depItem = this.convertToDependencyItem(depAndString);
					if (depItem)
						depArray.and.push(depItem);
				}		
			}
		}
		
		return depArray;
	}

	static convertToDependencyItem(depString):DependencyItem
	{
		let depItem:DependencyItem = new DependencyItem();
		let depItemSplit:Array<string> = [];
		
		if(depString.includes("("))
		{
			depString = depString.replace("(","").replace(")","").trim();
			depItemSplit = depString.split(" ",3);	

			if(depItemSplit.length === 3)		
			{
				depItem.name = depItemSplit[0].trim();
				depItem.operator = depItemSplit[1].trim();
				depItem.versionRequired = depItemSplit[2].trim();
			}
			else
				depItem = undefined;
		}
		else
			depItem.name = depString;

		return depItem;
	}
}