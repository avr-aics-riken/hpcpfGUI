var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var http = require('http');

var util = require('./util');

var editorevent = require('./editor_event');
var remotehostevent = require('./remotehost_event');

var filedialog= require('./js/filedialog');
var RemoteFTP = require('./js/RemoteFTP');

//-------------------------------------
// Server request logic
//-------------------------------------
var server = http.createServer();
server.on('request', function(req,res){
	console.log("REQ>"+req.url);
	
	var url = req.url;
	var addrs = req.url.split("?");
	if (addrs)
		url = addrs[0]; // ignore args

	if (url == '/') {
		var html = fs.readFileSync('./home.html');
		res.writeHead(200,{'Content-Type':'text/html', charaset:'UTF-8'});
		res.end(html);
	} else {
		fs.readFile('.' + url, function (err,data){
			if (err) {
				res.writeHead(404,{'Content-Type':'text/html', charaset:'UTF-8'});
				res.end("<h1>not found<h1>");
				return;
			}
			var ext = util.getExtention(url);
			if (ext == "css")
				res.writeHead(200,{'Content-Type':'text/css',charaset:'UTF-8'});
			else if (ext == "html" || ext == "htm")
				res.writeHead(200,{'Content-Type':'text/html',charaset:'UTF-8'});
			else if (ext == "js" || ext == "json")
				res.writeHead(200,{'Content-Type':'text/javascript',charaset:'UTF-8'});
			else
				res.writeHead(200);//,{charaset:'UTF-8'});
			res.end(data);
		}); // fs.readFile
	}
});
server.listen(8080);
console.log('Server running on localhost:8080')

//---------------------------------------------------------------------------

function registerPTLEvent(socket)
{
	socket.on('ptl_launchapp', function(data) {
		console.log("ptl_launchapp:" + data.appname);
		
		var appcmd;
		if (data.appname == 'FXgen')
			appcmd = 'open /Applications/FXgen.app';
		else if(data.appname == 'PDI')
			appcmd = 'pdi';
		
		var child = exec(appcmd, function(err, stdout, stderr) {
			if (err) {
				console.log(err);
				console.log(err.code);
				console.log(err.signal);
			} else {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr)
			}
		});
	});// ptl_launchapp
	
	filedialog.SocketEvent(socket,'homedlg');
	filedialog.SocketEvent(socket,'remotedlg');

	socket.on('registerProjectHistory', function(path){
		console.log("REGISTER_HISTORY:"+path);
		var historyFile = "project_history.json";
		fs.readFile(historyFile, function(err,data){
			var names = path.split("/");
			var name = names[names.length-1];
			console.log("ProjName="+name);
			if (err) {
				console.log('Error: ' + err);
				data = new Array();
				data.push({"name":name, "path":path});
			} else {
				data = JSON.parse(data);
				data.splice(0, 0,{"name":name, "path":path}); // Add first
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
	socket.emit('event', 'Server Connected.');
	console.log("[CONNECT] ID="+socket.id);

	RemoteFTP(socket);
	editorevent.registerEditorEvent(socket);
	remotehostevent.registerEditorEvent(socket);
	registerPTLEvent(socket);
});