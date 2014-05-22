var exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	fs = require('fs'),
	http = require('http'),
	util = require('./util'),
	os = require('os'),
	editorevent = require('./editor_event'),
	remotehostevent = require('./remotehost_event'),
	filedialog = require('./js/filedialog'),
	RemoteFTP = require('./js/RemoteFTP'),
	
	confFile = __dirname + '/../conf/hpcpfGUI.conf',
	portNumber      = 8080,
	appCommandFXgen = 'FXgen',
	appCommandPDI   = 'pdi',
	appCommandKVTools = 'kvtoolsa';
	

try {
	console.log('confFile = ' + confFile);
	var ostype = os.platform(),
		file = fs.readFileSync(confFile),
		data = JSON.parse(file);
	portNumber        = data.port;
	
	console.log('OS = ' + ostype);
	appCommandFXgen   = data.FXgen[ostype];
	appCommandPDI     = data.PDI[ostype];
	appCommandKVTools = data.KVTools[ostype];
	
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
		
		var appcmd, child;
		if (data.appname === 'FXgen') {
			appcmd = appCommandFXgen;
		} else if (data.appname === 'PDI') {
			appcmd = appCommandPDI;
		} else if (data.appname === 'KVTools') {
			appcmd = appCommandKVTools;
		}
		
		console.log('CMD>' + appcmd, appCommandKVTools);
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

	socket.on('registerProjectHistory', function (path) {
		console.log("REGISTER_HISTORY:" + path);
		var historyFile = "project_history.json";
		fs.readFile(historyFile, function (err, data) {
			var names = path.split("/"),
				name = names[names.length - 1];
			console.log("ProjName=" + name);
			if (err) {
				console.log('Error: ' + err);
				data = [];
				data.push({"name": name, "path": path});
			} else {
				data = JSON.parse(data);
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
	editorevent.registerEditorEvent(socket);
	remotehostevent.registerEditorEvent(socket);
	registerPTLEvent(socket);
});