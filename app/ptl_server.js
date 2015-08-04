/*jslint devel:true, nomen: true*/
/*global require, __dirname, showExistWarning, hiddenExistWarning*/
var exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	fs = require('fs'),
	path = require('path'),
	http = require('http'),
	util = require('./util'),
	os = require('os'),
	editorevent = require('./editor_event'),
	remotehostevent = require('./remotehost_event'),
	filedialog = require('./js/filedialog'),
	backfire_filedialog = require('./js/backfire_filedialog'),
	remoteFTP = require('./js/RemoteFTP'),
	excludePath = require('./js/exclude_path'),
	
	confFile = path.resolve(__dirname, '../conf/hpcpfGUI.conf'),
	projectTemplate = path.resolve(__dirname, '../template/project_template'),
	portNumber      = 8080,
	projectBasePath = "",
	appCommands = {},   // app name to launch path
	appExtensions = {}; // app name to extension list

try {
	console.log('confFile = ' + confFile);
	var ostype = os.platform(),
		file = fs.readFileSync(confFile),
		data = JSON.parse(file),
		name,
		i,
		extensions;
	console.log('OS = ' + ostype);
	
	if (data.port) { portNumber = data.port; }
	for (name in data) {
		if (data.hasOwnProperty(name)) {
			if (name === "project_base") {
				projectBasePath = path.normalize(data.project_base);
				if (util.isRelative(projectBasePath)) {
					projectBasePath = path.resolve(path.join(__dirname, ".."), projectBasePath);
				}
				console.log("project base:" + projectBasePath);
			} else if (name !== "port") {
				appCommands[name] = data[name][ostype];
				if (data[name].hasOwnProperty("extension")) {
					extensions = data[name].extension.split(';');
					// exclude dot and asterisk
					for (i in extensions) {
						if (extensions.hasOwnProperty(i)) {
							extensions[i] = extensions[i].split('.').join("");
							extensions[i] = extensions[i].split('*').join("");
							extensions[i] = extensions[i].split(' ').join("");
						}
					}
					appExtensions[name] = extensions;
				}
			}
		}
	}
	excludePath.loadExcludeFileList();
} catch (e) {
	console.log('Not found conf file:' + confFile);
	console.log('Use default setting.');
}

//-------------------------------------
// Server request logic
//-------------------------------------
var server = http.createServer();
server.on('request', function (req, res) {
	"use strict";
	console.log("REQ>" + req.url);
	
	var url = req.url,
		addrs = req.url.split("?"),
		html,
		ext;
	if (addrs) {
		url = addrs[0]; // ignore args
	}
	
	if (url === '/') {
		html = fs.readFileSync('./home.html');
		res.writeHead(200, {'Content-Type': 'text/html', charaset: 'UTF-8'});
		res.end(html);
	} else {
		fs.readFile('.' + url, function (err, data) {
			if (err) {
				res.writeHead(404, {'Content-Type': 'text/html', charaset: 'UTF-8'});
				res.end("<h1>not found<h1>");
				return;
			}
			ext = util.getExtention(url);
			if (ext === "css") {
				res.writeHead(200, {'Content-Type': 'text/css', charaset: 'UTF-8'});
			} else if (ext === "html" || ext === "htm") {
				res.writeHead(200, {'Content-Type': 'text/html', charaset: 'UTF-8'});
			} else if (ext === "js" || ext === "json") {
				res.writeHead(200, {'Content-Type': 'text/javascript', charaset: 'UTF-8'});
			} else {
				res.writeHead(200);
			}
			res.end(data);
		}); // fs.readFile
	}
});
server.listen(portNumber);
console.log('Server running on localhost:' + portNumber);

//---------------------------------------------------------------------------

function registerPTLEvent(socket) {
	"use strict";
	socket.on('ptl_launchapp', function (data) {
		console.log("ptl_launchapp:" + data.appname);
		console.log("ptl_launchapp file:" + data.file);
		
		var appcmd, child;
		if (appCommands.hasOwnProperty(data.appname)) {
			appcmd = appCommands[data.appname];
		}
		if (data.file) {
			appcmd = appcmd + " " + path.normalize(data.file);
		}
		
		console.log('CMD>' + appcmd);
		child = exec(appcmd, function (err, stdout, stderr) {
			if (err) {
				console.log(err);
				console.log(err.code);
				console.log(err.signal);
			} else {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
			}
		});
	});// ptl_launchapp
	
	filedialog.SocketEvent(socket, 'homedlg');
	filedialog.SocketEvent(socket, 'remotedlg');
	backfire_filedialog.SocketEvent(socket, 'opendlg');

	var historyFile = "../conf/project_history.json";
		
	/// @param src native path
	/// @param dst native path
	function copyTemplate(src, dst) {
		if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
			if (!fs.existsSync(dst)) {
				fs.mkdirSync(dst);
			}
			fs.readdirSync(src).forEach(
				function (childItemName) {
					copyTemplate(path.join(src, childItemName), path.join(dst, childItemName));
				}
			);
		} else {
			fs.linkSync(src, dst);
		}
	}

	function withExistWarningEx(is_exist, doFunction) {
		if (is_exist) {
			showExistWarning(function () {
				hiddenExistWarning();
				doFunction();
			});
		} else {
			doFunction();
		}
	}
	
	/// @param str native path
	/// @retval slash path
	function toSlashPath(str) {
		var newpath = path.relative('/', str);
		newpath = '/' + newpath.split(path.sep).join("/");
		return newpath;
	}
	
	/// @param newpath native path
	function createNewProject(newpath) {
		if (!fs.existsSync(newpath)) {
			try {
				fs.mkdirSync(newpath);
				if (fs.existsSync(newpath)) {
					copyTemplate(projectTemplate, newpath);
					console.log("createNewProject:" + newpath);
					socket.emit('createNewProject', toSlashPath(newpath));
				}
			} catch (e) {
				console.log(e);
			}
		}
	}

	socket.on('reqCreateNewProject', function (name) {
		var newpath = "",
			newName = "",
			counter = 1,
			is_exist = false,
			tempBasePath;
		
		if (fs.existsSync(projectBasePath)) {
			newpath = path.join(projectBasePath, name);
			if (path.join(newpath, '..') === projectBasePath) {
				while (fs.existsSync(newpath)) {
					is_exist = true;
					newName = name + "_" + counter;
					console.log("newName:" + newName);
					newpath = path.join(projectBasePath, newName);
					counter = counter + 1;
				}
				if (is_exist) {
					createNewProject(newpath);
					socket.emit('showNewProjectNameExists', newName, toSlashPath(newpath));
				} else {
					createNewProject(newpath);
					socket.emit('showNewProjectName', name, toSlashPath(newpath));
				}
			}
		}
	});
	
	/*
	socket.on('reqCreateNewProjectWithSameName', function (newpath) {
		createNewProject(newpath);
	});
	*/
	
	socket.on('reqUpdateProjectHistory', function (path) {
		fs.readFile(historyFile, function (err, data) {
			if (err) {
			    return;
			}
			socket.emit('updateProjectHistory', data.toString());
		});
	});
	
	socket.on('reqOpenProjectDialog', function () {
		var basepath = toSlashPath(projectBasePath);
		console.log("reqOpenProjectDialog:" + basepath);
		socket.emit('openProjectDialog', basepath);
	});
	
	socket.on('reqOpenProjectArchiveDialog', function () {
		var basepath = toSlashPath(projectBasePath);
		console.log("reqOpenProjectArchiveDialog:" + basepath);
		socket.emit('openProjectArchiveDialog', basepath);
	});
	
	socket.on('reqOpenProjectArchive', function (tarpath) {
		var basepath = toSlashPath(projectBasePath),
			newname = "",
			is_exist = false,
			dstpath,
			tarFileName,
			tarFileExt,
			counter = 1;
		console.log("tarpath : " + tarpath);
		try {
			// gz
			tarFileExt = path.extname(tarpath);
			tarFileName = path.basename(tarpath, tarFileExt);
			// tar
			tarFileExt = path.extname(tarFileName);
			tarFileName = path.basename(tarFileName, tarFileExt);
			console.log("tarFileName : " + tarFileName);
			dstpath = basepath + '/' + tarFileName;
			 
			while (fs.existsSync(dstpath)) {
				is_exist = true;
				newname = tarFileName + "_" + counter;
				dstpath = basepath + '/' + newname;
				console.log("dstpath:" + dstpath);
				counter = counter + 1;
			}
			fs.mkdirSync(dstpath);
			util.extractTar(dstpath, tarpath);
			if (is_exist) {
				socket.emit("openProjectArchive", newname, dstpath);
			} else {
				socket.emit("openProjectArchive", tarFileName, dstpath);
			}
		} catch (e) {
			console.log(e);
		}
	});
	
	socket.on('registerProjectHistory', function (path) {
		console.log("REGISTER_HISTORY:" + path);
		fs.readFile(historyFile, function (err, data) {
			var names = path.split("/"),
				name = names[names.length - 1],
				i;
			console.log("ProjName=" + name);
			if (err) {
				console.log('Error: ' + err);
				data = [];
				data.push({"name": name, "path": path});
			} else {
				data = JSON.parse(data);
				// remove same entry
				for (i = data.length - 1; i >= 0; i = i - 1) {
					if (data[i].name === name && data[i].path === path) {
						data.splice(i, 1);
					}
				}
				data.splice(0, 0, {"name": name, "path": path}); // Add first
			}
			data  = JSON.stringify(data);
			fs.writeFileSync(historyFile, data, 'utf8');
		});
	});
	
	socket.on('reqGetProjectList', function () {
		console.log("reqGetProjectList");
		var files = [],
			projectFiles = [],
			i,
			k,
			ceiFile,
			ceiData,
			hasCeiJSON = false,
			status = "pending",
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
				return "pending";
			};
		
		try {
			files = [];
			util.getFiles(projectBasePath, files);
			for (i = 0; i < files.length; i = i + 1) {
				if (files[i].type === "dir") {
					projectFiles = [];
					util.getFiles(files[i].path, projectFiles);

					console.log(files[i].path);
					hasCeiJSON = false;
					for (k = 0; k < projectFiles.length; k = k + 1) {
						if (projectFiles[k].type === "dir") {
							ceiFile = path.join(projectFiles[k].path, 'cei.json');
							if (fs.existsSync(ceiFile)) {
								hasCeiJSON = true;
								ceiData = fs.readFileSync(ceiFile);
								status = getStatusFunc(JSON.parse(ceiData));
							}
						}
					}

					if (hasCeiJSON) {
						if (status !== "finished" && status !== "pending") {
							result[files[i].name] = status;
						}
					}
				}
			}

			socket.emit('getProjectList', JSON.stringify(result));
		} catch (e) {
			console.error(e);
		}
	});
	
	// no use function on home
	socket.on('reqUpdateLaunchButtons', function () {
		var appnames = [],
			name;
		for (name in appCommands) {
			if (appCommands.hasOwnProperty(name)) {
				appnames.push(name);
			}
		}
		socket.emit('updateLaunchButtons', appnames);
	});
	
	socket.on('reqInit', function () {
		socket.emit('init');
	});
	
	socket.on('disconnect', (function (backfire_filedialog, id) {
		return function () {
			backfire_filedialog.Disconnect(id);
		};
	}(backfire_filedialog, socket.id)));
}

// socket.io setting
var io = require('socket.io').listen(server);//, {'log level': 1});

io.sockets.on('connection', function (socket) {
	"use strict";
	socket.emit('event', 'Server Connected.');
	console.log("[CONNECT] ID=" + socket.id);

	remoteFTP(socket);
	editorevent.registerEditorEvent(socket, appCommands, appExtensions);
	remotehostevent.registerEditorEvent(socket);
	registerPTLEvent(socket);
});