var fs = require('fs');

//-------------------------------------
// Utility functions
//-------------------------------------
function getFiles(dir, list){
	try {
		var files = fs.readdirSync(dir);
		if (!files)
			return;
		if (dir.substr(dir.length - 1) != "/")
			dir += "/";
		for(var i in files){
			if (!files.hasOwnProperty(i)) continue;
			var name = dir+files[i];
			if (fs.statSync(name).isDirectory()){
				//getFiles(name,list);
				console.log(name)
				list.push({"name":files[i],"type":"dir","path":name});
			} else if (files[i].substring(0,1) == '.') {
				// ignore
			}else{
				console.log(name)
				list.push({"name":files[i],"type":"file","path":name});
			}
		}
	} catch(e){
		list = [];
		console.log("not found dir:"+dir);
	}
}

function getExtention(fileName) {
	var ret;
	if (!fileName)
		return ret;
	var fileTypes = fileName.split(".");
	var len = fileTypes.length;
	if (len === 0)
		return ret;
	ret = fileTypes[len - 1];
	return ret.toString().toLowerCase();
}


module.exports.getExtention = getExtention;
module.exports.getFiles = getFiles;