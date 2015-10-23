/*jslint devel:true nomen: true, bitwise:true, regexp:true*/
/*global require, __dirname, process, io, module */

var fs = require('fs'),
	path = require('path'),
	cp = require('child_process'),
	exec = require('child_process').exec,
	os = require('os'),
	crypto = require('crypto');

//-------------------------------------
// Utility functions
//-------------------------------------
function getFiles(dir, list) {
	"use strict";
	var files,
		name,
		i;
	try {
		files = fs.readdirSync(dir);
	} catch (e) {
		list = {};
		return;
	}
	if (!files) {
		return;
	}
	if (dir.substr(dir.length - 1) !== "/") {
		dir += "/";
	}
	for (i in files) {
		if (files.hasOwnProperty(i)) {
			name = dir + files[i];
			try {
				if (fs.statSync(name).isDirectory()) {
					//getFiles(name,list);
					//console.log(name);
					list.push({"name" : files[i], "type" : "dir", "path" : name});
				} else if (files[i].substring(0, 1) !== '.') {
					//console.log(name);
					list.push({"name" : files[i], "type" : "file", "path" : name});
				}
			} catch (ex) {
				console.log("not found dir:" + dir);
			}
		}
	}
}

function getExtention(fileName) {
	"use strict";
	var ret,
		fileTypes,
		len;
	if (!fileName) {
		return ret;
	}
	fileTypes = fileName.split(".");
	len = fileTypes.length;
	if (len === 0) {
		return ret;
	}
	ret = fileTypes[len - 1];
	return ret.toString().toLowerCase();
}

function isRelative(p) {
	"use strict";
	var normal = path.normalize(p),
		absolute = path.resolve(p);
	return normal !== absolute;
}

function getRealPath(p) {
	"use strict";
	return path.join(process.cwd().split(':')[0] + ':', p);
}

var localCmd = function (cmd, callback) {
	"use strict";
	exec(cmd, (function (cb) {
		return function (error, stdout, stderr) {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			if (error !== null) {
				console.log('exec error: ' + error);
			}
			if (cb) {
				cb(error);
			}
		};
	}(callback)));
};

/// launch application
/// @param command list with args e.g. [ "hoge.exe", "arg1", "arg2" ]
function launchApp(command, startcallback, endcallback) {
	"use strict";
	var child,
		cmd,
		args,
		proc,
		isWin32 = (process.platform === 'win32');
	
	console.log("-----launch app ----------");
	if (isWin32) {
		cmd = command.join(" ");
		console.log('CMD>' + cmd);
		proc = cp.spawn(process.env.comspec, ['/c', cmd]);
		proc.setMaxListeners(0);
		if (startcallback) {
			startcallback();
		}
	} else {
		cmd = command[0];
		console.log('CMD>' + cmd);
		args = command.slice(1);
		console.log('args>' + args);
		proc = cp.spawn(cmd, args);
		proc.setMaxListeners(0);
		if (startcallback) {
			startcallback();
		}
	}
	
	proc.stdout.setEncoding("utf8");
	proc.stdout.on('data', function (data) {
		console.log(data);
	});
	proc.stderr.setEncoding("utf8");
	proc.stderr.on('data', function (data) {
		console.log(data);
	});
	proc.on('close', function (code, signal) {
		//console.log('child process terminated due to receipt of signal ' + signal);
	});
	proc.on('exit', function (code) {
		if (endcallback) {
			endcallback();
		}
		console.log("-----launch app done -----");
	});
	return proc;
}

function extractTar(dstPath, srcAbsolutePath) {
	"use strict";
	var cmdstr,
		tarcmd = 'tar',
		src = srcAbsolutePath,
		dst = dstPath;
	
	if (process.platform === 'win32') {
		tarcmd = 'tar.exe';
		src = getRealPath(srcAbsolutePath).split("\\").join("/");
		dst = getRealPath(dstPath).split("\\").join("/");
	}
	launchApp([tarcmd, "xvf", src, '-C', dst]);
}

function deleteFolderRecursive(target) {
	"use strict";
	var files = [],
		file,
		i;
	if (fs.existsSync(target)) {
		files = fs.readdirSync(target);
		for (i = files.length - 1; i >= 0; i = i - 1) {
			file = target + files[i];
			if (fs.statSync(file).isDirectory()) {
				deleteFolderRecursive(file + '/');
				console.log("deleteFolder :" + files[i] + '/');
				fs.rmdirSync(file);
			} else {
				console.log("deleteFile :" + files[i]);
				fs.unlinkSync(file);
			}
		}
	}
}

function deleteFiles(target, callback) {
	"use strict";
	var rmFileCmd;
	
	if (os.platform().indexOf('win') === 0) { // win setting
		rmFileCmd = 'del /Q';
		rmFileCmd += ' "' + target + '"';
	} else {
		target = target.replace(" ", "\\ ");
		rmFileCmd = 'rm';
		rmFileCmd += ' ' + target;
	}
	console.log("util.deleteFiles:", rmFileCmd);
	exec(rmFileCmd, (function (cb) {
		return function (error, stdout, stderr) {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			if (error !== null) {
				console.log('exec error: ' + error);
			}
			if (cb) {
				cb(error);
			}
		};
	}(callback)));
}

function deleteDirectory(target, callback) {
	"use strict";
	var rmDirCmd;
	if (os.platform().indexOf('win') === 0) {
		rmDirCmd  = 'for /d %1 in ("' + target + '") do rmdir /q /s %1';
	} else {
		target = target.replace(" ", "\\ ");
		rmDirCmd  = 'rm -rf' + ' ' + target;
	}
	console.log("util.deleteDirectory:", rmDirCmd);
	exec(rmDirCmd, (function (cb) {
		return function (error, stdout, stderr) {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			if (error !== null) {
				console.log('exec error: ' + error);
			}
			if (cb) {
				cb(error);
			}
		};
	}(callback)));
}

function uuidFromBytes(rnd) {
	"use strict";
	rnd[6] = (rnd[6] & 0x0f) | 0x40;
	rnd[8] = (rnd[8] & 0x3f) | 0x80;
	rnd = rnd.toString('hex').match(/(.{8})(.{4})(.{4})(.{4})(.{12})/);
	rnd.shift();
	return rnd.join('-');
}

/**
 * @method generateUUID8
 * @return CallExpression
 */
function generateUUID8() {
	"use strict";
	return uuidFromBytes(crypto.randomBytes(16)).slice(0, 8);
}

module.exports.getExtention = getExtention;
module.exports.getFiles = getFiles;
module.exports.isRelative = isRelative;
module.exports.extractTar = extractTar;
module.exports.deleteFolderRecursive = deleteFolderRecursive;
module.exports.deleteFiles = deleteFiles;
module.exports.deleteDirectory = deleteDirectory;
module.exports.generateUUID8 = generateUUID8;
