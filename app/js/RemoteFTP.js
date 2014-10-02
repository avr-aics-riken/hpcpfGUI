if (typeof window === 'undefined') { // Node.js
	
var fs = require('fs');
var ssh2 = require('ssh2');
var exec = require('child_process').exec;
var path = require('path');
var os = require('os');
		
// default commands
var cpFileCmd = 'cp',
	cpDirCmd  = 'cp -r',
	mvCmd     = 'mv',
	rmFileCmd = 'rm',
	rmDirCmd  = 'rm -rf',
	mkdirCmd  = 'mkdir',
	tarCompressCmd = 'tar czvf',
	tarExtractCmd  = 'tar xvf',
	getRealPath = function(p) { return p; };

if (os.platform().indexOf('win') === 0){ // win setting
	console.log('Use Windows commands.');
	cpFileCmd = 'copy';
	cpDirCmd  = 'copy';
	mvCmd     = 'move';
	rmFileCmd = 'del /Q';
	rmDirCmd  = 'rd /q /s';
	mkdirCmd  = 'mkdir';
	tarCompressCmd = 'tar.exe czvf';
	tarExtractCmd  = 'tar.exe xvf';
	
	getRealPath = function (p) {
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
	
var localCmd = function (cmd,callback){
	var child = exec(cmd,
	function(cb){ return function (error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		if (cb)
			cb(error);
	}}(callback));
}

var localCopyFile     = function(src,dst,callback) {
	if (!fs.existsSync(src)){
		console.log('not found path>'+src);
		return;
	}
	
	if (fs.lstatSync(src).isDirectory()) {
		localCmd(cpDirCmd + ' "' + getRealPath(src) + '" "' + getRealPath(dst) + '"', callback);
	} else {
		localCmd(cpFileCmd + ' "' + getRealPath(src) + '" "' + getRealPath(dst) + '"', callback);
	}
}
var localMoveFile     = function(src,dst,callback) {
	localCmd(mvCmd + ' "' + getRealPath(src) + '" "' + getRealPath(dst) + '"', callback);
}
var localExtractFile  = function(srcpath,expath,callback){
	var parentpath = path.dirname(srcpath);
	var srcfile    = path.basename(srcpath);
	expath = expath + (expath.charAt(expath.length-1) == '/' ? '' : '/');
	var cmdstr;
	if (os.platform().indexOf('win') === 0){
		cmdstr = tarExtractCmd + ' "' + getRealPath(parentpath + '/' + srcfile).split("\\").join("/") + '" -C "' + getRealPath(expath).split("\\").join("/") + '"';
	} else {
		cmdstr = 'cd "'+parentpath+'";' + tarExtractCmd + ' "' + getRealPath(srcfile) + '" -C "' + getRealPath(expath) + '"';
	}
	console.log(cmdstr);
	localCmd(cmdstr, callback);
}
var localCompressFile = function(srcpath,cpath,callback){
	var parentpath = path.dirname(srcpath);
	var srcfile    = path.basename(srcpath);
	cpath = cpath + (cpath.charAt(cpath.length-1) == '/' ? '' : '/');
	var cmdstr;
	if (os.platform().indexOf('win') === 0){
		cmdstr = 'cd "' + getRealPath(parentpath) + '" & ' + __dirname + '/../' + tarCompressCmd + ' "' + getRealPath(cpath + srcfile).split("\\").join("/") +'.tar.gz" "' + srcfile + '"';
	} else {
		cmdstr = 'cd "'+parentpath+'";' + tarCompressCmd + ' "' + getRealPath(cpath + srcfile) +'.tar.gz" "'+getRealPath(srcfile)+'"';
	}
	console.log(cmdstr);
	localCmd(cmdstr, callback);
}
var localDeleteFile   = function(path,callback){
	if (!fs.existsSync(path)){
		console.log('not found path>'+path);
		return;
	}
	if (fs.lstatSync(path).isDirectory()) {
		localCmd(rmDirCmd + ' "' + getRealPath(path) + '"',callback);
	} else {
		localCmd(rmFileCmd + ' "' + getRealPath(path) + '"',callback);
	}
}
var localMakeDir      = function(path,callback)    { localCmd(mkdirCmd + ' "'+getRealPath(path)+'"',callback);            }
	
//-----------------------------------------------------------------
/*
	Remote server is linux, macosx.
	requires file commands.[cp,mv,tar,...]
*/

var remoteCmd = function(conn,cmd,callback){
	conn.exec(cmd, function(cb){return function(err,stream){
		console.log('REMOTE CMD>' + cmd);
		if (err)
			console.log(err);
		stream.on('end', function() {
			if (callback)
				callback(err);
		});
	}}(callback));
}
	
var remoteCopyFile     = function(conn,src,dst,callback) { remoteCmd(conn, 'cp -Rf "'+src+'" "'+dst+'"', callback);        }
var remoteMoveFile     = function(conn,src,dst,callback) { remoteCmd(conn, 'mv "'+src+'" "'+dst+'"', callback);        }
var remoteExtractFile  = function(conn,srcpath,expath,callback){
	var parentpath = path.dirname(srcpath);
	var srcfile    = path.basename(srcpath);
	expath = expath + (expath.charAt(expath.length-1) == '/' ? '' : '/');
	console.log('remoteCMD>'+'cd "'+parentpath+'";tar xvf "'+srcfile+'" -C "'+expath+'"');
	remoteCmd(conn, 'cd "'+parentpath+'";tar xvf "'+srcfile+'" -C "'+expath+'"',callback);
}
var remoteCompressFile = function(conn,srcpath,cpath,callback){
	var parentpath = path.dirname(srcpath);
	var srcfile    = path.basename(srcpath);
	cpath = cpath + (cpath.charAt(cpath.length-1) == '/' ? '' : '/');
	console.log('remoteCMD>'+'cd "'+parentpath+'";pwd;tar czvf "'+cpath + srcfile+'.tar.gz" "'+srcfile+'"');
	remoteCmd(conn,'cd "'+parentpath+'";tar czvf "'+cpath + srcfile+'.tar.gz" "'+srcfile+'"',callback);
}
var remoteDeleteFile   = function(conn,path,callback) {
	remoteCmd(conn, 'rm "'+path+'"',callback);
}
var remoteDeleteDir = function(conn,path, callback) {
	remoteCmd(conn, 'rm -rf "'+path+'"', callback);
}

var remoteMakeDir      = function(conn,path,callback)    { remoteCmd(conn, 'mkdir "'+path+'"',callback);             }

//-----------------------------------------------------------------

	
	
var LFTPClass = function(){
	
	this.errorLog = function(msg,callback){
		console.log(msg);
		callback(msg);
	}
	
	this.Disconnect = function(){
		console.log('This is local session. no need to disconnect.');
	}
	
	this.DownloadFile = function(tar_path, local_path, callback){
		this.errorLog('Failed to download. This is local mode.',callback);
	}
	this.UploadFile = function(local_path, tar_path, callback){
		this.errorLog('Failed to uplpad. This is local mode.',callback);
	}
	
	this.CopyFile = function(srcpath, destpath, callback){
		console.log('local:CopyFile>',srcpath,destpath);
		localCopyFile(srcpath,destpath,callback);
	}
	this.MoveFile = function(srcpath, destpath, callback){
		console.log('local:MoveyFile>',srcpath,destpath);
		localMoveFile(srcpath,destpath,callback);
	}
	this.ExtractFile = function(path,dir,callback){
		console.log('local:ExtractFile>',path,dir);
		localExtractFile(path,dir,callback);
	}
	this.CompressFile = function(path,cpath,callback){
		console.log('local:CompressFile>',path,cpath);
		localCompressFile(path,cpath,callback);
	}
	this.DeleteFile = function(path, callback){
		console.log('local:DeleteFile>',path);
		localDeleteFile(path,callback);
	}
	this.MakeDir = function(path, callback){
		console.log('local:MakeDir>',path);
		localMakeDir(path,callback);
	}

	this.OpenDir  = function(path, callback){
		fs.readdir(path, function(err,list){
			var lists = new Array();
			if (list) {
				for (var i=0; i<list.length; ++i) {
                    try {
					    var stat = fs.statSync(path+list[i]);
					    if (stat && stat.isDirectory()) {
						    lists.push({filename:list[i], longname:"d"});
					    }else{
						    lists.push({filename:list[i], longname:"-"});
					    }
                    } catch (e) {
                        console.log('Failed stat:'+list[i]);
                    }
				}
			}
			if (callback)
				callback(lists);
		});
	}
	this.Connect = function(args){
		// nothing to do.
		console.log('This is local session. no need to connect.');
	}
	
	this.delete = function(){
		console.log('delete local FTP session');
	}

}; // LFTPClass

var SFTPClass = function(){

	var conn = new ssh2();
	this.conn = conn;
	this.sftp = null;
	this.isConnected = false;
	
	this.errorLog = function(msg,callback){
		console.log(msg);
		callback(msg);
	}
	
	this.Disconnect = function(){
		this.sftp = null;
		this.conn.end();
		this.isConnected = false;
	}
	
	this.UploadFile = function(local_path, tar_path, callback){
		var sftp = this.sftp;
		if (!this.isConnected) {
			this.errorLog('Not established connection.',callback);
			return;
		}

		if (!fs.existsSync(local_path)){
			this.errorLog('not found path>'+local_path,callback);
			return;
		}
		if (fs.lstatSync(local_path).isDirectory()) {
			
			// directory upload process.
			var tempDir = os.tmpdir();
			console.log('TEMPDIR=' + tempDir);
			
			localCompressFile(local_path, tempDir, function (self, local_path, tar_path, callback) { return function () {
				var localTempTar = tempDir + path.basename(local_path)+".tar.gz",
					readStream = fs.createReadStream(localTempTar),
					writedFile = tar_path + ".tar.gz",
					writeStream = self.sftp.createWriteStream(writedFile);
				writeStream.on('close',function(self, writedFile, callback) { return function () {
					var tarDir = path.dirname(tar_path);
					console.log( "- Dir file transferred Extract->" + tarDir);
					
					self.ExtractFile(writedFile, tarDir, function() {
						console.log( "- Dir file extracted." );
						// remove remote temp tars
						self.DeleteFile(writedFile, function() {
							// remove remote temp tars
							localDeleteFile(localTempTar, function() {
								if (callback)
									callback();
							});
						});
					});
				}}(self, writedFile, callback));
				readStream.pipe( writeStream );
			}}(this, local_path, tar_path, callback));
			return;
		}
		
		// upload file
		var readStream = fs.createReadStream(local_path);
		var writeStream = this.sftp.createWriteStream(tar_path);

		// what to do when transfer finishes
		writeStream.on('close',function(self) { return function () {
			console.log( "- file transferred" );
			//this.sftp.end(); // no need?
			if (callback)
				callback();
		}}(this));

		// initiate transfer of file
		readStream.pipe( writeStream );
	}
	
	this.DownloadFile = function(tar_path, local_path, callback){
		var sftp = this.sftp;
		if (!this.isConnected) {
			this.errorLog('Not established connection.',callback);
			return;
		}

		var downloadFile = function (self, local_path, tar_path, callback) {
			var writeStream = fs.createWriteStream(local_path);
			var readStream = self.sftp.createReadStream(tar_path);

			// what to do when transfer finishes
			readStream.on('close', function () {
				console.log( "- file transferred" );
				if (callback)
					callback();
			});

			// initiate transfer of file
			readStream.on('error', function(thisptr,tar_path,callback){ return function(){
				thisptr.errorLog('Faild to download. Failed to read file:'+tar_path,callback);
				return;
			}}(self,tar_path,callback));
			writeStream.on('error', function(thisptr,local_path,callback){ return function(){
				thisptr.errorLog('Faild to download. Failed to write file:'+local_path,callback);
				return;
			}}(self,local_path,callback));
			readStream.pipe( writeStream );
		};
		
		sftp.stat(tar_path, function(self, local_path, tar_path, callback){ return function (err, stats) {
			if (stats.isDirectory()) {
				// download dir
				
				var tempdir = path.dirname(tar_path) + '/hpcpftemp_directory';
				self.MakeDir(tempdir, function(self, tempdir, callback) { return function () {
					self.CompressFile(tar_path, tempdir, function (self, callback) { return function () {
						console.log( "dir compress > " + tar_path + ' -> ' + tempdir);
						var tarfile = tempdir + '/' + path.basename(tar_path) + '.tar.gz',
							localTarfile = local_path + '-hpcpftemp.tar.gz';
						console.log( "remote tar file = " + tarfile);
						
						downloadFile(self, localTarfile, tarfile, function (ltarfile) { return function () {
							localExtractFile(ltarfile, path.dirname(ltarfile), function () {
								console.log( "extracted > " + ltarfile );
							
								// delete tars
								self.DeleteFile(tempdir, function () {
									localDeleteFile(ltarfile, function () {
										if (callback)
											callback();
									});
								});
							});
						}}(localTarfile));
					}}(self, callback));
				}}(self, tempdir, callback));
			} else {
				// download file
				downloadFile(self, local_path, tar_path, callback);
			}
		}}(this, local_path, tar_path, callback));
	}
	
	this.CopyFile = function(srcpath, destpath, callback){
		var sftp = this.sftp;
		if (!this.isConnected) {
			this.errorLog('Not established connection.',callback);
			return;
		}

		console.log('Remote:CopyFile>',srcpath,destpath);
		remoteCopyFile(this.conn,srcpath,destpath,callback);
	}
	this.MoveFile = function(srcpath, destdir, callback){
		console.log('Remote:MoveyFile>',srcpath,destdir);
		remoteMoveFile(this.conn,srcpath,destdir,callback);
	}
	this.ExtractFile = function(path,dir,callback){
		console.log('Remote:ExtractFile>',path,dir);
		remoteExtractFile(this.conn,path,dir,callback);
	}
	this.CompressFile = function(path,cfile,callback){
		console.log('Remote:CompressFile>',path,cfile);
		remoteCompressFile(this.conn,path,cfile,callback);
	}
	
	this.DeleteFile = function(path, callback){
		var sftp = this.sftp;
		if (!this.isConnected) {
			this.errorLog('Not established connection.',callback);
			return;
		}

		console.log('Remote:DeleteFile>',path);
		sftp.stat(path, function(self){ return function (err, stats) {
			if (stats.isDirectory()) {
				remoteDeleteDir(self.conn, path, callback);
			} else {
				remoteDeleteFile(self.conn, path, callback);
			}
		}}(this));
	}

	this.MakeDir = function(path, callback){
		var sftp = this.sftp;
		if (!this.isConnected) {
			this.errorLog('Not established connection.',callback);
			return;
		}

		console.log('Remote:MakeDir>',path);
		remoteMakeDir(this.conn,path,callback);
	}
	
	this.OpenDir = function(path, callback){
		var sftp = this.sftp;
		if (!this.isConnected) {
			this.errorLog('Not established connection.',callback);
			return;
		}

		sftp.opendir(path, function readdir(err, handle) {
			//if (err) throw err;
			try {
				sftp.readdir(handle, function(err, list) {
					if (err) throw err;
					if (list === false) {
						sftp.close(handle, function(err) {
							if (err) throw err;
							console.log('SFTP :: Handle closed');
							//sftp.end();
						});
						return;
					}
					//console.dir(list);
					if (callback)
						callback(list,null);
					//readdir(undefined, handle); // no need?
				});
			}catch(e){
				console.log('SFTP :: Failed to readdir:'+err.toString());
				var nulllist = {}
				if (callback)
					callback(nulllist,err.toString());
			}
		});
	}
	
	this.Connect = function(args,callback){
		conn.on('connect',function () {
			console.log( "- connected" );
		});
		conn.on('ready',function(self,cback){return function () {
			console.log( "- ready" );
			conn.sftp(function (err, sftp) {
				if ( err ) {
					console.log( "Error, problem starting SFTP Error: %s", err );
					process.exit( 2 );
				}
				console.log( "- SFTP started" );
				self.sftp = sftp;
				
				self.isConnected = true;
				if (cback)
					cback(null);
			});
		}}(this,callback));

		conn.on('error', function (err) {
			console.log( "- connection error: %s", err );
			if (callback)
				callback("- connection error: "+err.toString());
			//process.exit( 1 );
		});
		conn.on('close', function(had_error) {
			console.log('Connection close');
		});
		conn.on('end',function () {
			console.log('End remote session.');
		});

		try {
			conn.connect(args);
		} catch(e){
			console.log("Failed to connect server.[SSH2]");
			if (callback)
				callback(e);
		}
	}
	
	this.delete = function(){
		console.log('delete local FTP session:');
	}
} // SFTPClass

//
//	RemoteFTP Class
//
var ftparray = {};

var RemoteFTP = function(socket) {
	var cmd = {msg:'Server Connected.', id:socket.id};
	socket.emit('RFTP:SocketConnected', JSON.stringify(cmd));
	
	this.socket = socket;
	this.connectedMessage = function(cid,msg,host,initPath){
		console.log('RFTP:Connected',msg);
		this.socket.emit('RFTP:Connected',JSON.stringify({cid:cid,msg:msg,host:host,initPath:initPath}));
	}

	this.processedMessage = function(cid,msg){
		console.log('RFTP:Processed',msg);
		this.socket.emit('RFTP:Processed',JSON.stringify({cid:cid,msg:msg}));
	}
	this.errorMessage = function(cid,msg){
		console.log('RFTP:Error',msg);
		this.socket.emit('RFTP:Error',JSON.stringify({cid:cid,msg:msg}));
	}

	socket.on('RFTP:Connection', function(thisptr){ return function(sdata) {
		var data = JSON.parse(sdata);
		if (data.cid == ''){
			console.log('Error: cid parameter. must set unique id.');
			return;
		}
		
		var rfile;
		var regTable;
		var regFilename = '../conf/registered_host.json';
		try {
			rfile = fs.readFileSync(regFilename);
			regTable = JSON.parse(rfile);
		} catch(e) {
			thisptr.errorMessage(data.cid,"Can't read :" + regFilename);
			return;
		}
		var info = regTable[data.hostname];
		if (!info){
			thisptr.errorMessage(data.cid,"Not found host.");
			return;
		}

		if (!info['type']){
			thisptr.errorMessage(data.cid, 'Invalid host type');
			return;
		}
		
		if (ftparray[data.cid])
			ftparray[data.cid].delete();
		
		var sfc = null;
		if (info['type'] == 'local') {
			console.log('RFTP:Local Connection:id='+data.cid);
			sfc = new LFTPClass();
			ftparray[data.cid] = sfc;
			thisptr.connectedMessage(data.cid,"Local mode : connection success",info['host'],info['path']);
		} else {
			console.log('RFTP:Remote Connection:id='+data.cid);
			sfc = new SFTPClass();
			
			try {
				info['privateKey'] = require('fs').readFileSync(info['privateKeyFile']);
			} catch(e) {
				thisptr.errorMessage(data.cid,"Failed read SSH key file:"+info['privateKeyFile']);
				return;
			}
			sfc.Connect(info,function(data,sfc){ return function(err){
				if (err){
					thisptr.errorMessage(data.cid,"Connection Failed "+err);
					return;
				}
				thisptr.connectedMessage(data.cid,"Remote mode : connection success",info['host'],info['path']);
				ftparray[data.cid] = sfc;
			}}(data,sfc));
		}
	}}(this));
	
	function getFC(cid){
		if (cid == ''){
			console.log('Error: cid parameter. must set unique id.');
			return null;
		}
		var fc = ftparray[cid];
		if (!fc){
			console.log('Error: not found cid FTPInstance');
			return null;
		}
		return fc;
	}
	
	socket.on('RFTP:Disconnection', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;
	
		console.log('Disconnection');
		
		fc.Disconnect();
	}}(this));
	
	socket.on('RFTP:OpenDir', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;
		
		console.log("OpenDir:"+data.path);
		try{
			fc.OpenDir(data.path, function(list,err){
				if (err) {
					thisptr.errorMessage(data.cid,err.toString());
					return;
				}
				socket.emit('RFTP:OpenDirRet', JSON.stringify({cid:data.cid, list:list}));
			});
		}catch(e){
			thisptr.errorMessage(data.cid,'Failed OpenDir');
		}
	}}(this));
	socket.on('RFTP:UploadFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;
		
		fc.UploadFile(data.local_src, data.remote_dest, function(err){
			if (err)
				thisptr.processedMessage(data.cid,err.toString());
			else
				thisptr.processedMessage(data.cid,'Uploaded');
		});
	}}(this));
	socket.on('RFTP:DownloadFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;
		
		fc.DownloadFile(data.remote_src, data.local_dest, function(err){
			if (err)
				thisptr.processedMessage(data.cid,err.toString());
			else
				thisptr.processedMessage(data.cid,'Downloaded');
		});
	}}(this));
	
	socket.on('RFTP:CopyFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;

		fc.CopyFile(data.srcpath, data.destpath, function(err){
			if (err)
				thisptr.processedMessage(data.cid, err.toString());
			else
				thisptr.processedMessage(data.cid, 'Copied');
		});
	}}(this));

	socket.on('RFTP:MoveFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;

		fc.MoveFile(data.srcpath, data.destpath, function(err){
			if (err)
				thisptr.processedMessage(data.cid, err.toString());
			else
				thisptr.processedMessage(data.cid, 'Moved');
		});
	}}(this));

	socket.on('RFTP:ExtractFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;

		fc.ExtractFile(data.path, data.destdir, function(err){
			if (err)
				thisptr.processedMessage(data.cid, err.toString());
			else
				thisptr.processedMessage(data.cid, 'Extracted');
		});
	}}(this));

	socket.on('RFTP:CompressFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;

		fc.CompressFile(data.path, data.destdir, function(err){
			if (err)
				thisptr.processedMessage(data.cid, err.toString());
			else
				thisptr.processedMessage(data.cid, 'Compressed');
		});
	}}(this));
	
	socket.on('RFTP:DeleteFile', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;
		
		fc.DeleteFile(data.path, function(err){
			if(err)
				thisptr.processedMessage(data.cid, err.toString());
			else
				thisptr.processedMessage(data.cid,'Deleted');
		});
	}}(this));

	socket.on('RFTP:MakeDir', function(thisptr){ return function(sdata){
		var data = JSON.parse(sdata);
		var fc = getFC(data.cid);
		if (!fc)
			return;
		
		fc.MakeDir(data.path, function(err){
			if (err)
				thisptr.processedMessage(data.cid, err.toString());
			else
				thisptr.processedMessage(data.cid,'Maked Dir');
		});
	}}(this));
	
}// RemoteFTP

module.exports = RemoteFTP;



}else{ // Client Side

	
	
var RemoteFTP = function(socket, cid, hostname){
	this.socket = socket;
	this.id = socket.id;
	this.tarDir = '';
	this.host = '';
	this.cid = cid;
	this.hostname = hostname;
	
	this.GetDir = function()
	{
		return this.tarDir;
	}
	this.Connect = function()
	{
		console.log('CONNECT');
		this.socket.emit('RFTP:Connection',JSON.stringify({id:this.id, cid:this.cid, hostname:this.hostname}));
	}
	this.Disconnect = function(){
		console.log('DISCONNECT');
		this.socket.emit('RFTP:Disconnection',JSON.stringify({id:this.id, cid:this.cid}));
	}

	this.UpdateList = function(path)
	{
		if (path.charAt(path.length-1) != '/') path += '/';
		this.tarDir = new String(path);
		this.socket.emit('RFTP:OpenDir',JSON.stringify({id:this.id, path:path, cid:this.cid}));
	}
	this.UploadFile = function(local_src,remote_dest){
		this.socket.emit('RFTP:UploadFile',JSON.stringify({local_src:local_src, remote_dest:remote_dest, cid:this.cid}));
	}
	this.DonwloadFile = function(remote_src,local_dest){
		this.socket.emit('RFTP:DownloadFile',JSON.stringify({remote_src:remote_src, local_dest:local_dest, cid:this.cid}));
	}
	this.CopyFile = function(srcpath, destpath){
		this.socket.emit('RFTP:CopyFile',JSON.stringify({srcpath:srcpath, destpath:destpath, cid:this.cid}));
	}
	this.MoveFile = function(srcpath, destpath){
		this.socket.emit('RFTP:MoveFile',JSON.stringify({srcpath:srcpath, destpath:destpath, cid:this.cid}));
	}
	this.ExtractFile = function(path, destdir){
		this.socket.emit('RFTP:ExtractFile',JSON.stringify({path:path, destdir:destdir, cid:this.cid}));
	}
	this.CompressFile = function(path, destdir){
		this.socket.emit('RFTP:CompressFile',JSON.stringify({path:path, destdir:destdir, cid:this.cid}));
	}
	this.DeleteFile = function(path){
		this.socket.emit('RFTP:DeleteFile',JSON.stringify({path:path, cid:this.cid}));
	}
	this.MakeDir = function(path){
		this.socket.emit('RFTP:MakeDir',JSON.stringify({path:path, cid:this.cid}));
	}
	
	//-----------------------------------
	// socket.io events
	
	function OnSocketConnected(sfc){ return function(sdata){
		var data = JSON.parse(sdata);
		console.log('SocketConnected:'+data.msg+ ' / id='+data.id);
	}}
	
	function OnConnected(sfc){ return function(sdata){
		var data = JSON.parse(sdata);
		if (data.cid != sfc.cid)
			return;
		
		console.log('Connected:'+data.cid+' / '+data.initPath);
		sfc.tarDir = data.initPath;
		sfc.host   = data.host;
		if (sfc.onConnected)
			sfc.onConnected(data.msg);
		//console.log(sfc);
		sfc.UpdateList(sfc.tarDir);
	}}
	
	function OnError(sfc){ return function(sdata){
		var data = JSON.parse(sdata);
		if (data.cid != sfc.cid)
			return;
		console.log('Error:'+data.msg);
		if (sfc.onError)
			sfc.onError(data.msg);
	}}
	
	function OnOpenDirRet(sfc){ return function(sdata){
		var data = JSON.parse(sdata);
		if (data.cid != sfc.cid)
			return;
		console.log('OpenDirRet:'+data.cid);
		if (!data.list){
			console.log('Recived invalid data : '+sdata);
			return;
		}
		if (sfc.onOpenDir)
			sfc.onOpenDir(data.list);
	}}
	
	function OnProcessed(sfc){ return function(sdata){
		console.log("PROCESSED EVENT:"+sdata);
		var data = JSON.parse(sdata);
		if (data.cid != sfc.cid)
			return;
		console.log(data.msg);
		if (sfc.onProcessed)
			sfc.onProcessed(data.msg);
	}}
	
	this.on = function(thisptr){ return function(evt, func){
		if     (evt == 'connected') thisptr.onConnected = func;
		else if(evt == 'error'    ) thisptr.onError     = func;
		else if(evt == 'processed') thisptr.onProcessed = func;
		else if(evt == 'openDir'  ) thisptr.onOpenDir   = func;
	}}(this);
	
	this.OnSocketConnected = OnSocketConnected(this);
	this.OnConnected       = OnConnected(this);
	this.OnError           = OnError(this);
	this.OnOpenDirRet      = OnOpenDirRet(this);
	this.OnProcessed       = OnProcessed(this);
	
	socket.on('RFTP:SocketConnected',this.OnSocketConnected);
	socket.on('RFTP:Connected',      this.OnConnected);
	socket.on('RFTP:Error',          this.OnError);
	socket.on('RFTP:OpenDirRet',     this.OnOpenDirRet);
	socket.on('RFTP:Processed',      this.OnProcessed);
	
	this.delete = function(){
		this.socket.removeListener('RFTP:SocketConnected', this.OnSocketConnected);
		this.socket.removeListener('RFTP:Connected',       this.OnConnected);
		this.socket.removeListener('RFTP:Error',           this.OnError);
		this.socket.removeListener('RFTP:OpenDirRet',      this.OnOpenDirRet);
		this.socket.removeListener('RFTP:Processed',       this.OnProcessed);
		this.Disconnect();
	}
}


} // Server/Client switch