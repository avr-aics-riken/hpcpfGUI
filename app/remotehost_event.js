/*jslint devel:true, node:true, nomen:true */
/*global require, global, $, io, socket, FileDialog, RemoteFTP */

var fs = require('fs'),
	regFile = '../conf/registered_host.json';

function updateHostList(socket) {
	"use strict";
	fs.readFile(regFile, (function (socket) {
		return function (err, filebuf) {
			var host,
				list = [],
				k;
			if (err) {
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			for (k in host) {
				if (host.hasOwnProperty(k)) {
					list.push({name : k, hostname : host[k].host, username : host[k].username});
				}
			}
			socket.emit('updateRemoteHostList', JSON.stringify(list));
		};
	}(socket)));
}

function registerEditorEvent(socket) {
	"use strict";
	socket.on('REMOTEHOST:DELHOST', function (data) {
		console.log("DEL>" + data.hostname);
		fs.readFile(regFile, function (err, filebuf) {
			var host,
				jslist;
			if (err) {
				console.log(err);
				return;
			}
			host = JSON.parse(filebuf.toString());

			if (host[data.hostname]) {
				delete host[data.hostname];
				
				jslist = JSON.stringify(host);
				fs.writeFile(regFile, jslist, function (err) {
					if (err) {
						console.log(err);
						return;
					}
					updateHostList(socket);
				});
			}
		});
	});
	socket.on('REMOTEHOST:REQHOSTINFO', function (data) {
		console.log("REQHOST>" + data.hostname);
		fs.readFile(regFile, function (err, filebuf) {
			var host,
				hst;
			if (err) {
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			if (host[data.hostname]) {
				hst = host[data.hostname];
				socket.emit('updateRemoteInfo', JSON.stringify({
					label : data.hostname,
					host : hst.host,
					path : hst.path,
					username : hst.username,
					privateKeyFile : hst.privateKeyFile,
					usepassword : hst.usepassword
				}));
			}
		});
	});
	socket.on('REMOTEHOST:reqHostList', function (data) {
		updateHostList(socket);
	});
	socket.on('REMOTEHOST:AddHost', function (sdata) {
		var data = JSON.parse(sdata);
		
		fs.readFile(regFile, function (err, filebuf) {
			var host,
				type,
				jslist;
			if (err) {
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			
			if (host[data.name]) {
				console.log('already hostname');
			}
			
			//console.log(data);
			type = (data.hostname === 'localhost' ? 'local' : 'remote');
			if (type === 'local') {
				host[data.name] = {
					"type": type,
					"host": data.hostname,
					"username": "",
					"path" : data.path
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
			
			jslist = JSON.stringify(host);
			fs.writeFile(regFile, jslist, function (err) {
				if (err) {
					console.log(err);
					return;
				}
				updateHostList(socket);//socket.emit('updateRemoteHostList', JSON.stringify(makeHostList(jslist)));
			});
		});
	});
}

module.exports.registerEditorEvent = registerEditorEvent;
