/*jslint devel:true, node:true, nomen:true */
/*global require, global, $, io, socket */

(function () {
	"use strict";
	var exec = require('child_process').exec,
		spawn = require('child_process').spawn,
		fs = require('fs'),
		http = require('http'),
		os = require('os'),
		util = require('./util'),
		path = require('path'),
		// MacOSX setting
		KRENDER_CMD = __dirname + '/krender_mac',
		LUA_CMD     = __dirname + '/lua_mac',
		TAR_CMD     = 'tar',
		SH_CMD = 'sh',
		PMD_FILENAME = 'pmd.json',
		CMD_FILENAME = 'cmd.json',
		CEI_FILENAME = 'cei.json',
		PWF_FILENAME = 'pwf.lua',
		NODEJSON_FILENAME = 'nodedata.json',
		NODEJSON_ORG_FILENAME = 'nodedata.default',
		targetConfFile = path.resolve(__dirname, '../conf/targetconf.json'),
		sessionTable = {}, // prjectDir to sessionObj
		idTable = {}, // socket.id to prjectDir
		socketTable = {}; // socket.id to socket

	if (os.platform() === 'linux') { // Linux setting
		KRENDER_CMD = __dirname + '/krender_linux';
		LUA_CMD = 'lua'; // Use system command
		TAR_CMD = 'tar';
	} else if (os.platform().indexOf('win') === 0) { // win setting
		KRENDER_CMD = __dirname + '/krender.exe';
		LUA_CMD = __dirname + '/lua.exe';
		TAR_CMD = __dirname + '/tar.exe';
	}

	function searchSession(dir) {
		if (sessionTable.hasOwnProperty(dir)) {
			return sessionTable[dir];
		}
		return null;
	}
	
	function searchSocketID(dir) {
		var id,
			idList = [];
		for (id in idTable) {
			if (idTable.hasOwnProperty(id)) {
				if (idTable[id] === dir) {
					idList.push(id);
				}
			}
		}
		return idList;
	}
	
	function getSession(socketid) {
		if (idTable.hasOwnProperty(socketid)) {
			if (sessionTable.hasOwnProperty(idTable[socketid])) {
				return sessionTable[idTable[socketid]];
			}
		}
		return null;
	}

	// find launchApp name from extension
	function findLaunchApp(appExtensions, ext) {
		var name,
			appNames = [];
		for (name in appExtensions) {
			if (appExtensions.hasOwnProperty(name)) {
				if (appExtensions[name].indexOf(ext) >= 0) {
					appNames.push(name);
				}
			}
		}
		if (appNames.length > 0) {
			return appNames;
		}
		return null;
	}

	// get editable type or empty string
	function getEditTypeByExtension(ext) {
		if (ext === "lua" || ext === "scn" || ext === "pwl" || ext === "cwl") {
			return "lua";
		} else if (ext === "sh" || ext === "pwf" || ext === "cwf") {
			return "sh";
		} else if (ext === "json" || ext === "pif" || ext === "cif") {
			return "json";
		} else if (ext === "frag") {
			return "glsl";
		} else if (ext === "jpg" || ext === "tga" || ext === "png") {
			return "image";
		}
		return "";
	}

	function getDateStr() {
		var y, m, d, H, M, S,
			date = new Date();
		y = date.getUTCFullYear();
		m = date.getUTCMonth() + 1;
		d = date.getUTCDate();
		H = date.getUTCHours();
		M = date.getUTCMinutes();
		S = date.getUTCSeconds();
		if (m < 10) { m = "0" + m; }
		if (d < 10) { d = "0" + d; }
		if (H < 10) { H = "0" + H; }
		if (M < 10) { M = "0" + M; }
		if (S < 10) { S = "0" + S; }
		return String(y) + String(m) + String(d) + String(H) + String(M) + String(S);
	}
	
	function backupFile(srcdir, filepath) {
		var list = [],
			i,
			fullpath,
			file,
			extName,
			searchName;
		console.log("srcdir path:" + srcdir);
		console.log("backup file:" + filepath);
		
		if (!fs.existsSync(srcdir)) {
			console.log("not existed dir:" + srcdir);
		}
		
		// TODO
	}

	function killSpawn(sp, endcallback) {
		var pid;
		if (!sp) {
			return;
		}
		if (os.platform() === 'darwin' || os.platform() === 'linux') {
			pid = sp.pid;
			console.log('processID=' + pid);
			console.log('bash killthem.sh ' + pid);
			exec('bash killthem.sh ' + pid, function (error, stdout, stderr) {
				console.log('killed childs');
				console.log(error, stdout, stderr);
				if (endcallback) {
					if (error) {
						endcallback(false);
					} else {
						endcallback(true);
					}
				}
			});
		} else {
			pid = sp.pid;
			console.log('processID=' + pid);
			exec('TASKKILL /T /F /PID ' + pid, function (error, stdout, stderr) {
				console.log('killed childs');
				console.log(error, stdout, stderr);
				if (endcallback) {
					if (error) {
						endcallback(false);
					} else {
						endcallback(true);
					}
				}
			});
		}
	}
	
	/**
	 * convert cmd.json(user values) to node(system values)
	 */
	function makeNodeFromCMD(cmd, dirname, targetConfData, cei) {
		var elem,
			node = {},
			inputElem,
			outputElem,
			targetElem,
			nodeInput,
			nodeOutput,
			i;
		if (cmd.hasOwnProperty('hpcpf')) {
			if (cmd.hpcpf.hasOwnProperty('case_meta_data')) {
				elem = cmd.hpcpf.case_meta_data;
				if (elem.hasOwnProperty('name_hr')) {
					node.name_hr = elem.name_hr;
				}
				node.input = [];
				if (elem.hasOwnProperty('inputs')) {
					for (i = 0; i < elem.inputs.length; i = i + 1) {
						inputElem = elem.inputs[i];
						nodeInput = JSON.parse(JSON.stringify(inputElem));
						
						if (!inputElem.hasOwnProperty('name') && inputElem.hasOwnProperty('name_hr')) {
							nodeInput.name = inputElem.name_hr;
						}
						/*
						if (inputElem.hasOwnProperty('type') && inputElem.type === 'target_machine') {
							if (targetConfData) {
								nodeInput.target_machine_list = targetConfData;
							}
						}
						*/
						targetElem = nodeInput;
						node.input.push(nodeInput);
					}
				}
				node.output = [];
				if (elem.hasOwnProperty('outputs')) {
					for (i = 0; i < elem.outputs.length; i = i + 1) {
						outputElem = elem.outputs[i];
						nodeOutput = JSON.parse(JSON.stringify(outputElem));
						
						if (!outputElem.hasOwnProperty('name') && outputElem.hasOwnProperty('name_hr')) {
							nodeOutput.name = outputElem.name_hr;
						}
						node.output.push(nodeOutput);
					}
				}
				node.customfuncfile = "case.lua";
				node.pos = [100, 100];
				node.funcname = "Case";
				node.name = dirname;
				node.varname = dirname;
				node.status = "Ready";
			}
			
			if (cei && cei.hasOwnProperty('hpcpf')) {
				if (cei.hpcpf.hasOwnProperty('case_exec_info')) {
					elem = cei.hpcpf.case_exec_info;
					if (elem.hasOwnProperty('status')) {
						node.status = elem.status;
					}
					/*
					if (elem.hasOwnProperty('target')) {
						if (targetElem && targetConfData) {
							for (i = 0; i < targetConfData.hpcpf.targets.length; i = i + 1) {
								if (targetConfData.hpcpf.targets[i].type === elem.target) {
									targetElem.value = targetConfData.hpcpf.targets[i];
									//console.log(node);
									break;
								}
							}
						}
					}
					*/
				}
			}
			
			return node;
		}
		return null;
	}
	
	function makeCaseNodeList(srcdir, targetConfData, callback) {
		var files = [],
			caseFiles = [],
			cmdData,
			ceiData,
			node,
			nodeList = [],
			i,
			k;
		util.getFiles(srcdir, files);
		for (i = 0; i < files.length; i = i + 1) {
			if (files[i].type === "dir") {
				caseFiles = [];
				util.getFiles(files[i].path, caseFiles);
				
				ceiData = null;
				for (k = 0; k < caseFiles.length; k = k + 1) {
					if (caseFiles[k].type === "file" && caseFiles[k].name === CEI_FILENAME) {
						ceiData = fs.readFileSync(caseFiles[k].path, 'utf8');
					}
				}
				
				for (k = 0; k < caseFiles.length; k = k + 1) {
					if (caseFiles[k].type === "file" && caseFiles[k].name === CMD_FILENAME) {
						// found case dir
						cmdData = fs.readFileSync(caseFiles[k].path, 'utf8');
						if (ceiData) {
							node = makeNodeFromCMD(JSON.parse(cmdData), files[i].name, targetConfData, JSON.parse(ceiData));
						} else {
							node = makeNodeFromCMD(JSON.parse(cmdData), files[i].name, targetConfData, null);
						}
						if (node) {
							nodeList.push(node);
						}
					}
				}
			}
		}
		if (callback) {
			//console.log("nodelist:", nodeList);
			callback(null, nodeList);
		}
	}
	
	function registerEditorEvent(socket, appCommands, appExtensions, backfire_filedialog) {
		var def_srcdir = __dirname;// + '/work/'
		console.log('Working Dir=' + def_srcdir);

		idTable[socket.id] = def_srcdir;
		sessionTable[def_srcdir] = { "dir" : def_srcdir, "proc" : null };
		//sessionTable[socket.id] = { "dir" : def_srcdir, "proc" : null };

		socket.on('disconnect', function () {
			var session;
			console.log("[DISCONNECT] ID=" + socket.id);
			session = getSession(socket.id);
			if (session && session.proc) {
				session.canRemoveID = true;
			} else {
				delete idTable[socket.id];
				delete socketTable[socket.id];
			}
		});

		function updateFileList(path) {
			var list = [];
			util.getFiles(path, list);
			if (list.length !== 0) {
				socket.emit('updatefilelist', JSON.stringify(list));
			}
		}
		
		socket.on('setWorkingPath', function (data) {
			var path = JSON.parse(data).path.toString(),
				session,
				i,
				log;
			
			if (path.substr(path.length - 1) !== "/") {
				path += "/";
			}
			
			idTable[socket.id] = path;
			socketTable[socket.id] = socket;
			session = searchSession(path);
			if (!session) {
				sessionTable[path] = { "dir" : path, "proc" : null };
			} else if (session.proc) {
				socket.emit('isExecuting', true);
				console.log("isExecuting TRUE");
			}
			if (session && session.hasOwnProperty('log')) {
				for (i = 0; i < session.log.length; i = i + 1) {
					log = session.log[i];
					socket.emit(log.type, log.data);
				}
			}
			updateFileList(path);
			
		});

		socket.on('reqFileList', function (data) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir;
			updateFileList(srcdir);
		});

		socket.on('reqSelectFile', function (data) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				ext = util.getExtention(data),
				launchAppNames = findLaunchApp(appExtensions, ext),
				relativePath = "";

			relativePath = data;
			if (relativePath.slice(0, 2) !== "..") {
				if (launchAppNames) {
					socket.emit('showfile_launchbutton', launchAppNames, srcdir, relativePath);
				} else {
					socket.emit('fileopen', relativePath);
				}
			}
		});

		socket.on('reqOpenFile', function (relativePath) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				filepath = path.join(srcdir, path.normalize(relativePath)),
				file;
			console.log("reqOpenFile:", filepath);
			try {
				console.log('reqOpenFile:' + filepath);
				if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
					file = fs.readFileSync(filepath).toString();
					if (path.extname(filepath) === ".json") {
						socket.emit('openJSON', file);
					} else {
						//console.log(file);
						socket.emit('openFile', file);
					}
				}
			} catch (e) {
				console.log(e);
			}
		});

		socket.on('reqFileOpen', function (data) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				ext = util.getExtention(data),
				editType = getEditTypeByExtension(ext),
				absolutePath = path.join(srcdir, data),
				filebuf = null,
				prefix,
				base64,
				imgdata;

			console.log('reqFileOpen:', absolutePath, 'SSSSS=', srcdir);
			if (fs.existsSync(absolutePath)) {
				filebuf = fs.readFileSync(absolutePath);
				if (editType === "image") {
					if (ext === "jpg") {
						prefix = 'data:image/jpeg;base64,';
					} else if (ext === "tga") {
						prefix = 'data:image/tga;base64,';
					} else if (ext === "png") {
						prefix = 'data:image/png;base64,';
					}
					base64 = new Buffer(filebuf, 'binary').toString('base64');
					imgdata = prefix + base64;
					//socket.send(data);
					socket.emit('showfile_image', imgdata);
				} else {
					socket.emit('showfile', {str : filebuf.toString(), type : editType});
				}
			} else {
				console.log(data);
				console.error("no such file or directory: " + absolutePath);
			}
		});

		socket.on('reqFileSave', function (sdata) {
			if (!getSession(socket.id)) { return; }
			//console.log(data.file);
			var srcdir = getSession(socket.id).dir,
				data = JSON.parse(sdata),
				targetPath = getSession(socket.id).dir + data.file;
			try {
				if (fs.existsSync(targetPath)) {
					fs.writeFileSync(targetPath, data.data);
					console.log('It\'s saved!:' + targetPath);
					socket.emit("filesavedone", true);
				} else {
					socket.emit("filesavedone", false);
				}
			} catch (e) {
				console.log("reqFileSave failed:" + e);
			}
		});
		
		socket.on('reqNewFile', function (sdata) {
			console.log('reqNewFile');
			//var srcdir = getSession(socket.id).dir,
			var data = JSON.parse(sdata),
				targetBaseDir = data.basedir,
				targetPath = data.target;
			console.log('SSSS', targetBaseDir);

			try {
				if (fs.existsSync(targetBaseDir)) {
					if (fs.existsSync(targetPath)) {
						console.log('It\'s exist!:' + targetPath);
						socket.emit("newfiledone", false);
					} else {
						fs.writeFileSync(targetPath, data.data);
						console.log('It\'s saved!:' + targetPath);
						socket.emit("newfiledone", true);
					}
				}
			} catch (e) {
				console.log("reqNewFile failed:" + e);
			}
		});
		
		socket.on('reqNewDir', function (sdata) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				data = JSON.parse(sdata),
				targetBaseDir = data.basedir,
				targetPath = data.target;

			console.log('reqNewDir:', targetPath);
			try {
				if (fs.existsSync(targetBaseDir)) {
					if (fs.existsSync(targetPath)) {
						socket.emit("newdirdone", false);
					} else {
						fs.mkdirSync(targetPath);
						console.log('It\'s saved!:' + targetPath);
						socket.emit("newdirdone", true);
					}
				}
			} catch (e) {
				console.error("reqNewDir failed:" + e);
			}
		});

		socket.on('reqRename', function (sdata) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				dstpath,
				data = JSON.parse(sdata),
				target = data.target, // This is full path
				newName = data.name;

			console.log('reqRename:' + sdata);

			if (!fs.existsSync(target)) {
				console.log('NOT FOUND rename target:', target);
			} else {
				if (fs.statSync(target).isDirectory()) {
					dstpath = path.join(target, '..', newName);
					if (fs.existsSync(dstpath)) {
						socket.emit("renamedone", false);
					} else {
						console.log("rename from:" + target);
						console.log("rename to:" + dstpath);
						fs.renameSync(target, dstpath);
						socket.emit("renamedone", true);
					}
				} else {
					dstpath = path.join(path.dirname(target), newName);
					if (fs.existsSync(dstpath)) {
						socket.emit("renamedone", false);
					} else {
						console.log("rename from:" + target);
						console.log("rename to:" + dstpath);
						fs.renameSync(target, dstpath);
						socket.emit("renamedone", true);
					}
				}
			}
		});

		socket.on('reqDelete', function (sdata) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				data = JSON.parse(sdata),
				target = data.target;

			console.log("reqDelete:" + sdata);

			try {
				if (fs.existsSync(target)) {
					if (fs.statSync(target).isDirectory()) {
						console.log("try delete fodler" + target);
						util.deleteFolderRecursive(target);
						fs.rmdirSync(target);
						socket.emit("deleted");
					} else {
						console.log("try delete file" + target);
						fs.unlinkSync(target);
						socket.emit("deleted");
					}
				}
			} catch (e) {
				console.error("reqDelete failed:" + e);
			}
		});
		
		function getCMDFileList(srcdir) {
			var files = [],
				caseFiles = [],
				caseFileList = {},
				i,
				k;
				
			util.getFiles(srcdir, files);
			for (i = 0; i < files.length; i = i + 1) {
				if (files[i].type === "dir") {
					caseFiles = [];
					util.getFiles(files[i].path, caseFiles);

					for (k = 0; k < caseFiles.length; k = k + 1) {
						if (caseFiles[k].type === "file" && caseFiles[k].name === CMD_FILENAME) {
							// found case dir
							caseFileList[files[i].name] = caseFiles[k].path;
						}
					}
				}
			}
			return caseFileList;
		}
		
		function getCMDInfo(srcdir, callback) {
			var cmdFileList = getCMDFileList(srcdir),
				nodeList = [],
				node,
				cmdData,
				i;
			for (i in cmdFileList) {
				if (cmdFileList.hasOwnProperty(i)) {
					cmdData = fs.readFileSync(cmdFileList[i], 'utf8');
					node = makeNodeFromCMD(JSON.parse(cmdData), i, null, null);
					if (node) {
						nodeList.push(node);
					}
				}
			}
			if (callback) {
				//console.log("nodelist:", nodeList);
				callback(null, nodeList);
			}
		}
		
		function cleanCase(caseName) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				cmdFileList = getCMDFileList(srcdir),
				cleanList,
				cmdData,
				cmdPath,
				target,
				k;
			
			try {
				console.log("cleanCase", caseName);
				if (cmdFileList.hasOwnProperty(caseName)) {
					cmdPath = cmdFileList[caseName];
					cmdData = fs.readFileSync(cmdPath, 'utf8');
					cmdData = JSON.parse(cmdData);
					if (cmdData.hasOwnProperty('hpcpf')) {
						if (cmdData.hpcpf.hasOwnProperty('case_meta_data')) {
							if (cmdData.hpcpf.case_meta_data.hasOwnProperty('clean')) {
								cleanList = cmdData.hpcpf.case_meta_data.clean;
								console.log("CLEANLIST", cleanList);
								for (k = 0; k < cleanList.length; k = k + 1) {
									if (util.isRelative(cleanList[k].path)) {
										target = path.join(srcdir, caseName);
										target = path.join(target, cleanList[k].path);
                                        target = path.resolve(target);
									} else {
										target = cleanList[k].path;
									}
									if (target !== srcdir && target !== ".") {
										if (cleanList[k].type === 'dir') {
											console.log("try clean directory:" + target);
											util.deleteDirectory(target);
										} else {
											console.log("try clean file:" + target);
											util.deleteFiles(target);
										}
									}
								}
							}
						}
					}
				}
				// delete cei.json
				target = path.join(srcdir, caseName);
				target = path.join(target, CEI_FILENAME);
				if (fs.existsSync(target)) {
					console.log("delete:", target);
					fs.unlinkSync(target);
				}
			} catch (e) {
				console.error(e);
			}
		}
		
		function cleanWorkflow(endCallback) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				cmdFileList = getCMDFileList(srcdir),
				cleanList = [],
				cleanData = {},
				i,
				k;
			
			console.log("cleanWorkflow");
			backfire_filedialog.Disconnect(socket.id);
			for (i in cmdFileList) {
				if (cmdFileList.hasOwnProperty(i)) {
					cleanCase(i);
				}
			}
			backfire_filedialog.SocketEvent(socket, 'opendlg', true);
			if (endCallback) {
				endCallback();
			}
		}

		socket.on('reqUpdateInformation', function () {
			if (!getSession(socket.id)) { return; }
			var pmdFile = path.join(getSession(socket.id).dir, PMD_FILENAME),
				srcdir = getSession(socket.id).dir,
				pmdStr,
				pmdData;
			//console.log("reqUpdateInformation:" + pmdFile);
			try {
				if (pmdFile && fs.existsSync(pmdFile)) {
					//console.log("reqUpdateInformation exists");
					pmdStr = fs.readFileSync(pmdFile);
					pmdData = JSON.parse(pmdStr);
					// console.log("pmdstr", pmdData);
				}
				//console.log(pmdData);
				getCMDInfo(srcdir, function (err, cmdData) {
					socket.emit('updateInformation', JSON.stringify(pmdData), JSON.stringify(cmdData));
				});
			} catch (e) {
				console.log("JSON parse error:" + pmdData);
			}
		});
		
		function readTargetConf() {
			var confData,
				confStr;
			if (fs.existsSync(targetConfFile)) {
				confStr = fs.readFileSync(targetConfFile);
				try {
					confData = JSON.parse(confStr);
				} catch (e) {
					console.log("JSON parse error:" + confData);
				}
			}
			return confData;
		}
		
		socket.on('reqReloadNodeList', function () {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				confData = readTargetConf();
			try {
				makeCaseNodeList(srcdir, confData, function (err, caseNodeList) {
					var i;
					if (err) {
						console.log("ReloadNodeList error:", err);
						return;
					}
					try {
						socket.emit('reloadNodeList', JSON.stringify(caseNodeList));
					} catch (e) {
						console.log("JSON parse error:", e);
					}
				});
			} catch (e) {
				console.log("JSON parse error", e);
			}
		});
		
		socket.on('reqSaveNode', function (data) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				targetPath = path.join(srcdir, 'nodedata.json');
			try {
				fs.writeFileSync(targetPath, data);
				console.log('It\'s saved!:' + targetPath);
				socket.emit("doneSaveNode", true);
			} catch (e) {
				console.log(e);
			}
		});
		
		socket.on('reqLoadNode', function () {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				targetPath = path.join(srcdir, 'nodedata.json'),
				data;
			try {
				if (fs.existsSync(targetPath)) {
					data = fs.readFileSync(targetPath).toString();
					socket.emit('doneLoadNode', data);
				} else {
					socket.emit('doneLoadNode', false);
				}
			} catch (e) {
				console.log(e);
			}
		});
		
		socket.on('reqGetTargetMachineList', function () {
			var confData = readTargetConf();
			socket.emit('doneGetTargetMachineList', JSON.stringify(confData));
		});

		function emitToAllSessions(projectDir, eventName, arg1, arg2, arg3) {
			var ids = searchSocketID(projectDir),
				i;
			//console.log("ids", ids);
			for (i = 0; i < ids.length; i = i + 1) {
				if (socketTable.hasOwnProperty(ids[i])) {
					//console.log("emitToAllSessions", eventName, arg1, arg2, arg3);
					socketTable[ids[i]].emit(eventName, arg1, arg2, arg3);
				}
			}
		}
		
		function changeCEIStatus(changeFunc) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				cmdFileList = getCMDFileList(srcdir),
				i,
				ceiPath,
				caseDirName,
				preStatus,
				postStatus,
				data;
			
			try {
				for (caseDirName in cmdFileList) {
					if (cmdFileList.hasOwnProperty(caseDirName)) {
						ceiPath = path.join(srcdir, caseDirName);
						if (fs.existsSync(ceiPath)) {
							ceiPath = path.join(ceiPath, CEI_FILENAME);
							if (fs.existsSync(ceiPath)) {
								data = JSON.parse(fs.readFileSync(ceiPath));
								console.log(data);
								if (data.hasOwnProperty('hpcpf') && data.hpcpf.hasOwnProperty('case_exec_info')) {
									preStatus = data.hpcpf.case_exec_info.status;
									postStatus = changeFunc(caseDirName, preStatus);
									if (preStatus !== postStatus) {
										data.hpcpf.case_exec_info.status = postStatus;
										fs.writeFileSync(ceiPath, JSON.stringify(data));
									}
								}
							}
						}
					}
				}
			} catch (e) {
				console.error(e);
			}
		}
		
		socket.on('stop', function (data) {
			if (!getSession(socket.id)) { return; }
			var processspawn = getSession(socket.id).proc;
			if (!processspawn) {
				return;
			}
			console.log('kill');
			killSpawn(processspawn, function (success) {
				getSession(socket.id).proc = null;
				changeCEIStatus(function (caseDirName, pre) {
					if (pre === 'Running(Dry)') {
						return 'Ready';
					} else if (pre === 'Running') {
						return 'Ready';
					}
					return pre;
				});
				socket.emit('stopdone', success);
			});
			getSession(socket.id).proc = null;
		});
		
		function runPWF(fileName) {
			if (!getSession(socket.id)) { return; }
			var session = getSession(socket.id),
				srcdir = session.dir,
				processspawn = session.proc,
				ext,
				lualibpath,
				sfile,
				ofile;

			ext = util.getExtention(fileName);
			console.log("EXT=" + ext);
			if (ext === "lua" || ext === "pwl" || ext === "cwl") {
				backupFile(srcdir, fileName);
				lualibpath = 'package.path = [[' + __dirname + '/../lib/?.lua;]] .. package.path;';
				processspawn = spawn(LUA_CMD, ['-e', lualibpath, '-e', 'HPCPF_BIN_DIR = [[' + __dirname + ']]', fileName], {cwd : srcdir});
			} else if (ext === "sh" || ext === "pwf" || ext === "cwf") {
				processspawn = spawn(SH_CMD, [fileName], {cwd : srcdir});
			} else if (ext === "bat") {
				processspawn = spawn(fileName, [], {cwd : srcdir});
			} else if (ext === "scn") {
				console.log("KR:" + KRENDER_CMD + " / scn path=" + srcdir + fileName);
				processspawn = spawn(KRENDER_CMD, [srcdir + fileName], (function (session) {
					return function (err, stdout, stderr) {
						if (!err) { return; }
						console.log('Failed run krender.');
						getSession(socket.id).proc = null;
					};
				}(session)));
			} else if (ext === "frag") {
				if (!process.env.GLSL_COMPILER) {
					console.log("can't find GLSL_COMPILER");
					socket.emit('stderr', "can't find GLSL_COMPILER");
					return;
				}
				sfile = srcdir + fileName;
				ofile = srcdir + fileName;
				ofile = ofile.substr(0, ofile.length - 4) + "so";
				console.log("Target SO:" + ofile);
				processspawn = spawn(process.env.GLSL_COMPILER, ['-o', ofile, sfile], (function (session) {
					return function (err, stdout, stderr) {
						if (!err) { return; }
						console.log('Failed run glslc.');
						getSession(socket.id).proc = null;
					};
				}(session)));
			}
			session.proc = processspawn;
			session.log = [];
			if (processspawn) {
				processspawn.stdout.on('data', (function (session) {
					return function (data) {
						var str = data.toString();
						console.log('stdout: ' + data);
						session.log.push({ type: 'stdout', data : str});
						//socket.emit('stdout', data.toString());
						emitToAllSessions(srcdir, 'stdout', str);
					};
				}(session)));
				processspawn.stderr.on('data', (function (session) {
					return function (data) {
						var str = data.toString();
						console.log('stderr: ' + data);
						session.log.push({ type: 'stderr', data : str});
						//socket.emit('stderr', data.toString());
						emitToAllSessions(srcdir, 'stderr', str);
					};
				}(session)));
				processspawn.on('exit', (function (session) {
					return function (code) {
						console.log('exit code: ' + code);

						session.proc = null;
						if (session && session.proc) {
							changeCEIStatus(function (caseDirName, pre) {
								if (pre === 'Running(Dry)') {
									return 'Failed(Dry)';
								} else if (pre === 'Running') {
									return 'Failed';
								}
								return pre;
							});
						}
					};
				}(session)));
				processspawn.on('close', (function (session) {
					return function (code, signal) {
						var ids,
							i;
						console.log('close code: ' + code);
						updateFileList(srcdir);
						session.proc = null;
						if (session.hasOwnProperty('canRemoveID') && session.canRemoveID) {
							delete idTable[socket.id];
							delete socketTable[socket.id];
							session.canRemoveID = false;
						}
						emitToAllSessions(srcdir, 'exit');
					};
				}(session)));
				processspawn.on('error', (function (session) {
					return function (err) {
						console.log('process error', err);
						//socket.emit('stderr', "can't execute program\n");
						emitToAllSessions(srcdir, 'stderr', "can't execute program\n");

						changeCEIStatus(function (caseDirName, pre) {
							if (pre === 'Running(Dry)') {
								return 'Failed(Dry)';
							} else if (pre === 'Running') {
								return 'Failed';
							}
							return pre;
						});
					};
				}(session)));
			} else {
				//socket.emit('stdout', 'Unknown file type. -> ' + fileName);
				emitToAllSessions(srcdir, 'stdout', 'Unknown file type. -> ' + fileName);
			}
		}
		
		function writePWF(data) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				pwfFile = path.join(srcdir, PWF_FILENAME);
			if (!data) { return false; }
			fs.writeFileSync(pwfFile, data);
			return true;
		}
		
		socket.on('runWorkflow', function (data) {
			var srcdir = getSession(socket.id).dir,
				processspawn = getSession(socket.id).proc,
				lualibpath = 'package.path = [[' + __dirname + '/../lib/?.lua;]] .. package.path;';
			if (processspawn) {
				killSpawn(processspawn);
				getSession(socket.id).proc = null;
			}
			
			if (writePWF(data)) {
				runPWF(PWF_FILENAME);
			}
		});
		
		socket.on('cleanCase', function (caseName) {
			if (!getSession(socket.id)) { return; }
			var processspawn = getSession(socket.id).proc;
			if (processspawn) {
				socket.emit('doneCleanCase', false);
				return;
			}
			
			backfire_filedialog.Disconnect(socket.id);
			cleanCase(caseName);
			socket.emit('doneCleanCase', true);
			backfire_filedialog.SocketEvent(socket, 'opendlg', true);
		});
		
		socket.on('resetWorkflow', function () {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				nodeFile = path.join(srcdir, NODEJSON_FILENAME),
				nodeOrgFile = path.join(srcdir, NODEJSON_ORG_FILENAME);
			try {
				if (fs.existsSync(nodeFile)) {
					fs.unlinkSync(nodeFile);
				}
				if (fs.existsSync(nodeOrgFile)) {
					fs.createReadStream(nodeOrgFile).pipe(fs.createWriteStream(nodeFile));
				}
				socket.emit('doneResetWorkflow');
			} catch (e) {
				console.error(e);
			}
		});
		
		socket.on('cleanWorkflow', function () {
			if (!getSession(socket.id)) { return; }
			var processspawn = getSession(socket.id).proc;
			if (processspawn) {
				socket.emit('doneCleanWorkflow', false);
				return;
			}
			cleanWorkflow(function () {
				socket.emit('doneCleanWorkflow', true);
			});
		});
		
		socket.on('run', function (data) {
			if (!getSession(socket.id)) { return; }
			var srcdir = getSession(socket.id).dir,
				processspawn = getSession(socket.id).proc,
				ext,
				lualibpath,
				sfile,
				ofile;
			
			if (processspawn) {
				killSpawn(processspawn);
				getSession(socket.id).proc = null;
			}
			runPWF(data.file);
		});
	}
	
	function getProjectList() {
		var session,
			files = [],
			projectFiles = [],
			i,
			k,
			ceiFile,
			ceiData,
			hasCeiJSON = false,
			status = "Ready",
			result = {},
			getStatusFunc = function (cei) {
				var elem;
				if (cei && cei.hasOwnProperty('hpcpf')) {
					if (cei.hpcpf.hasOwnProperty('case_exec_info')) {
						elem = cei.hpcpf.case_exec_info;
						if (elem.hasOwnProperty('status')) {
							return elem.status;
						}
					}
				}
				return "Ready";
			};
		
		try {
			for (i in sessionTable) {
				if (sessionTable.hasOwnProperty(i)) {
					session = sessionTable[i];
					if (session.hasOwnProperty('dir')) {
						if (session.dir !== __dirname) {
							projectFiles = [];
							util.getFiles(session.dir, projectFiles);

							hasCeiJSON = false;
							for (k = 0; k < projectFiles.length; k = k + 1) {
								if (projectFiles[k].type === "dir") {
									ceiFile = path.join(projectFiles[k].path, 'cei.json');
									if (fs.existsSync(ceiFile)) {
										hasCeiJSON = true;
										ceiData = fs.readFileSync(ceiFile);
										status = getStatusFunc(JSON.parse(ceiData));
										if (status === "Running" || status === "Running(Dry)") {
											if (!session.proc && status === "Running") {
												status = "Failed";
											} else if (!session.proc && status === "Running(Dry)") {
												status = "Failed(Dry)";
											}
											break;
										} else if (status === "Failed" || status === "Failed(Dry)") {
											break;
										} else if (status === "Ready") {
											break;
										}
									} else {
										console.log("not found cei file:", ceiFile);
										status = "Ready";
										break;
									}
								}
							}
							console.log(status);
							result[path.basename(session.dir)] = { status : status, path : session.dir };
						}
					}
				}
			}
			return result;
		} catch (e) {
			console.error(e);
		}
	}

	module.exports.registerEditorEvent = registerEditorEvent;
	module.exports.getProjectList = getProjectList;
}());
