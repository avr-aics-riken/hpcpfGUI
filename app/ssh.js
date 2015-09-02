/*jslint devel:true, node:true, nomen:true */

(function () {
	"use strict";
	var fs = require('fs'),
		ssh2 = require('ssh2'),
		exec = require('child_process').exec,
		path = require('path'),
		net = require('net'),
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

	function sendForwardCommand(param, info) {
		var targetInfo = null,
			stepConn = null,
			stepServer = null;

		try {
			targetInfo = JSON.parse(param.targetInfo);
			if (targetInfo.port === undefined || !targetInfo.port) {
				targetInfo.port = 22;
			}
			if (targetInfo.privateKey) {
				targetInfo.privateKey = fs.readFileSync(targetInfo.privateKey);
				delete targetInfo.password;
			}
		} catch (e) {
			console.error(e);
			return;
		}
		
		if (info.port === undefined || !info.port) {
			info.port = 22;
		}
		
		//console.log(info, targetInfo);
		
		stepConn = new ssh2();
		stepConn.on('ready', (function (info, targetInfo) {
			return function () {
				var forwardLogin = {
					host : targetInfo.host
				};
				if (info.user) {
					forwardLogin.user = info.user;
				}
				if (info.port) {
					forwardLogin.port = info.port;
				}
				if (info.path) {
					forwardLogin.path = info.path;
				}
				if (info.password) {
					forwardLogin.password = info.password;
				}
				if (info.passphrase) {
					forwardLogin.passphrase = info.passphrase;
				}
				if (info.privateKey) {
					forwardLogin.privateKey = info.privateKey;
				}
				
				if (targetInfo.user) {
					forwardLogin.user = targetInfo.user;
				}
				if (targetInfo.port) {
					forwardLogin.port = targetInfo.port;
				}
				if (targetInfo.path) {
					forwardLogin.path = targetInfo.path;
				}
				if (targetInfo.password) {
					forwardLogin.password = targetInfo.password;
				}
				if (targetInfo.passphrase) {
					forwardLogin.passphrase = targetInfo.passphrase;
				}
				if (targetInfo.privateKey) {
					forwardLogin.privateKey = targetInfo.privateKey;
				}
				
				//console.log("forwardLogin", forwardLogin);
				
				stepServer = net.createServer(function (sock) {
					// console.log(param.stepServer, sock.remotePort, info.host, info.port);
					stepConn.forwardOut(info.host, sock.remotePort, targetInfo.host, targetInfo.port, function (err, stream) {
						if (err) {
							console.log('Error forwarding connection: ' + err);
							return sock.end();
						}
						sock.pipe(stream).pipe(sock);
					});
				});
				stepServer.listen(forwardLogin.port, function () {
					console.log('Forwarding connections on ' + forwardLogin.port + ' to ' + targetInfo.host + ':' + targetInfo.port);
					
					var sfc = new SFTPClass();
					sfc.Connect(forwardLogin, (function (sfc) {
						return function (err) {
							if (err) {
								console.log("Connection Failed " + err);
								return;
							}
							if (param.commandName === 'sshforward') {
								sfc.RemoteCommand(param.commandStr, function (err) {
									if (err) {
										console.log("Error:", err);
									}
								}, function (data) {
									console.log(data);
								});
							} else if (param.commandName === 'sftpgetforward') {
								sfc.DownloadFile(param.srcPath, param.dstPath, function (err) {
									if (err) {
										console.log("Error:", err);
									}
								});
							} else if (param.commandName === 'sftpsendforward') {
								sfc.UploadFile(param.srcPath, param.dstPath, function (err) {
									if (err) {
										console.log("Error:", err);
									}
								});
							}
						};
					}(sfc)));
				});
			};
		}(info, targetInfo))).on('close', function () {
			if (stepServer) {
				stepServer.close();
			}
		}).connect(info);
	}

	/**
	 * tempPath temporary file path for auth
	 * key for auth
	 * commandStr 'ssh' or 'sftpget' or 'sftpsend'
	 */
	function sendCommand(param) {
		//console.log("connecting..", param.commandName, "\r\n");
		var data = {
				cid : param.hostType
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

		try {
			file = fs.readFileSync(param.tempPath);
			parsed = JSON.parse(file);
		} catch (e) {
			console.error(e);
			return;
		}
		if (parsed.hasOwnProperty(param.hostType)) {
			info = parsed[param.hostType];
			info.usepassword = !info.hasOwnProperty('sshkey');
			info.host = info.server;
			info.path = info.workpath;
			info.username = info.userid;
			info.readyTimeout = 99999;
			delete info.server;
			if (info.hasOwnProperty('password')) {
				info.password = decrypt(info.password, param.key);
			} else if (info.hasOwnProperty('passphrase')) {
				info.passphrase = decrypt(info.passphrase, param.key);
			}
			if (info.hasOwnProperty('sshkey')) {
				info.privateKeyFile = info.sshkey;
			}
			if (param.hasOwnProperty('port') && param.port !== 'undefined' && param.port) {
				info.port = param.port;
			} else {
				info.port = 22;
			}
		}

		if (!info.hasOwnProperty('type')) {
			console.log(data.cid, 'Invalid host type');
			//errorMessage(data.cid, 'Invalid host type');
			return;
		}

		if (info.hasOwnProperty('usepassword')) {
			isUsePassword = info.usepassword;
			delete info.usepassword;
		}

		if (info.type === 'local') {
			sfc = new LFTPClass();
			ftparray[data.cid] = sfc;
		} else {

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
				return;
			}

			if (param.commandName === 'sshforward' || param.commandName === 'sftpsendforward' || param.commandName === 'sftpgetforward') {
				sendForwardCommand(param, info);
			} else {
				sfc = new SFTPClass();
				sfc.Connect(info, (function (data, sfc) {
					return function (err) {
						if (err) {
							console.log(data.cid, "Connection Failed " + err);
							return;
						}
						ftparray[data.cid] = sfc;

						if (param.commandName === 'ssh') {
							sfc.RemoteCommand(param.commandStr, function (err) {
								if (err) {
									console.log("Error:", err);
								}
							}, function (data) {
								console.log(data);
							});
						} else if (param.commandName === 'sftpget') {
							sfc.DownloadFile(param.srcPath, param.dstPath, function (err) {
								if (err) {
									console.log("Error:", err);
								}
							});
						} else if (param.commandName === 'sftpsend') {
							sfc.UploadFile(param.srcPath, param.dstPath, function (err) {
								if (err) {
									console.log("Error:", err);
								}
							});
						}
					};
				}(data, sfc)));
			}
		}
	}

	if (process.argv.length > 3) {
		//console.error(process.argv);
		if (process.argv[2] === 'sshforward') {
			sendCommand({
				commandName : process.argv[2],
				targetInfo : process.argv[3],
				tempPath : process.argv[4],
				key : process.argv[5],
				hostType : process.argv[6].split('\'').join(''),
				commandStr : process.argv[7],
				port : process.argv[8]
			});
		} else if (process.argv[2] === 'sftpsendforward' || process.argv[2] === 'sftpgetforward') {
			sendCommand({
				commandName : process.argv[2],
				targetInfo : process.argv[3],
				tempPath : process.argv[4],
				key : process.argv[5],
				hostType : process.argv[6].split('\'').join(''),
				srcPath : process.argv[7],
				dstPath : process.argv[8],
				port : process.argv[9]
			});
		} else if (process.argv[2] === 'sftpsend' || process.argv[2] === 'sftpget') {
			sendCommand({
				commandName : process.argv[2],
				tempPath : process.argv[3],
				key : process.argv[4],
				hostType : process.argv[5].split('\'').join(''),
				srcPath : process.argv[6],
				dstPath : process.argv[7],
				port : process.argv[8]
			});
		} else if (process.argv[2] === 'ssh') {
			sendCommand({
				commandName : process.argv[2],
				tempPath : process.argv[3],
				key : process.argv[4],
				hostType : process.argv[5].split('\'').join(''),
				commandStr : process.argv[6],
				port : process.argv[7]
			});
		}
	}
}());
