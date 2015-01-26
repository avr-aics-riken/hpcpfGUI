/*jslint devel:true*/
/*global require, module*/

if (typeof window === 'undefined') { // Node.js
	var fs = require('fs'),
		path = require('path'),
		Filedialog = {
			SocketEvent: function (socket, name) {
				'use strict';
				var workpath = "";
				
				function getFiles(dir, list) {
					var files = fs.readdirSync(dir),
						name,
						relativePath,
						i,
						dom,
						childlist;
					if (!files) {
						return;
					}
					if (dir.substr(dir.length - 1) !== "/") {
						dir += "/";
					}
					for (i in files) {
						if (files.hasOwnProperty(i)) {
							name = dir + files[i];
							relativePath = path.relative(workpath, name).split(path.sep).join('/');
							try {
								if (fs.statSync(name).isDirectory()) {
									//getFiles(name,list);
									//console.log(name);
									dom = {"name": files[i], "type": "dir", "path": relativePath, "extract": false, "child": null};
									list.push(dom);

									// recursive dir
									childlist = [];
									try {
										getFiles(name, childlist);
										dom.child = childlist;
									} catch (e) {
										console.log("Failed subdir getfile", e);
									}
								} else if (files[i].substring(0, 1) !== '.') {
									//console.log(name);
									list.push({"name": files[i], "type": "file", "path": relativePath});
								}
							} catch (err) {
								console.log("not found dir:" + dir, err);
							}
						}
					}
				}
				function updateFileList(relativePath) {
					var list = [],
						absolutePath;
					if (workpath.length == 0) {
						console.log("project path error");
						return;
					}
					try {
						absolutePath = path.join(workpath, relativePath);
						console.log("updateFileList:" + absolutePath);
						getFiles(absolutePath, list);
						socket.emit(name + ':FileDialogUpdateList', JSON.stringify(list));
					} catch (e) {
						console.log("Failed getfile");
					}
				}

				socket.on(name + ':FileDialogReqFileList', function (data) {
					console.log('PATH=' + data);
					updateFileList(data);
				});
				socket.on('setWorkingPath', function(data){
					workpath = data.path;
				});
			}
		};
	module.exports = Filedialog;

} else {
	var FileDialog = (function () {
		'use strict';

		var FileDialog = function (name, domElement, ignoreDotFile, dirOnly) {
			this.name = name;
			this.ignoreDotFile = ignoreDotFile;
			this.dirOnly = dirOnly;
			this.tarDir = "/";
			this.domElement = domElement; //document.getElementById("filelist"); // TODO:
			this.filelist = [];
			this.fileClickCallback = (function() {})();
			this.dirClickCallback = (function() {})();
		};

		FileDialog.prototype.registerSocketEvent = function (socket) {
			this.socket = socket;
			var eventname = this.name + ':FileDialogUpdateList';
			console.log('FileDialog:' + eventname);
			function eventFunc(thisptr) {
				return function (data) {
					//console.log(data);
					thisptr.updateDirlist(data);
				};
			}
			socket.on(eventname, eventFunc(this));
			
			function extractFunc(thisptr) {
				return function (data) {
					console.log(data);
					thisptr.extractDir(data);
				};
			}
			socket.on(this.name + ':FileDialogReqExtractDir', extractFunc(this));
		};
		
		FileDialog.prototype.setFileClickCallback = function (callback) {
			this.fileClickCallback = callback;
		};

		FileDialog.prototype.setDirClickCallback = function (callback) {
			this.dirClickCallback = callback;
		};
		
		FileDialog.prototype.FileList = function (relativePath) {
			this.tarDir = path;
			console.log("Filelist:" + relativePath);
			this.socket.emit(this.name + ":FileDialogReqFileList", relativePath);
		};

		function getUpDir(path) { // fix me beautiful
			if (path === "/") {
				return "/";
			}
			var p = path.split("/"),
				uppath = "/",
				i;
			if (p[p.length - 1] === "") {
				p.pop();
			}

			for (i = 0; i < p.length - 1; i += 1) {
				if (p[i] !== "") {
					uppath += p[i] + '/';
				}
			}
			if (uppath === "//") {
				uppath = "/";
			}

			return uppath;
		}
	
		//--------------
		FileDialog.prototype.makeFilelist = function (ls, list, level, parentDir) {
			var skip, i, newbtn;
			for (i in list) {
				if (list.hasOwnProperty(i)) {
					skip = false;
					if (list[i].type !== "file" && list[i].type !== "dir") {
						console.log("Unknown file type -> " + list[i].type);
						skip = true;
					}
					if (list[i].name.charAt(0) === "." && this.ignoreDotFile) {
						skip = true;
					}
					if (list[i].type === "file" && this.dirOnly) { // ignore files
						skip = true;
					}

					if (!skip) {
						this.makeNode(ls, list[i], level,  parentDir);
					}
				}
			}
		};
		
		FileDialog.prototype.makeNode = function (ls, listitem, level, parentDir) {
			var name    = listitem.name,
				relativePath    = listitem.path,
				type    = listitem.type,
				extract = listitem.extract,
				newbtn    = document.createElement('div'),
				fileicon  = document.createElement('div'),
				filelabel = document.createElement('p'),
				i,
				sizer;
			
			for (i = 0; i < level; i = i + 1) {
				sizer = document.createElement('div');
				sizer.setAttribute('class', "nodesizer");
				sizer.setAttribute('draggable', "false");
				newbtn.appendChild(sizer);
			}
			
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");
			fileicon.setAttribute('class', type);
			newbtn.appendChild(fileicon);

			filelabel.setAttribute('class', "filelabel");
			filelabel.innerHTML = name;
			newbtn.appendChild(filelabel);
			if (type === "dir") {
				//newbtn.setAttribute('onclick', 'clickDir("' + path + '")');
				newbtn.addEventListener('click', (function (relativePath, listitem, fileDialog) { return function () {
					listitem.extract = !listitem.extract;
					console.log('Extract Dir:' + relativePath);
					if (fileDialog.dirClickCallback) {
						fileDialog.dirClickCallback(fileDialog, parentDir, relativePath);
					}
					fileDialog.refleshFileList();
				}; }(relativePath, listitem, this)));
				ls.appendChild(newbtn);
				
				if (extract) {
					this.makeFilelist(ls, listitem.child, level + 1, relativePath);
				}
			} else if (type === "file") {
				newbtn.addEventListener('click', (function (fileDialog) { return function() {
						if (fileDialog.fileClickCallback) {
							fileDialog.fileClickCallback(fileDialog, parentDir, relativePath);
						}
					}
				})(this));
				ls.appendChild(newbtn);
			}
		};
		
		FileDialog.prototype.refleshFileList = function () {
			this.domElement.innerHTML = ''; // clear
			this.makeFilelist(this.domElement, this.filelist, 0, '');
		};

		FileDialog.prototype.updateDirlist = function (jsonlist) {
			this.filelist   = JSON.parse(jsonlist);
			this.refleshFileList();
		};
		
		return FileDialog;
	}());
}
