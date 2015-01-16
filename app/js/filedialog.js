if (typeof window === 'undefined') { // Node.js
	
	var util = require('../util');
	var filedialog = { SocketEvent:function(socket,name){
		function updateFileList(path)
		{
			var list=[];
			util.getFiles(path, list);
			//if (list.length != 0)
				socket.emit(name+':fbUpdateList', JSON.stringify(list));
		}

		socket.on(name+':fb:reqFileList', function(data) {
			console.log('PATH='+data);
			updateFileList(data);
		}); // fb:reqFileList
	}}
	module.exports = filedialog;

} else {

	var FileDialog = function(name,ignoreDotFile,dir_only){
		this.name = name;
		this.ignoreDotFile = ignoreDotFile;
		this.dir_only = dir_only;
		this.tarPath = "";
	}
	
	FileDialog.prototype.registerSocketEvent = function(socket){
		this.socket = socket;
		var eventname = this.name + ':fbUpdateList';
		console.log('FileDialog:'+eventname);
		socket.on(eventname, function(thisptr){ return function (data) {
			//console.log(data);
			thisptr.updateDirlist(data);
		}}(this));
	}

	FileDialog.prototype.FileList = function(path)
	{
		//this.dispPath(path);
		console.log("FB:"+path);
		this.tarPath = path;
		this.socket.emit(this.name+":fb:reqFileList",path);
	}

	//--------------
	FileDialog.prototype.updateDirlist = function(jsonlist)
	{
		function getUpDir(path) // fix me beautiful
		{
			if (path === "/")
				return "/";
			var p = path.split("/");
			if (p[p.length-1] == "")
				p.pop();
			var uppath = "/";
			for(var i=0; i<p.length-1; ++i)
			{
				if (p[i] == "")
					continue;
				uppath += p[i] + '/';
			}
			if (uppath=="//")
				uppath = "/";
			return uppath;
		}
		
		function makeUpNode(path)
		{
			var newbtn = document.createElement('div');
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");
			var fileicon = document.createElement('div');

			fileicon.setAttribute('class', 'back');
			newbtn.appendChild(fileicon);
			var filelabel = document.createElement('p');
			filelabel.setAttribute('class', "filelabel");
			filelabel.innerHTML = "..";
			newbtn.appendChild(filelabel);
			var upath = getUpDir(path);
			console.log("UPATH="+upath);
			newbtn.setAttribute('onclick','openfileDialog("'+upath+'")');
			return newbtn;
		}

		function makeNode(name,path,type)
		{
			var newbtn = document.createElement('div');
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");
			var fileicon = document.createElement('div');

			fileicon.setAttribute('class', type);
			newbtn.appendChild(fileicon);
			var filelabel = document.createElement('p');
			filelabel.setAttribute('class', "filelabel");
			filelabel.innerHTML = name;
			newbtn.appendChild(filelabel);
			newbtn.setAttribute('onclick','openfileDialog("'+path+'")');
			return newbtn;
		}
	
		console.log("updateDirList");
		var ls = document.getElementById("fbList");
		ls.innerHTML = ''; // clear

		// up dir
		var unode = makeUpNode(this.tarPath);
		ls.appendChild (unode);

		var list = JSON.parse(jsonlist);
		for(var i in list) {
			//console.log(list[i]);
			if (list[i].type != "file" && list[i].type != "dir"){
				console.log("Unknown file type -> "+list[i].type);
				continue;
			}
			if (list[i].name.charAt(0) == "." && this.ignoreDotFile)
				continue;
			if (list[i].type == "file" && this.dir_only) // ignore files
				continue;

			var newbtn = makeNode(list[i].name, list[i].path, list[i].type);

			ls.appendChild (newbtn);
		}
	}
}