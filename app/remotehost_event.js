var fs = require('fs')
var regFile = '../conf/registered_host.json';

function updateHostList(socket){
	fs.readFile(regFile,function(socket){return function(err,filebuf){
		var host;
		if (err){
			console.log(err);
			host = {}
		} else {
			host = JSON.parse(filebuf.toString());
		}
		var list = new Array();
		for(var k in host){
			list.push({name:k, hostname:host[k].host, username:host[k].username});
		}
		socket.emit('updateRemoteHostList', JSON.stringify(list));
	}}(socket));
}

function registerEditorEvent(socket)
{
	socket.on('REMOTEHOST:DELHOST',function(data){
		console.log("DEL>"+data.hostname);
		fs.readFile(regFile,function(err,filebuf){
			if (err){
				console.log(err);
				return;
			}
			var host = JSON.parse(filebuf.toString());

			if (host[data.hostname]) {
				delete host[data.hostname];
				
				var jslist = JSON.stringify(host);
				fs.writeFile(regFile, jslist,function(err){
					if (err){
						console.log(err);
						return;
					}
					updateHostList(socket);
				});
			}
		});
	});
	socket.on('REMOTEHOST:REQHOSTINFO',function(data){
		console.log("REQHOST>"+data.hostname);
		fs.readFile(regFile,function(err,filebuf){
			var host;
			if (err){
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			if (host[data.hostname]) {
				var hst = host[data.hostname];
				socket.emit('updateRemoteInfo',JSON.stringify({
					label:data.hostname,
					host : hst.host,
					path : hst.path,
					username : hst.username,
					privateKeyFile : hst.privateKeyFile,
					usepassword : hst.usepassword
				}));
			}
		});
	});
	socket.on('REMOTEHOST:reqHostList',function(data){
		updateHostList(socket);
	});
	socket.on('REMOTEHOST:AddHost',function(sdata){
		var data = JSON.parse(sdata);
		
		fs.readFile(regFile,function(err,filebuf){
			var host
			if (err){
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			
			if (host[data.name]) {
				console.log('already hostname');
			}
			
			//console.log(data);
			var type = (data.hostname == 'localhost' ? 'local' : 'remote');
			if (type == 'local') {
				host[data.name] = {
					"type": type,
					"host": data.hostname,
					"username": "",
					"path":data.path
				};
			} else {
				host[data.name] = {
					"type" : type,
					"host" : data.hostname,
					"username" : data.username,
					"privateKeyFile" : data.sshkey,
					"path" : data.path,
					"passphrase" : data.passphrase,
					"password" : data.password,
					"usepassword" : data.usepassword
				};
			}
			
			var jslist = JSON.stringify(host);
			fs.writeFile(regFile, jslist,function(err){
				if (err){
					console.log(err);
					return;
				}
				updateHostList(socket);//socket.emit('updateRemoteHostList', JSON.stringify(makeHostList(jslist)));
			});
		});
	});
}

module.exports.registerEditorEvent = registerEditorEvent;