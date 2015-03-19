var socket = io.connect();

function registerRemoteHost()
{
	var s = window.open("remotehost.html","remotehost");
	s.focus();
}

function getUpDir(path) // fix me beautiful
{
	if (path === "/")
		return "/";
	var p = path.split("/");
	if (p[p.length-1] == "")
		p.pop();
	var uppath = "/";
	for(var i=0; i<p.length-1; ++i)
	{
		if (p[i] == "")
			continue;
		uppath += p[i] + '/';
	}
	if (uppath=="//")
		uppath = "/";
	return uppath;
}

function makeUpNode(curfilepath,argftp)
{
//	<div class="fileitem" id="dir1" draggable="false"><div class="back"></div><p class="filelabel">..</p></div>
	var filepath = getUpDir(curfilepath);
	var newbtn = document.createElement('div');
	newbtn.setAttribute('class', "fileitem");
	//newbtn.setAttribute('draggable', "false");
	var fileicon = document.createElement('div');
	fileicon.setAttribute('class', 'back');
	newbtn.appendChild(fileicon);
	newbtn.setAttribute('onclick','FBOpenDir('+argftp+',"'+filepath+'")');
	return newbtn;
}

function getOtherside(side){
	if (side == 'right')
		return 'left';
	else
		return 'right';
}

function addItemDragEvents(tar, side, filepath, my_rftp, ano_rftp){
	console.log("!!!DRAGEVENT!!!:["+my_rftp.host+"],["+ano_rftp.host+"]");
	var othersideActionMenu = 'actionmenu_' + getOtherside(side);
	if (my_rftp.host == 'localhost' && ano_rftp.host != 'localhost'){
		othersideActionMenu = 'actionmenu_' + getOtherside(side) + '_upload';
	} else if (my_rftp.host != 'localhost' && ano_rftp.host == 'localhost'){
		othersideActionMenu = 'actionmenu_' + getOtherside(side) + '_download';
	} else if (my_rftp.host != 'localhost' && ano_rftp.host != 'localhost' && my_rftp.host != ano_rftp.host){
		othersideActionMenu = 'actionmenu_' + getOtherside(side) + '_none';
	}

	
	// add drag event
	tar.addEventListener('dragstart', function(fpath, othersideActionMenu){ return function(e) {
		e.dataTransfer.effectAllowed = 'move';
		//e.dataTransfer.setData('text/json', JSON.stringify({path:fpath}));
        e.dataTransfer.setData('text', JSON.stringify({path:fpath}));
		
		var am = document.getElementById(othersideActionMenu);
		am.style.display = "block";
		
	}}(filepath,othersideActionMenu), false);
	tar.addEventListener('dragend', function(othersideActionMenu){ return function(e){
		var am = document.getElementById(othersideActionMenu);
		am.style.display = "none";
	}}(othersideActionMenu));
}
function addItemDropEvents(tar, dropcallback){
//	tar.addEventListener('dragover', function(e){
	tar.ondragover = function(e){
		e.preventDefault();
	}//,false);
//	tar.addEventListener('dragenter', function(e){
	tar.ondragenter = function(e){
		e.preventDefault();
		this.classList.add('actionitem_active');
	}//,false);
//	tar.addEventListener('dragleave', function(e){
	tar.ondragleave = function(e){
		e.preventDefault();
		this.classList.remove('actionitem_active');
	}//,false);
	
//	tar.addEventListener('drop',function(e) {
	tar.ondrop = function(e){
		this.classList.remove('actionitem_active');
		if (e.stopPropagation) {
			e.stopPropagation(); // Stops some browsers from redirecting.
		}
		//var sjson = e.dataTransfer.getData('text/json');
		var sjson = e.dataTransfer.getData('text');
		//console.log('droped:'+sjson);
		var data = null;
		try{
			data = JSON.parse(sjson);
		}catch(er){
			console.log('Failed JSON parse:'+sjson);
		}
		if (dropcallback)
			dropcallback(data);
		
		return false;
	}//, false);
	
}

function closeRenameBox() {
	var container = document.getElementById('rename_box_container'),
		renameBox = document.getElementById('rename_box'),
		background = document.getElementById('popup_background');
	container.style.display = "none";
	renameBox.value = "";
	background.style.visibility = "hidden";
	background.removeEventListener('click', closeRenameBox);
}

function showRenameBox(filelabel, fpath, ftp) {
	var container = document.getElementById('rename_box_container'),
		renameBox = document.getElementById('rename_box'),
		scrollLeft = (document.body.scrollLeft + document.documentElement.scrollLeft),
		scrollTop  = (document.body.scrollTop + document.documentElement.scrollTop),
		bounds = filelabel.getBoundingClientRect(),
		background = document.getElementById('popup_background');
	container.style.display = "block";
	container.style.position = "absolute";
	container.style.left = (bounds.left+scrollLeft)+"px";
	container.style.top  = (bounds.top+scrollTop)+"px";
	container.style.zIndex = 20;
	renameBox.value = filelabel.innerHTML;
	renameBox.focus();
	//console.log("left:"+bounds.left);
	//console.log("top:"+bounds.top);
	background.style.visibility = "visible";
	
	
	function renamefunc(e) {
		var keyCode,
			newname = renameBox.value;
		if (e) {
			keyCode = e.keyCode;
			e.stopPropagation();
		} else {
			keyCode = window.event.keyCode;
			window.event.returnValue = false;
			window.event.cancelBubble = true;
		}
		if (keyCode == 13) { // Enter
			if (document.getElementById('rename_box_container').style.display === "block") {
				if (fpath !== ftp.GetDir()+newname) {
					withExistWarning(ftp, ftp.GetDir()+newname, ftp.GetDir()+newname, function(src, dest) {
						ftp.MoveFile(ftp.GetDir()+getFilename(fpath), dest);
					});
				}
				closeRenameBox();
				renameBox.removeEventListener('keydown', renamefunc);
			}
		} else if (keyCode == 27) { // Esc
			closeRenameBox();
			renameBox.removeEventListener('keydown', renamefunc);
		}
	}
	
	function closeRenameBox() {
		var container = document.getElementById('rename_box_container'),
			renameBox = document.getElementById('rename_box'),
			background = document.getElementById('popup_background');
		container.style.display = "none";
		renameBox.removeEventListener('keydown', renamefunc);
		renameBox.value = "";
		background.style.visibility = "hidden";
		background.removeEventListener('click', closeRenameBox);
	}
	
	background.addEventListener('click', closeRenameBox);
	// connect rename event
	renameBox.addEventListener('keydown', renamefunc);
}

function makeNode(name,type,filepath, rftp, argftp,side, another_rftp)
{
//	<div class="fileitem" id="dir2" draggable="true" ><div class="dir" ></div><p class="filelabel">dir1</p><button type="button" class="dustbox"></button></div>
	var newbtn = document.createElement('div');
	newbtn.setAttribute('class', "fileitem");
	newbtn.setAttribute('draggable', "true");
	var fileicon = document.createElement('div');
	if (type != "file" && type != "dir"){
		console.log("Unknown file type -> "+type);
		return null;
	}
	
	fileicon.setAttribute('class', type);
	newbtn.appendChild(fileicon);
	var filelabel = document.createElement('p');
	filelabel.setAttribute('class', "filelabel");
	filelabel.innerHTML = name;
	newbtn.appendChild(filelabel);
	
	console.log("makenode:"+filepath);
	function renameboxfunc(filelabel, filepath, rftp) {
		console.log("renameboxfunc:" + filepath);
		closeRenameBox();
		showRenameBox(filelabel, filepath, rftp);
	}
	filelabel.oncontextmenu = (function (label, fpath, ftp) {
		return function () {
			renameboxfunc(label, fpath, ftp);
		}
	}(filelabel, filepath, rftp));
	
	var dustbtn = document.createElement('button');
	dustbtn.setAttribute('class','dustbox');
	dustbtn.setAttribute('type','button');
	dustbtn.addEventListener('click',function(fpath,ftp){ return function(e){
		e.stopPropagation();
		if (this.getAttribute('class') == 'dustbox_ok') {
			console.log('DEL>:'+fpath);
			ftp.DeleteFile(fpath,function(rftp,filepath){
				console.log(rftp,filepath);
				FBOpenDir(rftp,filepath);
			}(rftp,getUpDir(filepath)));
		} else {
			this.setAttribute('class','dustbox_ok');
		}
	}}(filepath,rftp));
	newbtn.appendChild(dustbtn);

	addItemDragEvents(newbtn, side, filepath, rftp, another_rftp);

	if (type == 'dir')
		newbtn.setAttribute('onclick','FBOpenDir('+argftp+',"'+filepath+'")');
	
	newbtn.addEventListener('click',function(d){ return function(){
		d.setAttribute('class','dustbox');
	}}(dustbtn));

	return newbtn;
}


var rftpA = null;
var rftpB = null;

function FBOpenDir(rftp,path)
{
	rftp.UpdateList(path);
}

function getFilename(path)
{
	var dirs = path.split('/');
	return dirs[dirs.length - 1];
}


function getHostList()
{
/*	var xhr = new XMLHttpRequest();
	xhr.open("get", "./hostlist.json", true);
	xhr.onload = function(){
		var data = JSON.parse(this.responseText);*/
	socket.emit('REMOTEHOST:reqHostList','');

}

socket.on('updateRemoteHostList',function(sdata){
	var data = JSON.parse(sdata);
	var txt = "";
	var s_left  = document.getElementById('select_host_left');
	var s_right = document.getElementById('select_host_right');
	var name_left = '',
		name_right= '';

	s_left.innerHTML = "";
	s_right.innerHTML = "";
	for (var i=0; i<data.length; i++){
		//txt = txt + data.item[i].itemName + "　" + myData.item[i].itemPrice+"円<br>";
		console.log(data[i].name);

		var c1 = document.createElement('option');
		c1.setAttribute('class','option_host');
		c1.innerHTML = data[i].name;
		var c2 = document.createElement('option');
		c2.setAttribute('class','option_host');
		c2.innerHTML = data[i].name;
		s_left.appendChild(c1);
		s_right.appendChild(c2);
	}

	if (data.length > 0)
		name_left = name_right = data[0].name;

	s_left.addEventListener('change', function(){
		name_left = this.value;
		startFileList(name_left,name_right);
	});
	s_right.addEventListener('change', function(){
		name_right = this.value;
		startFileList(name_left,name_right);
	});

	// init
	console.log(name_left,name_right);
	startFileList(name_left,name_right);
});


function bootstrap()
{
	getHostList();
	document.oncontextmenu = function () {
		return false;
	}
}

/// @param target L or R for existence check
function withConfirm(target, src, dest, doFunction) {
	"use strict";
	//console.log("src::"+ src);
	//console.log("dst::"+dest);
	target.ExistsFile(target.GetDir(), src, function(exists) {
		// if file is existed, show confirm dialog
		if (exists) {
			showConfirm(function(confirm) {
				if (confirm) {
					doFunction(src, dest);
				}
				hiddenConfirm();
			});
		} else {
			doFunction(src, dest);
		}
	});
}

function withExistWarning(target, src, dest, doFunction) {
	"use strict";
	target.ExistsFile(target.GetDir(), src, function(exists) {
		// if file is existed, show confirm dialog
		if (exists) {
			showExistWarning(function() {
				hiddenExistWarning();
			});
		} else {
			doFunction(src, dest);
		}
	});
}

function startFileList(nameA,nameB)
{
	if (nameA == "" || nameB == "")
		return;
		
	console.log('startFileList');
	var newConnectA = false,
		newConnectB = false;
	
	var changeA = true,
		changeB = true;
	if (!rftpA || rftpA.hostname != nameA){
		var tmppath = undefined;
		if (rftpA)
			rftpA.delete();
		console.log('createA');
		rftpA = new RemoteFTP(socket, 'ConnectionA', nameA); // left
		newConnectA = true;
	} else {
		changeA = false; // no reflesh list item.
	}
	if (!rftpB || rftpB.hostname != nameB){
		var tmppath = undefined;
		if (rftpB)
			rftpB.delete();
		console.log('createB');
		rftpB = new RemoteFTP(socket, 'ConnectionB', nameB); // right
		newConnectB = true;
	} else {
		changeB = false; // no reflesh list item.
	}

	var menus = [
		{name:'copy_left',func:function(L,R){ return function(data){
			console.log('copy_left',data,L,R);
			if (L.host == R.host) {
				withConfirm(L, data.path, L.GetDir()+getFilename(data.path), function(src, dest) {
					L.CopyFile(src, dest);
				});
			}else{
				showmsgA('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'move_left',func:function(L,R){ return function(data){
			console.log('move_left',data);
			if (L.host == R.host) {
				withConfirm(L, data.path, L.GetDir()+getFilename(data.path), function(src, dest) {
					L.MoveFile(src, dest);
				});
			}else{
				showmsgA('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'extract_left',func:function(L,R){ return function(data){
			console.log('extract_left',data);
			if (L.host == R.host) {
				L.ExtractFile(data.path, L.GetDir());
			}else{
				showmsgA('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'compress_left',func:function(L,R){ return function(data){
			console.log('compress_left',data);
			if (L.host == R.host) {
				withConfirm(L, data.path + ".tar.gz", L.GetDir(), function(src, dest) {
					L.CompressFile(data.path, L.GetDir());
				});
			}else{
				showmsgA('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'upload_left',func:function(L,R){ return function(data){
			console.log('upload_left',data);
			if (L.host != 'localhost' && R.host == 'localhost') {
				var fname = data.path.split('/');
				fname = fname[fname.length-1];
				if (fname != '') {
					withConfirm(L, data.path, L.GetDir()+fname, function(src, dest) {
						L.UploadFile(src, dest);
					});
				}
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'download_left',func:function(L,R){ return function(data){
			console.log('download_left',data);
			if (L.host == 'localhost' && R.host != 'localhost') {
				var fname = data.path.split('/');
				fname = fname[fname.length-1];
				if (fname != '') {
					withConfirm(L, data.path, L.GetDir()+fname, function(src, dest) {
						R.DonwloadFile(src, dest);
					});
				}
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
/*-------------------------------------------------------------------------------*/
		{name:'copy_right',func:function(L,R){ return function(data){
			console.log('copy_right',data,L,R);
			if (L.host == R.host) {
				withConfirm(R, data.path, R.GetDir()+getFilename(data.path), function(src, dest) {
					R.CopyFile(src, dest);
				});
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'move_right',func:function(L,R){ return function(data){
			console.log('move_right',data);
			if (L.host == R.host) {
				withConfirm(R, data.path, R.GetDir()+getFilename(data.path), function(src, dest) {
					R.MoveFile(src, dest);
				});
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'extract_right',func:function(L,R){ return function(data){
			console.log('extract_right',data);
			if (L.host == R.host) {
				R.ExtractFile(data.path, R.GetDir());
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'compress_right',func:function(L,R){ return function(data){
			console.log('compress_right',data);
			if (L.host == R.host) {
				withConfirm(R, data.path + ".tar.gz", R.GetDir(), function(src, dest) {
					R.CompressFile(data.path, R.GetDir());
				});
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'upload_right',func:function(L,R){ return function(data){
			console.log('upload_right',data);
			if (L.host == 'localhost' && R.host != 'localhost') {
				var fname = data.path.split('/');
				fname = fname[fname.length-1];
				console.log('fname='+R.GetDir()+fname);
				if (fname != '') {
					withConfirm(R, data.path, R.GetDir()+fname, function(src, dest) {
						R.UploadFile(src, dest);
					});
				}
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
		{name:'download_right',func:function(L,R){ return function(data){
			console.log('download_right',data);
			if (L.host != 'localhost' && R.host == 'localhost') {
				var fname = data.path.split('/');
				fname = fname[fname.length-1];
				console.log('fname='+R.GetDir()+fname);
				if (fname != '') {
					withConfirm(R, data.path, R.GetDir()+fname, function(src, dest) {
						L.DonwloadFile(src, dest);
					});
				}
			}else{
				showmsgB('Not supported host type:'+L.host+' and '+R.host);
			}
		}}(rftpA,rftpB)},
	];
	for (i in menus) {
		var itm = document.getElementById(menus[i].name);
		if (!itm) {
			console.log('Failed to set event:'+menus[i].name);
		} else {
			addItemDropEvents(itm, menus[i].func);
		}
	}

	if (newConnectA){
		function showmsgA(msg){
			console.log('ConnectionA>'+msg);
			var node = document.getElementById("leftLog");
			node.innerHTML = msg;
		}
		function processedA(msg){
			console.log('ConnectionA>'+msg);
			var node = document.getElementById("leftLog");
			node.innerHTML = msg;
			FBOpenDir(rftpA, rftpA.GetDir());
			FBOpenDir(rftpB, rftpB.GetDir());
		}
		function clearListA()
		{
			var flist = document.getElementById('leftFileList');
			flist.innerHTML = ""; // clear
		}
		rftpA.on('connected',function(rftp){return function(msg){
			console.log("rftp Conneced:"+msg);
			showmsgA('Connected.');
		}}(rftpA));
		rftpA.on('error', showmsgA);
		rftpA.on('processed', processedA);
		rftpA.on('openDir', function(data){
			clearListA();
			var pnode = document.getElementById("leftPath");
			pnode.innerHTML = rftpA.GetDir();

			var unode = makeUpNode(rftpA.GetDir(),'rftpA');
			var flist = document.getElementById('leftFileList');
			flist.appendChild(unode);
			for(var i in data) {
				if (data[i].filename.charAt(0) == '.')
					continue;

				var type = '';
				if (data[i].longname.charAt(0) == 'd') { // dir
					type = 'dir';
				} else { // file
					type = 'file';
				}
				var node = makeNode(data[i].filename, type, rftpA.GetDir()+data[i].filename, rftpA, 'rftpA', 'left', rftpB);
				if (node)
					flist.appendChild(node);
			}
			
			// Force to reflesh list item callback functions.
			if (changeA && !changeB){
				changeA = changeB = false;
				rftpB.UpdateList(rftpB.tarDir);
			}
		});
		clearListA();
		showmsgA('Connecting.');
		rftpA.Connect();
	}
	
	if (newConnectB) {
		function showmsgB(msg){
			console.log('ConnectionB>'+msg);
			var node = document.getElementById("rightLog");
			node.innerHTML = msg;
		}
		function processedB(msg){
			console.log('ConnectionB>'+msg);
			var node = document.getElementById("rightLog");
			node.innerHTML = msg;
			//console.log('processedB:',rftpA.GetDir(),rftpB.GetDir());
			FBOpenDir(rftpA, rftpA.GetDir());
			FBOpenDir(rftpB, rftpB.GetDir());
		}
		function clearListB()
		{
			var flist = document.getElementById('rightFileList');
			flist.innerHTML = ""; // clear
		}

		rftpB.on('connected',function(rftp){return function(msg){
			console.log("rftp Conneced:"+msg);
			showmsgB('Connected.');
		}}(rftpB));
		rftpB.on('error', showmsgB);
		rftpB.on('processed', processedB);
		rftpB.on('openDir', function(data){
			clearListB();
			var pnode = document.getElementById("rightPath");
			pnode.innerHTML = rftpB.GetDir();

			var unode = makeUpNode(rftpB.GetDir(),'rftpB');
			var flist = document.getElementById('rightFileList');
			flist.appendChild(unode);
			for(var i in data) {
				if (data[i].filename.charAt(0) == '.')
					continue;

				var type = '';
				if (data[i].longname.charAt(0) == 'd') { // dir
					type = 'dir';
				} else { // file
					type = 'file';
				}
				var node = makeNode(data[i].filename, type, rftpB.GetDir()+data[i].filename, rftpB, 'rftpB', 'right', rftpA);
				if (node)
					flist.appendChild(node);
			}
			
			// Force to reflesh list item callback functions.
			if(!changeA && changeB){
				changeA = changeB = false;
				rftpA.UpdateList(rftpA.tarDir);
			}
		});
		clearListB();
		showmsgB('Connecting.');
		rftpB.Connect();
	}
} // bootstrap

/// hidden overwrite-confirm dialog
function hiddenConfirm(callback) {
	var save = document.getElementById('button_save'),
		cancel = document.getElementById('button_cancel');
	
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("confirm_dialog").style.visibility = "hidden";
}

/// show overwrite-confirm dialog
function showConfirm(callback) {
	var save = document.getElementById('button_save'),
		cancel = document.getElementById('button_cancel');
	
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("confirm_dialog").style.visibility = "visible";

	function savefunc() {
		callback(true);
		save.removeEventListener("click", savefunc, true);
		cancel.removeEventListener("click", cancelfunc, true);
	}
	function cancelfunc() {
		callback(false);
		save.removeEventListener("click", savefunc, true);
		cancel.removeEventListener("click", cancelfunc, true);
	}
	save.addEventListener("click", savefunc, true);
	cancel.addEventListener("click", cancelfunc, true);
}

/// hidden exist warning dialog
function hiddenExistWarning(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("exist_warning_dialog").style.visibility = "hidden";
}

/// show same file/directory exists dialog
function showExistWarning(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("exist_warning_dialog").style.visibility = "visible";

	function okfunc() {
		callback();
		save.removeEventListener("click", okfunc, true);
	}
	ok.addEventListener("click", okfunc, true);
}


