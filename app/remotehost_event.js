/*jslint devel:true, node:true, nomen:true */
/*global require, global, $, io, socket, FileDialog, RemoteFTP */

var fs = require('fs'),
	regFile = '../conf/targetconf.json';

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
			if (host.hasOwnProperty('hpcpf') && host.hpcpf.hasOwnProperty('targets')) {
				host = host.hpcpf.targets;
			
				console.log("host", host);
				for (k = 0; k < host.length; k = k + 1) {
					if (host[k]) {
						if (host[k].userid === undefined) {
							list.push({name_hr : host[k].name_hr, server : host[k].server, userid : ""});
						} else {
							list.push({name_hr : host[k].name_hr, server : host[k].server, userid : host[k].userid});
						}
					}
				}
				socket.emit('updateRemoteHostList', JSON.stringify(list));
			}
		};
	}(socket)));
}

function registerEditorEvent(socket) {
	"use strict";
	socket.on('REMOTEHOST:DELHOST', function (data) {
		console.log("DEL>" + data.name_hr);
		fs.readFile(regFile, function (err, filebuf) {
			var host,
				targets,
				jslist,
				k,
				prettyprintFunc = function (key, val) { return val;	},
				writeEndFunc = function (err) {
					if (err) {
						console.log(err);
						return;
					}
					updateHostList(socket);
				};
			
			if (err) {
				console.log(err);
				return;
			}
			host = JSON.parse(filebuf.toString());
			if (host.hasOwnProperty('hpcpf') && host.hpcpf.hasOwnProperty('targets')) {
				targets = host.hpcpf.targets;
				
				for (k = 0; k < targets.length; k = k + 1) {
					if (targets[k].name_hr === data.name_hr) {
						delete targets[k];
						
						jslist = JSON.stringify(host, prettyprintFunc, "    ");
						
						fs.writeFile(regFile, jslist, writeEndFunc);
						break;
					}
				}
			}
		});
	});
	socket.on('REMOTEHOST:REQHOSTINFO', function (data) {
		console.log(data);
		console.log("REQHOST>" + data.name_hr);
		fs.readFile(regFile, function (err, filebuf) {
			var host,
				k,
				hst;
			console.log("filebuf", filebuf.toString());
			if (err) {
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			if (host.hasOwnProperty('hpcpf') && host.hpcpf.hasOwnProperty('targets')) {
				host = host.hpcpf.targets;
				for (k = 0; k < host.length; k = k + 1) {
					if (host[k].name_hr === data.name_hr) {
						hst = host[k];
						console.log("hst", hst);
						socket.emit('updateRemoteInfo', JSON.stringify({
							name_hr : data.name_hr,
							server : hst.server,
							workpath : hst.workpath,
							userid : hst.userid,
							sshkey : hst.sshkey
						}));
					}
				}
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
				targets,
				type,
				jslist,
				hst = null,
				k;
			if (err) {
				console.log(err);
				host = {};
			} else {
				host = JSON.parse(filebuf.toString());
			}
			if (host.hasOwnProperty('hpcpf') && host.hpcpf.hasOwnProperty('targets')) {
				targets = host.hpcpf.targets;
				for (k = 0; k < targets.length; k = k + 1) {
					if (targets[k].name_hr === data.name_hr) {
						console.log('already server');
						hst = targets[k];
					}
				}
			}
			
			if (!hst) {
				hst = {};
				targets.push(hst);
			}

			//console.log(data);
			type = (data.server === 'localhost' ? 'local' : 'remote');
			if (type === 'local') {
				hst.type = type;
				hst.name_hr = data.name_hr;
				hst.server = data.server;
				hst.userid = "";
				hst.workpath = data.workpath;
			} else {
				hst.type = type;
				hst.name_hr = data.name_hr;
				hst.server = data.server;
				hst.userid = data.userid;
				hst.workpath = data.workpath;
				if (data.hasOwnProperty('sshkey')) {
					hst.sshkey = data.sshkey;
					hst.passphrase = data.passphrase;
				} else {
					hst.password = data.password;
				}
			}
			
			jslist = JSON.stringify(host, function (key, val) { return val;	}, "    ");
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
