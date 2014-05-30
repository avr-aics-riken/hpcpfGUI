var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var http = require('http');
var os = require('os');
var util = require('./util');

// MacOSX setting
var KRENDER_CMD = __dirname+'/krender_mac';
var LUA_CMD     = __dirname+'/lua_mac';

if (os.platform() === 'linux'){ // Linux setting
    KRENDER_CMD = __dirname+'/krender_linux';
    LUA_CMD = 'lua'; // Use system command
}else if (os.platform().indexOf('win') === 0){ // win setting
    KRENDER_CMD = __dirname+'/krender.exe';
    LUA_CMD = __dirname+'/lua.exe';
}


var SH_CMD = 'sh'


var sesstionTable = {};

function registerEditorEvent(socket)
{
	var def_srcdir = __dirname;// + '/work/'
	console.log('Working Dir='+def_srcdir);

	sesstionTable[socket.id] = {"dir":def_srcdir, "proc":null}
	
	socket.on('disconnect', function() {
		console.log("[DISCONNECT] ID="+socket.id);
		if (sesstionTable[socket.id].proc) {
			KillSpawn(sesstionTable[socket.id].proc);
		}
		delete sesstionTable[socket.id];
	});
	function updateFileList(path)
	{
		var list=[];
		util.getFiles(path, list);
		if (list.length != 0)
			socket.emit('updatefilelist', JSON.stringify(list));
	}
	socket.on('setWorkingPath', function(data){
		var path = data.path.toString();
		if (path.substr(path.length - 1) != "/")
			path += "/";
		sesstionTable[socket.id].dir = path;
		updateFileList(path);
	});
	socket.on('reqFileList', function(data) {
		var srcdir = sesstionTable[socket.id].dir;
		updateFileList(srcdir);
	});
	socket.on('reqFileOpen', function(data) {
		var srcdir = sesstionTable[socket.id].dir;
		var ext = util.getExtention(data);
		var filebuf = fs.readFileSync(srcdir+data);
		if (ext === "lua" || ext === "scn" || ext === "pwl" || ext === "cwl")
			socket.emit('showfile',{str:filebuf.toString(), type:"lua"});
		else if (ext === "sh" || ext === "pwf" || ext === "cwf")
			socket.emit('showfile',{str:filebuf.toString(), type:"sh"});
		else if (ext === "json" || ext === "pif" || ext === "cif")
			socket.emit('showfile',{str:filebuf.toString(), type:"json"});
		else if (ext === "frag")
			socket.emit('showfile',{str:filebuf.toString(), type:"glsl"});
		else if (ext === "jpg" || ext === "tga" || ext === "png"){
			var prefix;
				if      (ext==="jpg") prefix = 'data:image/jpeg;base64,';
				else if (ext==="tga") prefix = 'data:image/tga;base64,';
				else if (ext==="png") prefix = 'data:image/png;base64,';
				var base64 = new Buffer(filebuf, 'binary').toString('base64');
				var imgdata = prefix + base64;
				//socket.send(data);
				socket.emit('showfile_image',imgdata);
		}else
			socket.emit('showfile',{str:filebuf.toString(), type:""});
	});
	socket.on('reqFileSave', function(data) {
		//console.log(data.file);
		var srcdir = sesstionTable[socket.id].dir;
		fs.writeFile(srcdir+data.file, data.data, function (err) {
			if (err) throw err;
			console.log('It\'s saved!');
		});
	});
	function KillSpawn(sp){
		if (os.platform() === 'darwin' || os.platform() === 'linux') {
			var pid = sp.pid;
			console.log('processID='+pid);
			console.log('sh killthem.sh '+pid);
			exec('sh killthem.sh '+pid, function(error, stdout, stderr) {
				console.log('killed childs');
				console.log(error, stdout, stderr);
			});
		} else {
			sp.kill();
		}
	}
	socket.on('stop', function(data) {
		var processspawn = sesstionTable[socket.id].proc;
		if (!processspawn)
			return;
		console.log('kill');
		KillSpawn(processspawn);
		sesstionTable[socket.id].proc = null;
	});
	socket.on('run', function(data) {
		var srcdir = sesstionTable[socket.id].dir;
		var processspawn = sesstionTable[socket.id].proc;
		console.log("runFile>"+data.file);
		if (processspawn) {
			KillSpawn(processspawn);
			sesstionTable[socket.id].proc = null;
		}
		
		var ext = util.getExtention(data.file);
		console.log("EXT="+ext);
		if (ext === "lua" || ext === "pwl" || ext === "cwl") {
			processspawn = spawn(LUA_CMD,[data.file],{cwd:srcdir});
		}else if (ext === "sh" || ext === "pwf" || ext === "cwf") {
			processspawn = spawn(SH_CMD,[data.file],{cwd:srcdir});
		} else if (ext === "scn"){
			console.log("KR:"+KRENDER_CMD+" / scn path="+srcdir+data.file);
			processspawn = spawn(KRENDER_CMD,[srcdir+data.file], function(err,stdout,stderr) {
				if (!err) return;
				console.log('Failed run krender.');
				sesstionTable[socket.id].proc = null;
			});
		} else if (ext === "frag"){
			if (!process.env.GLSL_COMPILER){
				console.log("can't find GLSL_COMPILER");
				socket.emit('stderr', "can't find GLSL_COMPILER");
				return;
			}
			var sfile = srcdir+data.file;
			var ofile = srcdir+data.file;
			ofile = ofile.substr(0,ofile.length - 4) + "so";
			console.log("Target SO:"+ofile);
			processspawn = spawn(process.env.GLSL_COMPILER,['-o',ofile, sfile], function(err,stdout,stderr) {
				if (!err) return;
				console.log('Failed run glslc.');
				sesstionTable[socket.id].proc = null;
			});
		}
		sesstionTable[socket.id].proc = processspawn;
		if (processspawn) {
			processspawn.stdout.on('data', function(data) {
				console.log('stdout: ' + data);
				socket.emit('stdout',data.toString());
			});
			processspawn.stderr.on('data', function(data) {
				console.log('stderr: ' + data);
				socket.emit('stderr',data.toString());
			});
			processspawn.on('exit', function(code) {
				console.log('exit code: ' + code);
				updateFileList(srcdir);
			});
			processspawn.on('error', function (err) {
				console.log('process error', err);
				socket.emit('stderr',"can't execute program\n");
			});
		} else {
			socket.emit('stdout','Unknown file type. -> ' + data.file);
		}
	});
}


module.exports.registerEditorEvent = registerEditorEvent;
