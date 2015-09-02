/*jslint devel:true, node:true, nomen:true */
/*global require, global, $, io, socket */

if (typeof window === 'undefined') { // Node.js
	"use strict";
	var fs = require('fs'),
		ssh2 = require('ssh2'),
		exec = require('child_process').exec,
		path = require('path'),
		os = require('os'),
		excludePath = require('./exclude_path');

	// default commands
	var cpFileCmd = 'cp',
		cpDirCmd  = 'cp -r',
		mvCmd     = 'mv',
		rmFileCmd = 'rm',
		rmDirCmd  = 'rm -rf',
		mkdirCmd  = 'mkdir',
		tarCompressCmd = 'tar czvf',
		tarExtractCmd  = 'tar xvf',
		getRealPath = function (p) { return p; };

	if (os.platform().indexOf('win') === 0) { // win setting
		console.log('Use Windows commands.');
		cpFileCmd = 'copy';
		cpDirCmd  = 'xcopy /s /R /Y /I';
		mvCmd     = 'move';
		rmFileCmd = 'del /Q';
		rmDirCmd  = 'rd /q /s';
		mkdirCmd  = 'mkdir';
		tarCompressCmd = 'tar.exe czvf';
		tarExtractCmd  = 'tar.exe xvf';

		getRealPath = function (p) {
			if (p.split(':').length > 1) {
				return p;
			}
			return path.join(process.cwd().split(':')[0] + ':', p);
		};
	}

	/*
	// read from conf file version.
	var confFile = __dirname + '/../../conf/hpcpfGUI.conf';
	try {
		console.log('confFile = ' + confFile);
		var ostype = os.platform(),
			file = fs.readFileSync(confFile),
			data = JSON.parse(file);

		if (data.cpFile      && data.cpFile[ostype])      { cpFileCmd      = data.cpFile[ostype]; }
		if (data.cpDir       && data.cpDir[ostype])       { cpDirCmd       = data.cpDir[ostype]; }
		if (data.mv          && data.mv[ostype])          { mvCmd          = data.mv[ostype]; }
		if (data.rmFile      && data.rmFile[ostype])      { rmFileCmd      = data.rmFile[ostype]; }
		if (data.rmDir       && data.rmDir[ostype])       { rmDirCmd       = data.rmFir[ostype]; }
		if (data.mk          && data.mk[ostype])          { mkdirCmd       = data.mk[ostype]; }
		if (data.tarCompress && data.tarCompress[ostype]) { tarCompressCmd = data.tarCompress[ostype]; }
		if (data.tarExtract  && data.tarExtract[ostype])  { tarExtractCmd  = data.tarExtract[ostype]; }

	} catch (e) {
		console.log('Not found conf file:' + confFile);
		console.log('Use default setting.');
	}
	*/

	var localCmd = function (cmd, callback) {
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

	var localCopyFile     = function (src, dst, callback) {
		if (!fs.existsSync(src)) {
			console.log('not found path>' + src);
			return;
		}
		if (excludePath.isExcludePath(src) || excludePath.isExcludePath(dst)) {
			console.log('cannot excute for excluding path>' + src);
			return;
		}

		if (fs.lstatSync(src).isDirectory()) {
			localCmd(cpDirCmd + ' "' + getRealPath(src) + '" "' + getRealPath(dst) + '"', callback);
		} else {
			localCmd(cpFileCmd + ' "' + getRealPath(src) + '" "' + getRealPath(dst) + '"', callback);
		}
	};
	var localMoveFile     = function (src, dst, callback) {
		if (excludePath.isExcludePath(src) || excludePath.isExcludePath(dst)) {
			console.log('cannot excute for excluding path>' + src);
			return;
		}
		localCmd(mvCmd + ' "' + getRealPath(src) + '" "' + getRealPath(dst) + '"', callback);
	};
	var localExistsFile = function (src, dstFileList, callback) {
		var baseName = path.basename(src),
			i = 0;
		console.log("baseName:" + baseName);
		for (i = 0; i < dstFileList.length; i = i + 1) {
			if (dstFileList[i].filename === baseName) {
				return true;
			}
		}
		return false;
	};
	var localExtractFile  = function (srcpath, expath, callback) {
		var parentpath = path.dirname(srcpath),
			srcfile    = path.basename(srcpath),
			cmdstr;
		if (excludePath.isExcludePath(srcpath) || excludePath.isExcludePath(expath)) {
			console.log('cannot excute for excluding path>' + srcpath);
			return;
		}
		expath = expath + (expath.charAt(expath.length - 1) === '/' ? '' : '/');
		if (os.platform().indexOf('win') === 0) {
			cmdstr = tarExtractCmd + ' "' + getRealPath(parentpath + '/' + srcfile).split("\\").join("/") + '" -C "' + getRealPath(expath).split("\\").join("/") + '"';
		} else {
			cmdstr = 'cd "' + parentpath + '";' + tarExtractCmd + ' "' + getRealPath(srcfile) + '" -C "' + getRealPath(expath) + '"';
		}
		console.log(cmdstr);
		localCmd(cmdstr, callback);
	};
	var localCompressFile = function (srcpath, cpath, callback) {
		var parentpath = path.dirname(srcpath),
			srcfile    = path.basename(srcpath),
			cmdstr;
		if (excludePath.isExcludePath(srcpath) || excludePath.isExcludePath(cpath)) {
			console.log('cannot excute for excluding path>' + srcpath);
			return;
		}
		cpath = cpath + (cpath.charAt(cpath.length - 1) === '/' ? '' : '/');
		if (os.platform().indexOf('win') === 0) {
			cmdstr = 'cd "' + getRealPath(parentpath) + '" & ' + __dirname + '/../' + tarCompressCmd + ' "' + getRealPath(cpath + srcfile).split("\\").join("/") + '.tar.gz" "' + srcfile + '"';
		} else {
			cmdstr = 'cd "' + parentpath + '";' + tarCompressCmd + ' "' + getRealPath(cpath + srcfile) + '.tar.gz" "' + getRealPath(srcfile) + '"';
		}
		console.log(cmdstr);
		localCmd(cmdstr, callback);
	};
	var localDeleteFile   = function (path, callback) {
		if (!fs.existsSync(path)) {
			console.log('not found path>' + path);
			return;
		}
		if (excludePath.isExcludePath(path)) {
			console.log('cannot excute for excluding path>' + path);
			return;
		}
		if (fs.lstatSync(path).isDirectory()) {
			localCmd(rmDirCmd + ' "' + getRealPath(path) + '"', callback);
		} else {
			localCmd(rmFileCmd + ' "' + getRealPath(path) + '"', callback);
		}
	};
	var localMakeDir      = function (path, callback) {
		if (excludePath.isExcludePath(path)) {
			console.log('cannot excute for excluding path>' + path);
			return;
		}
		localCmd(mkdirCmd + ' "' + getRealPath(path) + '"', callback);
	};

	//-----------------------------------------------------------------
	/*
		Remote server is linux, macosx.
		requires file commands.[cp,mv,tar,...]
	*/

	var remoteCmd = function (ssh2, cmd, callback, dataCallback) {
		ssh2.exec(cmd, (function (cb) {
			return function (err, stream) {
				console.log('REMOTE CMD>' + cmd);
				if (err) {
					console.log(err);
				}
				stream.on('end', function () {
					if (callback) {
						callback(err);
					}
				});
				stream.on('data', function (data) {
					if (dataCallback) {
						dataCallback(data);
					}
				});
			};
		}(callback)));
	};

	var remoteCopyFile     = function (ssh2, src, dst, callback) {
		if (excludePath.isExcludePath(src) || excludePath.isExcludePath(dst)) {
			console.log('cannot excute for excluding path>' + src);
			return;
		}
		remoteCmd(ssh2, 'cp -Rf "' + src + '" "' + dst + '"', callback);
	};
	var remoteMoveFile     = function (ssh2, src, dst, callback) {
		if (excludePath.isExcludePath(src) || excludePath.isExcludePath(dst)) {
			console.log('cannot excute for excluding path>' + src);
			return;
		}
		remoteCmd(ssh2, 'mv "' + src + '" "' + dst + '"', callback);
	};
	var remoteExistsFile     = function (src, dstFileList, callback) {
		console.log("remoteExistsFile");
		return localExistsFile(src, dstFileList, callback);
	};
	var remoteExtractFile  = function (ssh2, srcpath, expath, callback) {
		var parentpath = path.dirname(srcpath),
			srcfile    = path.basename(srcpath);
		if (excludePath.isExcludePath(srcpath) || excludePath.isExcludePath(expath)) {
			console.log('cannot excute for excluding path>' + srcpath);
			return;
		}
		expath = expath + (expath.charAt(expath.length - 1) === '/' ? '' : '/');
		console.log('remoteCMD>' + 'cd "' + parentpath + '";tar xvf "' + srcfile + '" -C "' + expath + '"');
		remoteCmd(ssh2, 'cd "' + parentpath + '";tar xvf "' + srcfile + '" -C "' + expath + '"', callback);
	};
	var remoteCompressFile = function (ssh2, srcpath, cpath, callback) {
		var parentpath = path.dirname(srcpath),
			srcfile    = path.basename(srcpath);
		if (excludePath.isExcludePath(srcpath) || excludePath.isExcludePath(cpath)) {
			console.log('cannot excute for excluding path>' + srcpath);
			return;
		}
		cpath = cpath + (cpath.charAt(cpath.length - 1) === '/' ? '' : '/');
		console.log('remoteCMD>' + 'cd "' + parentpath + '";pwd;tar czvf "' + cpath + srcfile + '.tar.gz" "' + srcfile + '"');
		remoteCmd(ssh2, 'cd "' + parentpath + '";tar czvf "' + cpath + srcfile + '.tar.gz" "' + srcfile + '"', callback);
	};
	var remoteDeleteFile   = function (ssh2, path, callback) {
		if (excludePath.isExcludePath(path)) {
			console.log('cannot excute for excluding path>' + path);
			return;
		}
		remoteCmd(ssh2, 'rm "' + path + '"', callback);
	};
	var remoteDeleteDir = function (ssh2, path, callback) {
		if (excludePath.isExcludePath(path)) {
			console.log('cannot excute for excluding path>' + path);
			return;
		}
		remoteCmd(ssh2, 'rm -rf "' + path + '"', callback);
	};

	var remoteMakeDir      = function (ssh2, path, callback) {
		if (excludePath.isExcludePath(path)) {
			console.log('cannot excute for excluding path>' + path);
			return;
		}
		remoteCmd(ssh2, 'mkdir "' + path + '"', callback);
	};

	//-----------------------------------------------------------------



	var LFTPClass = function () {
		this.watchingDir = null;

		this.errorLog = function (msg, callback) {
			console.log(msg);
			callback(msg);
		};

		this.Disconnect = function () {
			console.log('This is local session. no need to disconnect.');
		};

		this.DownloadFile = function (tar_path, local_path, callback) {
			this.errorLog('Failed to download. This is local mode.', callback);
		};
		this.UploadFile = function (local_path, tar_path, callback) {
			this.errorLog('Failed to uplpad. This is local mode.', callback);
		};

		this.CopyFile = function (srcpath, destpath, callback) {
			console.log('local:CopyFile>', srcpath, destpath);
			localCopyFile(srcpath, destpath, callback);
		};
		this.MoveFile = function (srcpath, destpath, callback) {
			console.log('local:MoveyFile>', srcpath, destpath);
			localMoveFile(srcpath, destpath, callback);
		};
		this.ExistsFile = function (srcpath, dstFileList, callback) {
			console.log('local:ExistsFile>', srcpath);
			return localExistsFile(srcpath, dstFileList, callback);
		};
		this.ExtractFile = function (path, dir, callback) {
			console.log('local:ExtractFile>', path, dir);
			localExtractFile(path, dir, callback);
		};
		this.CompressFile = function (path, cpath, callback) {
			console.log('local:CompressFile>', path, cpath);
			localCompressFile(path, cpath, callback);
		};
		this.DeleteFile = function (path, callback) {
			console.log('local:DeleteFile>', path);
			localDeleteFile(path, callback);
		};
		this.MakeDir = function (path, callback) {
			console.log('local:MakeDir>', path);
			localMakeDir(path, callback);
		};

		this.OpenDir  = function (path, callback) {
			fs.readdir(path, (function (path, thisptr) {
				return function (err, list) {
					var tmp;
					
					if (thisptr.watchingDir) {
						thisptr.watchingDir.close();
						thisptr.watchingDir = null;
					}

					function readLocalDir(path, list, callback) {
						var lists = [],
							i,
							stat,
							fullpath,
							isExcludePath = false;
						if (list) {
							for (i = 0; i < list.length; i = i + 1) {
								try {
									fullpath = path + list[i];
									stat = fs.statSync(fullpath);
									isExcludePath = excludePath.isExcludePath(excludePath.TypeBrowser, fullpath);
									if (stat && stat.isDirectory()) {
										lists.push({filename: list[i], longname: "d", excludepath : isExcludePath});
									} else {
										lists.push({filename: list[i], longname: "-", excludepath : isExcludePath});
									}
								} catch (e) {
									console.log('Failed stat:' + list[i]);
								}
							}
						}
						if (callback) {
							callback(lists);
						}
					}

					try {
						// fix for abort
						tmp = fs.normalize(path);
						
						thisptr.watchingDir = fs.watch(path, (function (path, callback) {
							return function (event, filename) {
								console.log('CHANGE LOCAL DIR:', path);
								fs.readdir(path, (function (path, callback) {
									return function (err, list) {
										readLocalDir(path, list, callback);
									};
								}(path, callback)));
							};
						}(path, callback)));
					} catch (e) {
						console.error('Failed to watch');
					}
					readLocalDir(path, list, callback);
				};
				
			}(path, this)));
		};
		this.Connect = function (args) {
			// nothing to do.
			console.log('This is local session. no need to connect.');
		};

		this.deleteConnection = function () {
			if (this.watchingDir) {
				this.watchingDir.close();
				this.watchingDir = null;
			}
			console.log('delete local FTP session');
		};

	}; // LFTPClass

	var SFTPClass = function () {
		this.ssh2 = new ssh2();
		this.sftp = null;
		this.isConnected = false;

		this.errorLog = function (msg, callback) {
			console.log(msg);
			callback(msg);
		};

		this.Disconnect = function () {
			this.sftp = null;
			this.ssh2.end();
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
			if (fs.lstatSync(local_path).isDirectory()) {

				// directory upload process.
				tempDir = os.tmpdir();
				if (tempDir[tempDir.length - 1] !== path.sep) {
					tempDir = tempDir + "/";
				}
				console.log('TEMPDIR=' + tempDir);

				localCompressFile(local_path, tempDir, (function (self, local_path, tar_path, callback) {
					return function () {
						var localTempTar = tempDir + path.basename(local_path) + ".tar.gz",
							readStream = fs.createReadStream(localTempTar),
							writedFile = tar_path + ".tar.gz",
							writeStream = self.sftp.createWriteStream(writedFile);
						writeStream.on('close', (function (self, writedFile, callback) {
							return function () {
								var tarDir = path.dirname(tar_path);
								console.log("- Dir file transferred Extract->" + tarDir);

								self.ExtractFile(writedFile, tarDir, function () {
									console.log("- Dir file extracted.");
									// remove remote temp tars
									self.DeleteFile(writedFile, function () {
										// remove remote temp tars
										localDeleteFile(localTempTar, function () {
											if (callback) {
												callback();
											}
										});
									});
								});
							};
						}(self, writedFile, callback)));
						readStream.pipe(writeStream);
					};
				}(this, local_path, tar_path, callback)));
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
				});

				// initiate transfer of file
				readStream.on('error', (function (thisptr, tar_path, callback) {
					return function () {
						thisptr.errorLog('Faild to download. Failed to read file:' + tar_path, callback);
						return;
					};
				}(self, tar_path, callback)));
				writeStream.on('error', (function (thisptr, local_path, callback) {
					return function () {
						thisptr.errorLog('Faild to download. Failed to write file:' + local_path, callback);
						return;
					};
				}(self, local_path, callback)));
				readStream.pipe(writeStream);
			};

			sftp.stat(tar_path, (function (self, local_path, tar_path, callback) {
				return function (err, stats) {
					if (stats.isDirectory()) {
						// download dir

						var tempdir = path.dirname(tar_path) + '/hpcpftemp_directory';
						self.MakeDir(tempdir, (function (self, tempdir, callback) {
							return function () {
								self.CompressFile(tar_path, tempdir, (function (self, callback) {
									return function () {
										console.log("dir compress > " + tar_path + ' -> ' + tempdir);
										var tarfile = tempdir + '/' + path.basename(tar_path) + '.tar.gz',
											localTarfile = local_path + '-hpcpftemp.tar.gz';
										console.log("remote tar file = " + tarfile);

										downloadFile(self, localTarfile, tarfile, (function (ltarfile) {
											return function () {
												localExtractFile(ltarfile, path.dirname(ltarfile), function () {
													console.log("extracted > " + ltarfile);

													// delete tars
													self.DeleteFile(tempdir, function () {
														localDeleteFile(ltarfile, function () {
															if (callback) {
																callback();
															}
														});
													});
												});
											};
										}(localTarfile)));
									};
								}(self, callback)));
							};
						}(self, tempdir, callback)));
					} else {
						// download file
						downloadFile(self, local_path, tar_path, callback);
					}
				};
			}(this, local_path, tar_path, callback)));
		};

		this.CopyFile = function (srcpath, destpath, callback) {
			var sftp = this.sftp;
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}

			console.log('Remote:CopyFile>', srcpath, destpath);
			remoteCopyFile(this.ssh2, srcpath, destpath, callback);
		};
		this.MoveFile = function (srcpath, destdir, callback) {
			console.log('Remote:MoveyFile>', srcpath, destdir);
			remoteMoveFile(this.ssh2, srcpath, destdir, callback);
		};
		this.ExistsFile = function (srcpath, dstFileList, callback) {
			console.log('Remote:ExistsFile>', srcpath);
			return remoteExistsFile(srcpath, dstFileList, callback);
		};
		this.ExtractFile = function (path, dir, callback) {
			console.log('Remote:ExtractFile>', path, dir);
			remoteExtractFile(this.ssh2, path, dir, callback);
		};
		this.CompressFile = function (path, cfile, callback) {
			console.log('Remote:CompressFile>', path, cfile);
			remoteCompressFile(this.ssh2, path, cfile, callback);
		};

		this.DeleteFile = function (path, callback) {
			var sftp = this.sftp;
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}

			console.log('Remote:DeleteFile>', path);
			sftp.stat(path, (function (self) {
				return function (err, stats) {
					if (stats.isDirectory()) {
						remoteDeleteDir(self.ssh2, path, callback);
					} else {
						remoteDeleteFile(self.ssh2, path, callback);
					}
				};
			}(this)));
		};

		this.MakeDir = function (path, callback) {
			var sftp = this.sftp;
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}

			console.log('Remote:MakeDir>', path);
			remoteMakeDir(this.ssh2, path, callback);
		};

		this.OpenDir = function (path, callback) {
			var sftp = this.sftp;
			if (!this.isConnected) {
				this.errorLog('Not established connection.', callback);
				return;
			}

			sftp.opendir(path, function readdir(err, handle) {
				//if (err) throw err;
				try {
					sftp.readdir(handle, function (err, list) {
						if (err) { throw err; }
						if (list === false) {
							sftp.close(handle, function (err) {
								if (err) { throw err; }
								console.log('SFTP :: Handle closed');
								//sftp.end();
							});
							return;
						}
						//console.dir(list);
						if (callback) {
							callback(list, null);
						}
						//readdir(undefined, handle); // no need?
					});
				} catch (e) {
					console.log('SFTP :: Failed to readdir:' + err.toString());
					var nulllist = {};
					if (callback) {
						callback(nulllist, err.toString());
					}
				}
			});
		};

		this.Connect = function (args, callback) {
			//console.log("ARGS", args);
			this.ssh2.on('connect', function () {
				console.log("- connected");
			});
			this.ssh2.on('ready', (function (self, cback) {
				return function () {
					console.log("- ready");
					self.ssh2.sftp(function (err, sftp) {
						if (err) {
							console.log("Error, problem starting SFTP Error: %s", err);
							process.exit(2);
						}
						console.log("- SFTP started");
						self.sftp = sftp;

						self.isConnected = true;
						if (cback) {
							cback(null);
						}
					});
				};
			}(this, callback)));

			this.ssh2.on('keyboard-interactive', function redo(name, instructions, instructionsLang, prompts, finish, answers) {
				if (args.hasOwnProperty('password')) {
					finish([args.password]);
				} else {
					finish([]);
				}
			});

			this.ssh2.on('error', function (err) {
				console.log("- connection error: %s", err);
				if (callback) {
					callback("- connection error: " + err.toString());
				}
				//process.exit( 1 );
			});
			this.ssh2.on('close', function (had_error) {
				console.log('Connection close');
			});
			this.ssh2.on('end', function () {
				console.log('End remote session.');
			});

			try {
				this.ssh2.connect(args);
			} catch (e) {
				console.log("Failed to connect server.[SSH2]");
				if (callback) {
					callback(e);
				}
			}
		};

		this.deleteConnection = function () {
			console.log('delete local FTP session:');
		};
	}; // SFTPClass

	//
	//	RemoteFTP Class
	//
	var ftparray = {};

	var RemoteFTP = function (socket) {
		var cmd = {msg : 'Server Connected.', id : socket.id};
		socket.emit('RFTP:SocketConnected', JSON.stringify(cmd));

		this.socket = socket;
		this.connectedMessage = function (cid, msg, server, initPath) {
			console.log('RFTP:Connected', msg);
			this.socket.emit('RFTP:Connected', JSON.stringify({cid : cid, msg : msg, server : server, initPath : initPath}));
		};

		this.processedMessage = function (cid, msg) {
			console.log('RFTP:Processed', msg);
			this.socket.emit('RFTP:Processed', JSON.stringify({cid : cid, msg : msg}));
		};
		this.errorMessage = function (cid, msg) {
			console.log('RFTP:Error', msg);
			this.socket.emit('RFTP:Error', JSON.stringify({cid : cid, msg : msg}));
		};

		socket.on('RFTP:Connection', (function (thisptr) {
			return function (sdata, isTest) {
				var data = JSON.parse(sdata),
					rfile,
					regList,
					regFilename,
					info,
					sfc = null,
					isUsePassword = false,
					target = null,
					i;
				if (data.cid === '') {
					console.log('Error: cid parameter. must set unique id.');
					return;
				}

				regFilename = '../conf/targetconf.json';
				try {
					rfile = fs.readFileSync(regFilename);
					regList = JSON.parse(rfile);
					if (regList.hasOwnProperty('hpcpf') && regList.hpcpf.hasOwnProperty('targets')) {
						regList = regList.hpcpf.targets;
					} else {
						thisptr.errorMessage(data.cid, "Wrong format :" + regFilename);
						return;
					}
				} catch (e) {
					thisptr.errorMessage(data.cid, "Can't read :" + regFilename);
					return;
				}
				for (i = 0; i < regList.length; i = i + 1) {
					if (regList[i].type === data.type) {
						target = regList[i];
						break;
					}
				}
				if (!target) {
					thisptr.errorMessage(data.cid, "Not found host.");
					return;
				}
				// create copy.
				info = JSON.parse(JSON.stringify(target));
				info.readyTimeout = 99999;

				if (isTest) {
					info.workpath = "";
				}

				if (!info.hasOwnProperty('type')) {
					thisptr.errorMessage(data.cid, 'Invalid host type');
					return;
				}
				
				if (info.hasOwnProperty('sshkey')) {
					isUsePassword = true;
				}
				
				if (data.password) {
					info.password = data.password;
				}
				if (data.passphrase) {
					info.passphrase = data.passphrase;
				}

				if (ftparray[data.cid]) {
					ftparray[data.cid].deleteConnection();
				}
					
				if (info.type === 'local') {
					console.log('RFTP:Local Connection:id=' + data.cid);
					sfc = new LFTPClass();
					ftparray[data.cid] = sfc;
					thisptr.connectedMessage(data.cid, "Local mode : connection success", info.server, info.workpath);
				} else {
					console.log('RFTP:Remote Connection:id=' + data.cid);
					sfc = new SFTPClass();

					try {
						if (!isUsePassword) {
							// password authoricaiton
							if (info.hasOwnProperty('sshkey')) {
								delete info.sshkey;
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
							if (info.hasOwnProperty('sshkey')) {
								info.privateKey = fs.readFileSync(info.sshkey);
							}
						}
					} catch (ee) {
						thisptr.errorMessage(data.cid, "Failed read SSH key file:" + info.sshkey);
						return;
					}
					
					// for ssh2 input parameter
					info.username = info.userid;
					info.host = info.server;
					
					sfc.Connect(info, (function (data, sfc) {
						return function (err) {
							if (err) {
								thisptr.errorMessage(data.cid, "Connection Failed " + err);
								return;
							}
							thisptr.connectedMessage(data.cid, "Remote mode : connection success", info.server, info.workpath);
							ftparray[data.cid] = sfc;
						};
					}(data, sfc)));
				}
			};
		}(this)));

		function getFC(cid) {
			if (cid === '') {
				console.log('Error: cid parameter. must set unique id.');
				return null;
			}
			var fc = ftparray[cid];
			if (!fc) {
				console.log('Error: not found cid FTPInstance', ftparray, cid);
				return null;
			}
			return fc;
		}

		socket.on('RFTP:Disconnection', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				console.log('Disconnection');

				fc.Disconnect();
			};
		}(this)));

		socket.on('RFTP:OpenDir', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				console.log("OpenDir:" + data.path);
				try {
					fc.OpenDir(data.path, function (list, err) {
						if (err) {
							thisptr.errorMessage(data.cid, err.toString());
							return;
						}
						socket.emit('RFTP:OpenDirRet', JSON.stringify({cid : data.cid, list : list}));
					});
				} catch (e) {
					thisptr.errorMessage(data.cid, 'Failed OpenDir');
				}
			};
		}(this)));
		socket.on('RFTP:UploadFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.UploadFile(data.local_src, data.remote_dest, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Uploaded');
					}
				});
			};
		}(this)));
		socket.on('RFTP:DownloadFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.DownloadFile(data.remote_src, data.local_dest, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Downloaded');
					}
				});
			};
		}(this)));

		socket.on('RFTP:CopyFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.CopyFile(data.srcpath, data.destpath, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Copied');
					}
				});
			};
		}(this)));

		socket.on('RFTP:MoveFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.MoveFile(data.srcpath, data.destpath, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Moved');
					}
				});
			};
		}(this)));

		socket.on('RFTP:ExistsFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.OpenDir(data.path, function (list, err) {
					var existed = fc.ExistsFile(data.srcpath, list);
					socket.emit('RFTP:Existed', JSON.stringify({
						cid : data.cid,
						srcpath : data.srcpath,
						path : data.path,
						existed : existed
					}));
				});
			};
		}(this)));

		socket.on('RFTP:ExtractFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.ExtractFile(data.path, data.destdir, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Extracted');
					}
				});
			};
		}(this)));

		socket.on('RFTP:CompressFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.CompressFile(data.path, data.destdir, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Compressed');
					}
				});
			};
		}(this)));

		socket.on('RFTP:DeleteFile', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.DeleteFile(data.path, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Deleted');
					}
				});
			};
		}(this)));

		socket.on('RFTP:MakeDir', (function (thisptr) {
			return function (sdata) {
				var data = JSON.parse(sdata),
					fc = getFC(data.cid);
				if (!fc) {
					return;
				}

				fc.MakeDir(data.path, function (err) {
					if (err) {
						thisptr.processedMessage(data.cid, err.toString());
					} else {
						thisptr.processedMessage(data.cid, 'Maked Dir');
					}
				});
			};
		}(this)));

	};// RemoteFTP

	module.exports = RemoteFTP;



} else { // Client Side

	"use strict";

	var RemoteFTP = function (socket, cid, type) {
		this.socket = socket;
		this.id = socket.id;
		this.tarDir = '';
		this.server = '';
		this.cid = cid; // connection id (string)
		this.type = type;
		

		this.GetDir = function () {
			return this.tarDir;
		};
		this.Connect = function (passphrase, password) {
			console.log('CONNECT');
			if (password) {
				this.socket.emit('RFTP:Connection', JSON.stringify({id : this.id, cid : this.cid, type : this.type, password : password}), false);
			} else {
				this.socket.emit('RFTP:Connection', JSON.stringify({id : this.id, cid : this.cid, type : this.type, passphrase : passphrase }), false);
			}
		};
		this.ConnectTest = function (passphrase, password) {
			console.log('CONNECT');
			if (password) {
				this.socket.emit('RFTP:Connection', JSON.stringify({id : this.id, cid : this.cid, type : this.type, password : password}), true);
			} else {
				this.socket.emit('RFTP:Connection', JSON.stringify({id : this.id, cid : this.cid, type : this.type, passphrase : passphrase }), true);
			}
		};
		this.Disconnect = function () {
			console.log('DISCONNECT');
			this.socket.emit('RFTP:Disconnection', JSON.stringify({id : this.id, cid : this.cid}));
		};

		this.UpdateList = function (path) {
			if (path.charAt(path.length - 1) !== '/') { path += '/'; }
			this.tarDir = path;
			this.socket.emit('RFTP:OpenDir', JSON.stringify({id : this.id, path : path, cid : this.cid}));
		};
		this.UploadFile = function (local_src, remote_dest) {
			this.socket.emit('RFTP:UploadFile', JSON.stringify({local_src : local_src, remote_dest : remote_dest, cid : this.cid}));
		};
		this.DonwloadFile = function (remote_src, local_dest) {
			this.socket.emit('RFTP:DownloadFile', JSON.stringify({remote_src : remote_src, local_dest : local_dest, cid : this.cid}));
		};
		this.CopyFile = function (srcpath, destpath) {
			this.socket.emit('RFTP:CopyFile', JSON.stringify({srcpath : srcpath, destpath : destpath, cid : this.cid}));
		};
		this.MoveFile = function (srcpath, destpath) {
			this.socket.emit('RFTP:MoveFile', JSON.stringify({srcpath : srcpath, destpath : destpath, cid : this.cid}));
		};
		this.ExistsFile = function (targetdir, srcpath, callback) {
			this.socket.once('RFTP:Existed', function (sdata) {
				var data = JSON.parse(sdata);
				if (data.srcpath === srcpath) {
					callback(data.existed);
				}
			});
			this.socket.emit('RFTP:ExistsFile', JSON.stringify({srcpath : srcpath, path : targetdir, cid : this.cid}));
		};
		this.ExtractFile = function (path, destdir) {
			this.socket.emit('RFTP:ExtractFile', JSON.stringify({path : path, destdir : destdir, cid : this.cid}));
		};
		this.CompressFile = function (path, destdir) {
			this.socket.emit('RFTP:CompressFile', JSON.stringify({path : path, destdir : destdir, cid : this.cid}));
		};
		this.DeleteFile = function (path) {
			this.socket.emit('RFTP:DeleteFile', JSON.stringify({path : path, cid : this.cid}));
		};
		this.MakeDir = function (path) {
			this.socket.emit('RFTP:MakeDir', JSON.stringify({path : path, cid : this.cid}));
		};

		//-----------------------------------
		// socket.io events

		function onSocketConnected(sfc) {
			return function (sdata) {
				var data = JSON.parse(sdata);
				console.log('SocketConnected:' + data.msg + ' / id=' + data.id);
			};
		}

		function onConnected(sfc) {
			return function (sdata) {
				var data = JSON.parse(sdata);
				if (data.cid !== sfc.cid) {
					return;
				}

				console.log('Connected:', data);
				sfc.tarDir = data.initPath;
				sfc.server   = data.server;
				console.log('server is ', data.server);
				if (sfc.onConnectedCallback) {
					sfc.onConnectedCallback(data.msg);
				}
				//console.log(sfc);
				sfc.UpdateList(sfc.tarDir);
			};
		}

		function onError(sfc) {
			return function (sdata) {
				var data = JSON.parse(sdata);
				if (data.cid !== sfc.cid) {
					return;
				}
				console.log('Error:' + data.msg);
				if (sfc.onErrorCallback) {
					sfc.onErrorCallback(data.msg);
				}
			};
		}

		function onOpenDirRet(sfc) {
			return function (sdata) {
				var data = JSON.parse(sdata);
				if (data.cid !== sfc.cid) {
					return;
				}
				console.log('OpenDirRet:' + data.cid);
				if (!data.list) {
					console.log('Recived invalid data : ' + sdata);
					return;
				}
				if (sfc.onOpenDirCallback) {
					sfc.onOpenDirCallback(data.list);
				}
			};
		}

		function onProcessed(sfc) {
			return function (sdata) {
				console.log("PROCESSED EVENT:" + sdata);
				var data = JSON.parse(sdata);
				if (data.cid !== sfc.cid) {
					return;
				}
				console.log(data.msg);
				if (sfc.onProcessedCallback) {
					sfc.onProcessedCallback(data.msg);
				}
			};
		}

		this.on = (function (thisptr) {
			return function (evt, func) {
				if (evt === 'connected') {
					thisptr.onConnectedCallback = func;
				} else if (evt === 'error') {
					thisptr.onErrorCallback     = func;
				} else if (evt === 'processed') {
					thisptr.onProcessedCallback = func;
				} else if (evt === 'openDir') {
					thisptr.onOpenDirCallback   = func;
				}
			};
		}(this));

		this.onSocketConnected = onSocketConnected(this);
		this.onConnected       = onConnected(this);
		this.onError           = onError(this);
		this.onOpenDirRet      = onOpenDirRet(this);
		this.onProcessed       = onProcessed(this);

		socket.on('RFTP:SocketConnected', this.onSocketConnected);
		socket.on('RFTP:Connected',      this.onConnected);
		socket.on('RFTP:Error',          this.onError);
		socket.on('RFTP:OpenDirRet',     this.onOpenDirRet);
		socket.on('RFTP:Processed',      this.onProcessed);

		this.deleteConnection = function () {
			this.socket.removeListener('RFTP:SocketConnected', this.onSocketConnected);
			this.socket.removeListener('RFTP:Connected',       this.onConnected);
			this.socket.removeListener('RFTP:Error',           this.onError);
			this.socket.removeListener('RFTP:OpenDirRet',      this.onOpenDirRet);
			this.socket.removeListener('RFTP:Processed',       this.onProcessed);
			this.Disconnect();
		};
	};


} // Server/Client switch