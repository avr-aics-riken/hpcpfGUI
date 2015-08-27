/*jslint devel:true, node:true, nomen:true */

(function () {
	"use strict";
	var fs = require('fs'),
		exec = require('child_process').exec,
		path = require('path'),
		os = require('os'),
		crypto = require('crypto'),
		spawn = require('child_process').exec,
		ftparray = {},
		localCmd,
		remoteCmd;

	function decrypt(text, key) {
		var decipher = crypto.createDecipher('aes-256-ctr', key),
			dec = decipher.update(text, 'hex', 'utf8');
		dec += decipher.final('utf8');
		return dec;
	}

	function sshpass(tempPath, hostType, key, cmd) {
		var file = fs.readFileSync(tempPath),
			parsed,
			info,
			proc;
		
		parsed = JSON.parse(file);
		if (parsed.hasOwnProperty(hostType)) {
			info = parsed[hostType];
			info.usepassword = !info.hasOwnProperty('sshkey');
			info.host = info.server;
			info.path = info.workpath;
			info.username = info.userid;
			delete info.server;
			if (info.hasOwnProperty('password')) {
				info.password = decrypt(info.password, key);
			} else if (info.hasOwnProperty('passphrase')) {
				info.passphrase = decrypt(info.passphrase, key);
			}
			if (info.hasOwnProperty('sshkey')) {
				info.privateKeyFile = info.sshkey;
			}
		}
		
		//console.log(path.join(__dirname, '/sshpass_mac'), [ '-p', info.password, cmd.split('\'').join('') ]);
		proc = spawn(path.join(__dirname, '/sshpass_mac '  + cmd.split('\'').join('')));
		proc.stdin.setEncoding = 'utf-8';
		proc.stdout.pipe(process.stdout);
		
		if (info.hasOwnProperty('password')) {
			//console.log("hogehogehoge");
			proc.stdin.write(info.password + '\n');
		} else if (info.hasOwnProperty('passphrase')) {
			//console.log("hogehogehoge");
			proc.stdin.write(info.passphrase + '\n');
		}
		proc.stdout.on('data', function (data) {
			console.log('stdout:' + data);
		});
		proc.stderr.on('data', function (data) {
			console.log('stderr: ' + data);
		});
		proc.on('exit', function (code) {
			console.log('child process exited with code ' + code);
		});
	}
	
	if (process.argv.length > 3) {
		//console.log("------------\n");
		sshpass(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
		/*
		setTimeout(function () {
			console.log("hoge");
		}, 1000 * 3);
		*/
	}
}());
