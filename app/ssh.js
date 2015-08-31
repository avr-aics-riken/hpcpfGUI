/*jslint devel:true, node:true, nomen:true */

(function () {
	"use strict";
	var fs = require('fs'),
		ssh2 = require('ssh2'),
		exec = require('child_process').exec,
		path = require('path'),
		readline = require('readline'),
		os = require('os'),
		crypto = require('crypto'),
		excludePath = require('./js/exclude_path'),
		ftparray = {},
		localCmd,
		remoteCmd,
		LFTPClass,
		SFTPClass;

	function decrypt(text, key) {
		var decipher = crypto.createDecipher('aes-256-ctr', key),
			dec = decipher.update(text, 'hex', 'utf8');
		dec += decipher.final('utf8');
		return dec;
	}

	/*
	 * local command
	 */
	localCmd = function (cmd, callback) {
		var child = exec(cmd,
			(function (cb) {
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

	/*
	 * Remote server is linux, macosx.
	 * requires file commands.[cp,mv,tar,...]
	 */
	remoteCmd = function (conn, cmd, callback, dataCallback) {
		conn.exec(cmd, (function (cb, dataCallback) {
			return function (err, stream) {
				//console.log('REMOTE CMD>' + cmd);
				if (err) {
					console.log(err);
				}
				stream.on('close', function (code, signal) {
					//console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
					conn.end();
				}).on('end', function () {
					if (callback) {
						callback(err);
					}
				}).on('data', function (data) {
					if (dataCallback) {
						dataCallback(data.toString());
					}
				});
			};
		}(callback, dataCallback)));
	};

	LFTPClass = function () {
		this.LocalCommand = function (command, callback) {
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}
			// console.log('LocalCommand>', command);
			localCmd(this.conn, command, callback);
		};

		this.errorLog = function (msg, callback) {
			console.log(msg);
			callback(msg);
		};

		this.Disconnect = function () {
			console.log('This is local session. no need to disconnect.');
		};

		this.Connect = function (args) {
			// nothing to do.
			console.log('This is local session. no need to connect.');
		};

	}; // LFTPClass

	SFTPClass = function () {
		var conn = new ssh2();
		this.conn = conn;
		this.sftp = null;
		this.isConnected = false;

		this.errorLog = function (msg, callback) {
			console.log(msg);
			callback(msg);
		};

		this.Disconnect = function () {
			this.sftp = null;
			this.conn.end();
			this.isConnected = false;
		};

		this.UploadFile = function (local_path, tar_path, callback) {
			var sftp = this.sftp,
				tempDir,
				readStream,
				writeStream;

			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}

			if (!fs.existsSync(local_path)) {
				this.errorLog('not found path>' + local_path, callback);
				return;
			}
			// upload file
			readStream = fs.createReadStream(local_path);
			writeStream = this.sftp.createWriteStream(tar_path);

			// what to do when transfer finishes
			writeStream.on('close', (function (self) {
				return function () {
					console.log("- file transferred");
					//this.sftp.end(); // no need?
					if (callback) {
						callback();
					}
					process.exit();
				};
			}(this)));

			// initiate transfer of file
			readStream.pipe(writeStream);
		};

		this.DownloadFile = function (tar_path, local_path, callback) {
			var sftp = this.sftp,
				downloadFile;
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}

			downloadFile = function (self, local_path, tar_path, callback) {
				var writeStream = fs.createWriteStream(local_path),
					readStream = self.sftp.createReadStream(tar_path);

				// what to do when transfer finishes
				readStream.on('close', function () {
					console.log("- file transferred");
					if (callback) {
						callback();
					}
					process.exit();
				});

				// initiate transfer of file
				readStream.on('error', (function (thisptr, tar_path, callback) {
					return function (e) {
						thisptr.errorLog('Faild to download. Failed to read file:' + tar_path + e, callback);
						process.exit();
						return;
					};
				}(self, tar_path, callback)));
				writeStream.on('error', (function (thisptr, local_path, callback) {
					return function (e) {
						thisptr.errorLog('Faild to download. Failed to write file:' + local_path + e, callback);
						process.exit();
						return;
					};
				}(self, local_path, callback)));
				readStream.pipe(writeStream);
			};

			sftp.stat(tar_path, (function (self, local_path, tar_path, callback) {
				return function (err, stats) {
					// download file
					downloadFile(self, local_path, tar_path, callback);
				};
			}(this, local_path, tar_path, callback)));
		};

		this.RemoteCommand = function (command, callback, dataCallback) {
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}
			//console.log('RemoteCommand>', command);
			remoteCmd(this.conn, command, callback, dataCallback);
		};

		this.Connect = function (args, callback) {
			conn.on('connect', function () {
				//console.log("- connected");
			});
			conn.on('ready', (function (self, cback) {
				return function () {
					//console.log("- ready");
					conn.sftp(function (err, sftp) {
						if (err) {
							console.log("Error, problem starting SFTP Error: %s", err);
							process.exit(2);
						}
						//console.log("- SFTP started");
						self.sftp = sftp;

						self.isConnected = true;
						if (cback) {
							cback(null);
						}
					});
				};
			}(this, callback)));

			conn.on('keyboard-interactive', function redo(name, instructions, instructionsLang, prompts, finish, answers) {
				console.log("keyboardinteractive");
				if (args.hasOwnProperty('password')) {
					finish([args.password]);
				} else {
					finish([]);
				}
			});

			conn.on('error', function (err) {
				console.log("- connection error: %s", err);
				if (callback) {
					callback("- connection error: " + err.toString());
				}
			});
			conn.on('close', function (had_error) {
				//console.log('Connection close');
				process.exit();
			});
			conn.on('end', function () {
				//console.log('End remote session.');
			});

			try {
				conn.connect(args);
			} catch (e) {
				console.log("Failed to connect server.[SSH2]");
				if (callback) {
					callback(e);
				}
			}
		};

	}; // SFTPClass

	/**
	 * tempPath temporary file path for auth
	 * key for auth
	 * commandStr 'ssh' or 'sftpget' or 'sftpsend'
	 */
	function sendCommand(commandName, tempPath, key, hostType, commandStr, targetPath, port) {
		//console.log("connecting..", commandName, "\r\n");
		var data = {
				cid : hostType
			},
			info,
			sfc = null,
			isUsePassword = false,
			file,
			parsed;


		if (data.cid === '') {
			console.log('Error: cid parameter. must set unique id.');
			return;
		}

		file = fs.readFileSync(tempPath);
		//console.log(file);
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
			if (port !== undefined && port) {
				info.port = port;
			}
		}

		//console.log("-----------------------------------------\n");
		//console.log(info);
		//console.log("-----------------------------------------\n");

		if (!info.hasOwnProperty('type')) {
			console.log(data.cid, 'Invalid host type');
			//errorMessage(data.cid, 'Invalid host type');
			return;
		}

		if (info.hasOwnProperty('usepassword')) {
			isUsePassword = info.usepassword;
			delete info.usepassword;
		}

		//console.log("isUsePassword", isUsePassword);

		if (info.type === 'local') {
			//console.log('RFTP:Local Connection:id=' + data.cid);
			sfc = new LFTPClass();
			ftparray[data.cid] = sfc;
			//connectedMessage(data.cid, "Local mode : connection success", info.host, info.path);
		} else {
			//console.log('RFTP:Remote Connection:id=' + data.cid);
			sfc = new SFTPClass();

			try {
				if (isUsePassword) {
					// password authoricaiton
					if (info.hasOwnProperty('privateKeyFile')) {
						delete info.privateKeyFile;
					}
					if (info.hasOwnProperty('passphrase')) {
						delete info.passphrase;
					}
					info.tryKeyboard = true;
				} else {
					// load private key
					if (info.hasOwnProperty('password')) {
						delete info.password;
					}
					if (info.hasOwnProperty('privateKeyFile')) {
						info.privateKey = fs.readFileSync(info.privateKeyFile);
					}
				}
			} catch (ee) {
				console.log(data.cid, "Failed read SSH key file:" + info.privateKeyFile);
				//errorMessage(data.cid, "Failed read SSH key file:" + info.privateKeyFile);
				return;
			}

			sfc.Connect(info, (function (data, sfc) {
				return function (err) {
					if (err) {
						console.log(data.cid, "Connection Failed " + err);
						//errorMessage(data.cid, "Connection Failed " + err);
						return;
					}
					//console.log(data.cid, "Remote mode : connection success", info.host, info.path);
					//connectedMessage(data.cid, "Remote mode : connection success", info.host, info.path);
					ftparray[data.cid] = sfc;

					if (commandName === 'ssh') {
						sfc.RemoteCommand(commandStr, function (err) {
							if (err) {
								console.log("Error:", err);
							}
						}, function (data) {
							console.log(data);
						});
					} else if (commandName === 'sftpget') {
						sfc.DownloadFile(commandStr, targetPath, function (err) {
							if (err) {
								console.log("Error:", err);
							}
						});
					} else if (commandName === 'sftpsend') {
						sfc.UploadFile(commandStr, targetPath, function (err) {
							if (err) {
								console.log("Error:", err);
							}
						});
					}
				};
			}(data, sfc)));
		}
	}

	if (process.argv.length > 3) {
		if (process.argv.length === 8) {
			//console.log("run sftp\r\n");
			// sendCommand(commandName, tempPath, key, hostType, srcPath, dstPath, port:option )
			sendCommand(process.argv[2], process.argv[3], process.argv[4], process.argv[5], process.argv[6], process.argv[7], process.argv[8]);
		} else if (process.argv.length === 7) {
			//console.log("run ssh\r\n");
			// sendCommand(commandName, tempPath, key, hostType, commandStr)
			sendCommand(process.argv[2], process.argv[3], process.argv[4], process.argv[5], process.argv[6], "", process.argv[7]);
		}
	}
}());
