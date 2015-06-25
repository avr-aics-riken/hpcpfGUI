/*jslint devel:true, node:true, nomen:true */
/*global require, global, $, io, socket */

if (typeof window === 'undefined') { // Node.js
	"use strict";
	
	var util = require('../util');
	var filedialog = {
		SocketEvent : function (socket, name) {
			function updateFileList(path) {
				var list = [];
				util.getFiles(path, list);
				//if (list.length != 0)
				socket.emit(name + ':fbUpdateList', JSON.stringify(list));
			}

			socket.on(name + ':fb:reqFileList', function (data) {
				console.log('PATH=' + data);
				updateFileList(data);
			}); // fb:reqFileList
		}
	};
	module.exports = filedialog;

} else {
	"use strict";

	var FileDialog = function (name, ignoreDotFile, dir_only) {
		this.name = name;
		this.ignoreDotFile = ignoreDotFile;
		this.dir_only = dir_only;
		this.tarPath = "";
	};
	
	FileDialog.prototype.registerSocketEvent = function (socket) {
		this.socket = socket;
		var eventname = this.name + ':fbUpdateList';
		console.log('FileDialog:' + eventname);
		socket.on(eventname, (function (thisptr) {
			return function (data) {
				//console.log(data);
				thisptr.updateDirlist(data, thisptr.dir_only);
			};
		}(this)));
	};

	FileDialog.prototype.FileList = function (path) {
		console.log("dirOnly:" + this.dir_only);
		//this.dispPath(path);
		console.log("FB:" + path);
		this.tarPath = path;
		this.socket.emit(this.name + ":fb:reqFileList", path);
	};

	//--------------
	FileDialog.prototype.updateDirlist = function (jsonlist, dir_only) {
		function getUpDir(path) { // fix me beautiful
			var p,
				uppath,
				i;
			if (path === "/") {
				return "/";
			}
			p = path.split("/");
			if (p[p.length - 1] === "") {
				p.pop();
			}
			uppath = "/";
			for (i = 0; i < p.length - 1; i = i + 1) {
				if (p[i] !== "") {
					uppath += p[i] + '/';
				}
			}
			if (uppath === "//") {
				uppath = "/";
			}
			return uppath;
		}
		
		function makeUpNode(path) {
			var newbtn = document.createElement('div'),
				fileicon = document.createElement('div'),
				filelabel,
				upath;
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");

			fileicon.setAttribute('class', 'back');
			newbtn.appendChild(fileicon);
			filelabel = document.createElement('p');
			filelabel.setAttribute('class', "filelabel");
			filelabel.innerHTML = "..";
			newbtn.appendChild(filelabel);
			upath = getUpDir(path);
			console.log("UPATH=" + upath);
			if (dir_only) {
				newbtn.setAttribute('onclick', 'openFolderDialog("' + upath + '")');
			} else {
				newbtn.setAttribute('onclick', 'openFileDialog("' + upath + '")');
			}
			return newbtn;
		}

		function makeNode(name, path, type) {
			var newbtn = document.createElement('div'),
				fileicon = document.createElement('div'),
				filelabel;
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");

			fileicon.setAttribute('class', type);
			newbtn.appendChild(fileicon);
			filelabel = document.createElement('p');
			filelabel.setAttribute('class', "filelabel");
			filelabel.innerHTML = name;
			newbtn.appendChild(filelabel);
			if (dir_only) {
				newbtn.setAttribute('onclick', 'openFolderDialog("' + path + '")');
			} else {
				newbtn.setAttribute('onclick', 'openFileDialog("' + path + '","' + type + '");this.className+=" activefileitem"');
			}
			return newbtn;
		}
	
		console.log("updateDirList");
		var ls = document.getElementById("fbList"),
			unode,
			list,
			i,
			newbtn;
		ls.innerHTML = ''; // clear

		// up dir
		unode = makeUpNode(this.tarPath);
		ls.appendChild(unode);

		list = JSON.parse(jsonlist);
		for (i in list) {
			if (list.hasOwnProperty(i)) {
				//console.log(list[i]);
				if (list[i].type !== "file" && list[i].type !== "dir") {
					console.log("Unknown file type -> " + list[i].type);
					continue;
				}
				if (list[i].name.charAt(0) === "." && this.ignoreDotFile) {
					continue;
				}
				if (list[i].type === "file" && dir_only) { // ignore files
					continue;
				}

				newbtn = makeNode(list[i].name, list[i].path, list[i].type);

				ls.appendChild(newbtn);
			}
		}
	};
}