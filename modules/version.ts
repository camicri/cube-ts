export class Version
{
    static compare(ver1:string, ver2:string)
    {
        if (ver1 === undefined || ver2 === undefined)
            return 0;

        ver1 = ver1.trim();
        ver2 = ver2.trim();        

        let verData1:VersionData = new VersionData(ver1);
        let verData2:VersionData = new VersionData(ver2);

        if (verData1.epoch > verData2.epoch)
            return 1;
        else if (verData1.epoch < verData2.epoch)
            return -1;

        let verResult:number = this.compareVersionStrings(verData1.version,verData2.version);

        if (verResult !== 0)
            return verResult;
        else
            return this.compareVersionStrings(verData1.revision, verData2.revision);
    }

    static compareVersionStrings(s1:string, s2:string)
    {
        if (s1 === undefined && s2 === undefined)
            return 0;
        else if (s1 !== undefined && s2 === undefined)
            return 1;
        else if (s1 === undefined && s2 !== undefined)
            return -1;

        //Make them in same size (Padded with spaces)
        if (s1.length < s2.length)
            s1 += " ".repeat(s1.length+s2.length);
        else if(s2.length < s1.length)
            s2 += " ".repeat(s1.length+s2.length);

        let verType1:Array<VersionTokenType> = [];
        let verType2:Array<VersionTokenType> = [];

        let str1:string = "";
        let str2:string = "";

        for (var ctr = 0; ctr < s1.length; ctr++)
        {
            verType1.push(new VersionTokenType(s1.charAt(ctr)));
            verType2.push(new VersionTokenType(s2.charAt(ctr)));
        }
        
        let i:number = 0;

        while ( i < verType1.length )
        {
            str1 = "";
            str2 = "";

            if (verType1[i].tokenType !== verType2[i].tokenType)
            {
                if (verType1[i].tokenOrder > verType2[i].tokenOrder)
                    return 1;
                else
                    return -1;
            }

            let j:number = i;
			var currType = verType1[i].tokenType;
			while ( j < verType1.length && verType1[j].tokenType === currType )
				j += 1;

            for (let ctr:number = i; ctr < j; ctr++ )
				str1 += verType1[ctr].token;

            j = i;

            while ( j < verType2.length && verType2[j].tokenType === currType )
				j += 1;

			for (let ctr:number = i; ctr < j; ctr++ )
				str2 += verType2[ctr].token;

			i = j;

            if( currType === 2/*digit*/ && str1.length !== str2.length )
			{
				let int1:number = parseInt(str1);
				let int2:number = parseInt(str2);

				if ( int1 > int2 )
					return 1;
				else
					return -1;
			}

			let result:number = str1.localeCompare(str2);

			if ( result !== 0 )
				return result;
        }

        return str1.localeCompare(str2);            
    }

    static compareByEqualityString(ver1:string, ver2:string, eq:string)
    {
        let compResult:number = this.compare(ver1,ver2);
        let result:Boolean = false;

        if (!eq)
            return true;

        eq = eq.trim();

        switch(eq)
        {
            case ""   : result = true; break;
            case "="  : result = (compResult === 0); break;
            case ">>" : result = (compResult > 0); break;
            case "<<" : result = (compResult < 0); break;
            case ">=" : result = (compResult >= 0); break;
            case "<=" : result = (compResult <= 0); break;
            default : break;
        }

        return result;
    }
}

class VersionData
{
    epoch:number = 0;
    version:string = undefined;
    revision:string = undefined;

    constructor(version:string)
    {
        let epochArray:Array<string> = [];

        if (version.includes(":"))
            epochArray = version.split(":",2);
        else
            epochArray = [version];

        if (epochArray.length > 1)
        {
            this.epoch = parseInt(epochArray[0]);
            if (this.epoch < 0 || this.epoch > 10)
                return ; //Invalid epoch
        }
        else
        {
            this.epoch = 0;
            epochArray[0] = "0";
            version = "0:" + version;            
        }

        let versionArray:Array<string> = [];

        if (version.includes("-"))
            versionArray = version.split(":")[1].split("-",2);
        else
            versionArray = [version.split(":")[1]];

        if (versionArray.length > 1)
        {
            this.revision = versionArray[versionArray.length-1];
            this.version = versionArray[0];
        }
        else
            this.version = versionArray[0];
    }
}

class VersionTokenType
{
    token:string;
    tokenType:number;
    tokenOrder:number;

    constructor(token)
    {
        this.token = token;
        this.tokenType = 4; //delimit
        this.tokenOrder = 0;

        //Get token type
        /* TODO : Change these to enums instead */
        if (this.token.search(/^[a-zA-Z]+$/) === 0)
            this.tokenType = 1;//"alpha";
        else if (this.token.search(/^[0-9]+$/) === 0)
            this.tokenType = 2;//"digit";
        else if (this.token === "~")
            this.tokenType = 3;//"tilde";

        //Get token order
        if (this.token === undefined)
            this.tokenOrder = 0
        else if (this.token.search(/^[0-9]+$/) === 0)
            this.tokenOrder = 0;
        else if ((this.token.search(/^[a-zA-Z]+$/) === 0) || this.token === " ")
            this.tokenOrder = this.token.charCodeAt(0);
        else if (this.token === "~")
            this.tokenOrder = -1;
        else
            this.tokenOrder = this.token.charCodeAt(0) + 256;
    }

    /*
    get tokenType() 
    {        
        if (this.token.search(/^[a-zA-Z]+$/) == 0)
            return 1;//"alpha";
        else if (this.token.search(/^[0-9]+$/) == 0)
            return 2;//"digit";
        else if (this.token == "~")
            return 3;//"tilde";
        else
            return 4;//"delimit";
    }

    get tokenOrder()
    {
        if (this.token === undefined)
            return 0
        else if (this.token.search(/^[0-9]+$/) == 0)
            return 0;
        else if ((this.token.search(/^[a-zA-Z]+$/) == 0) || this.token == " ")
            return this.token.charCodeAt(0);
        else if (this.token == "~")
            return -1;
        else
            return this.token.charCodeAt(0) + 256;
    }
    */
}