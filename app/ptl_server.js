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
	RemoteFTP = require('./js/RemoteFTP'),
	
	confFile = __dirname + '/../conf/hpcpfGUI.conf',
	portNumber      = 8080,
	appCommands = {},   // app name to launch path
	appExtensions = {}; // app name to extension list
	

try {
	console.log('confFile = ' + confFile);
	var ostype = os.platform(),
		file = fs.readFileSync(confFile),
		data = JSON.parse(file);
	console.log('OS = ' + ostype);
	
	if (data.port) { portNumber        = data.port; }
	for (var name in data) {
		if (name !== "port") {
			appCommands[name] = data[name][ostype];
			if ("extension" in data[name]) {
				var extensions = data[name]["extension"].split(';');
				// exclude dot and asterisk
				for (var i in extensions) {
					extensions[i] = extensions[i].split('.').join("");
					extensions[i] = extensions[i].split('*').join("");
					extensions[i] = extensions[i].split(' ').join("");
				}
				appExtensions[name] = extensions;
			}
		}
	}
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
		if (data.appname in appCommands) {
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

	var historyFile = "../conf/project_history.json";
	
	socket.on('reqUpdateProjectHistory', function (path) {
		fs.readFile(historyFile, function (err, data) {
			if (err) {
			    return;
			}
			socket.emit('updateProjectHistory', data.toString());
		});
	});
	
	socket.on('registerProjectHistory', function (path) {
		console.log("REGISTER_HISTORY:" + path);
		fs.readFile(historyFile, function (err, data) {
			var names = path.split("/"),
				name = names[names.length - 1];
			var i;
			console.log("ProjName=" + name);
			if (err) {
				console.log('Error: ' + err);
				data = [];
				data.push({"name": name, "path": path});
			} else {
				data = JSON.parse(data);
				// remove same entry
				for (i = data.length-1; i >= 0; --i) {
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
}


// socket.io setting
var io = require('socket.io').listen(server);
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
	"use strict";
	socket.emit('event', 'Server Connected.');
	console.log("[CONNECT] ID=" + socket.id);

	RemoteFTP(socket);
	editorevent.registerEditorEvent(socket, appCommands, appExtensions);
	remotehostevent.registerEditorEvent(socket);
	registerPTLEvent(socket);
});