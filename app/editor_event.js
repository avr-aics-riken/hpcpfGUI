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
		PIF_FILENAME = 'pif.json',
		CIF_FILENAME = 'cif.json',
		sesstionTable = {};

	if (os.platform() === 'linux') { // Linux setting
		KRENDER_CMD = __dirname + '/krender_linux';
		LUA_CMD = 'lua'; // Use system command
		TAR_CMD = 'tar';
	} else if (os.platform().indexOf('win') === 0) { // win setting
		KRENDER_CMD = __dirname + '/krender.exe';
		LUA_CMD = __dirname + '/lua.exe';
		TAR_CMD = __dirname + '/tar.exe';
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
	
	function makeNodeList(srcdir, callback) {
		var nodeDir = path.join(srcdir, 'nodes');
		//console.log("makeNodeList");
		fs.readdir(nodeDir, function (err, files) {
			var infofile,
				nodeDirPath,
				fileCounter,
				customFuncLua,
				nodelist = [],
				i;
			if (err) {
				return;
			}

			fileCounter = 0;
			function finishLoad() {
				fileCounter = fileCounter - 1;
				if (fileCounter === 0) {
					callback(null, nodelist);
				}
			}
			function loadFunc(nodeDirPath) {
				return function (err, data) {
					try {
						var json = JSON.parse(data);
						if (json.customfuncfile !== undefined) {
							customFuncLua = fs.readFileSync(nodeDirPath + "/" + json.customfuncfile, 'utf8');
							json.customfunc = customFuncLua;
						}
						nodelist.push(json);
					} catch (e) {
						console.log('[Error] Failed Load:' + nodeDirPath + "/info.json", e);
					}
					finishLoad();
				};
			}
			for (i in files) {
				if (files.hasOwnProperty(i)) {
					if (files[i].substr(0, 1) !== '.') {
						nodeDirPath = nodeDir + "/" + files[i];
						infofile = nodeDirPath + "/info.json";
						fileCounter = fileCounter + 1;
						fs.readFile(infofile, 'utf8', loadFunc(nodeDirPath));
					}
				}
			}
		});
	}

	function registerEditorEvent(socket, appCommands, appExtensions) {
		var def_srcdir = __dirname;// + '/work/'
		console.log('Working Dir=' + def_srcdir);

		sesstionTable[socket.id] = { "dir" : def_srcdir, "proc" : null };

		socket.on('disconnect', function () {
			console.log("[DISCONNECT] ID=" + socket.id);
			if (sesstionTable[socket.id].proc) {
				killSpawn(sesstionTable[socket.id].proc);
			}
			delete sesstionTable[socket.id];
		});

		function updateFileList(path) {
			var list = [];
			util.getFiles(path, list);
			if (list.length !== 0) {
				socket.emit('updatefilelist', JSON.stringify(list));
			}
		}

		socket.on('setWorkingPath', function (data) {
			var path = JSON.parse(data).path.toString();
			if (path.substr(path.length - 1) !== "/") {
				path += "/";
			}
			sesstionTable[socket.id].dir = path;
			updateFileList(path);
		});

		socket.on('reqFileList', function (data) {
			var srcdir = sesstionTable[socket.id].dir;
			updateFileList(srcdir);
		});

		socket.on('reqSelectFile', function (data) {
			var srcdir = sesstionTable[socket.id].dir,
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
			var srcdir = sesstionTable[socket.id].dir,
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
			var srcdir = sesstionTable[socket.id].dir,
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
			//console.log(data.file);
			var srcdir = sesstionTable[socket.id].dir,
				data = JSON.parse(sdata),
				targetPath = sesstionTable[socket.id].dir + data.file;
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
			//var srcdir = sesstionTable[socket.id].dir,
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
			var srcdir = sesstionTable[socket.id].dir,
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
			var srcdir = sesstionTable[socket.id].dir,
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
			var srcdir = sesstionTable[socket.id].dir,
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

		socket.on('reqUpdateInformation', function () {
			var pifFile = path.join(sesstionTable[socket.id].dir, PIF_FILENAME),
				pifData,
				pifStr;
			console.log("reqUpdateInformation:" + pifFile);
			if (pifFile && fs.existsSync(pifFile)) {
				console.log("reqUpdateInformation exists");
				pifData = fs.readFileSync(pifFile);
				try {
					pifStr = JSON.parse(pifData);
					//console.log(pifStr);
					socket.emit('updateInformation', JSON.stringify(pifStr));
				} catch (e) {
					console.log("JSON parse error:" + pifData);
				}
			}
		});
		
		socket.on('reqReloadNodeList', function () {
			var srcdir = sesstionTable[socket.id].dir;
			makeNodeList(srcdir, function (err, nodelist) {
				if (err) {
					console.log("ReloadNodeList error:", err);
					return;
				}
				try {
					socket.emit('reloadNodeList', JSON.stringify(nodelist));
				} catch (e) {
					console.log("JSON parse error:", e);
				}
			});
		});

		socket.on('stop', function (data) {
			var processspawn = sesstionTable[socket.id].proc;
			if (!processspawn) {
				return;
			}
			console.log('kill');
			killSpawn(processspawn, function (success) {
				sesstionTable[socket.id].proc = null;
				socket.emit('stopdone', success);
			});
			sesstionTable[socket.id].proc = null;
		});

		socket.on('run', function (data) {
			var srcdir = sesstionTable[socket.id].dir,
				processspawn = sesstionTable[socket.id].proc,
				ext,
				lualibpath,
				sfile,
				ofile;
			console.log("runFile>" + data.file);
			if (processspawn) {
				killSpawn(processspawn);
				sesstionTable[socket.id].proc = null;
			}

			ext = util.getExtention(data.file);
			console.log("EXT=" + ext);
			if (ext === "lua" || ext === "pwl" || ext === "cwl") {
				backupFile(srcdir, data.file);
				lualibpath = 'package.path = [[' + __dirname + '/../lib/?.lua;]] .. package.path;';
				processspawn = spawn(LUA_CMD, ['-e', lualibpath, '-e', 'HPCPF_BIN_DIR = [[' + __dirname + ']]', data.file], {cwd : srcdir});
			} else if (ext === "sh" || ext === "pwf" || ext === "cwf") {
				processspawn = spawn(SH_CMD, [data.file], {cwd : srcdir});
			} else if (ext === "bat") {
				processspawn = spawn(data.file, [], {cwd : srcdir});
			} else if (ext === "scn") {
				console.log("KR:" + KRENDER_CMD + " / scn path=" + srcdir + data.file);
				processspawn = spawn(KRENDER_CMD, [srcdir + data.file], function (err, stdout, stderr) {
					if (!err) { return; }
					console.log('Failed run krender.');
					sesstionTable[socket.id].proc = null;
				});
			} else if (ext === "frag") {
				if (!process.env.GLSL_COMPILER) {
					console.log("can't find GLSL_COMPILER");
					socket.emit('stderr', "can't find GLSL_COMPILER");
					return;
				}
				sfile = srcdir + data.file;
				ofile = srcdir + data.file;
				ofile = ofile.substr(0, ofile.length - 4) + "so";
				console.log("Target SO:" + ofile);
				processspawn = spawn(process.env.GLSL_COMPILER, ['-o', ofile, sfile], function (err, stdout, stderr) {
					if (!err) { return; }
					console.log('Failed run glslc.');
					sesstionTable[socket.id].proc = null;
				});
			}
			sesstionTable[socket.id].proc = processspawn;
			if (processspawn) {
				processspawn.stdout.on('data', function (data) {
					console.log('stdout: ' + data);
					socket.emit('stdout', data.toString());
				});
				processspawn.stderr.on('data', function (data) {
					console.log('stderr: ' + data);
					socket.emit('stderr', data.toString());
				});
				processspawn.on('exit', function (code) {
					console.log('exit code: ' + code);
				});
				processspawn.on('close', function (code, signal) {
					console.log('close code: ' + code);
					updateFileList(srcdir);
					sesstionTable[socket.id].proc = null;
					socket.emit('exit');
				});
				processspawn.on('error', function (err) {
					console.log('process error', err);
					socket.emit('stderr', "can't execute program\n");
				});
			} else {
				socket.emit('stdout', 'Unknown file type. -> ' + data.file);
			}
		});
	}

	module.exports.registerEditorEvent = registerEditorEvent;
}());
