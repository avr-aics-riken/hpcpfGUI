/*jslint devel:true, node:true, nomen:true */
/*global require, RemoteFTP, $, io, socket */
var socket = io.connect(),
	password_input = window.password_input;

function registerRemoteHost() {
	"use strict";
	var s = window.open("remotehost.html", "remotehost");
	s.focus();
}

function getUpDir(path) { // fix me beautiful
	"use strict";
	var p,
		uppath,
		i;
	
	if (path === "/") {
		return "/";
	}
	p = path.split("/");
	if (p[p.length - 1] === "") {
		p.pop();
	}
	uppath = "/";
	for (i = 0; i < p.length - 1; i = i + 1) {
		if (p[i] !== "") {
			uppath += p[i] + '/';
		}
	}
	if (uppath === "//") {
		uppath = "/";
	}
	return uppath;
}

function makeUpNode(curfilepath, argftp) {
	"use strict";
//	<div class="fileitem" id="dir1" draggable="false"><div class="back"></div><p class="filelabel">..</p></div>
	var filepath = getUpDir(curfilepath),
		newbtn = document.createElement('div'),
		fileicon;
	
	newbtn.setAttribute('class', "fileitem");
	//newbtn.setAttribute('draggable', "false");
	fileicon = document.createElement('div');
	fileicon.setAttribute('class', 'back');
	newbtn.appendChild(fileicon);
	newbtn.setAttribute('onclick', 'fbOpenDir(' + argftp + ',"' + filepath + '")');
	return newbtn;
}

function getOtherside(side) {
	"use strict";
	if (side === 'right') {
		return 'left';
	} else {
		return 'right';
	}
}

function addItemDragEvents(tar, side, filepath, my_rftp, ano_rftp) {
	"use strict";
	//console.log(my_rftp, ano_rftp);
	//console.log("!!!DRAGEVENT!!!:[" + my_rftp.server + "],[" + ano_rftp.server + "]");
	var othersideActionMenu = 'actionmenu_' + getOtherside(side);
	if (my_rftp.server === 'localhost' && ano_rftp.server !== 'localhost') {
		othersideActionMenu = 'actionmenu_' + getOtherside(side) + '_upload';
	} else if (my_rftp.server !== 'localhost' && ano_rftp.server === 'localhost') {
		othersideActionMenu = 'actionmenu_' + getOtherside(side) + '_download';
	} else if (my_rftp.server !== 'localhost' && ano_rftp.server !== 'localhost' && my_rftp.server !== ano_rftp.server) {
		othersideActionMenu = 'actionmenu_' + getOtherside(side) + '_none';
	}

	
	// add drag event
	tar.addEventListener('dragstart', (function (fpath, othersideActionMenu) {
		return function (e) {
			e.dataTransfer.effectAllowed = 'move';
			//e.dataTransfer.setData('text/json', JSON.stringify({path:fpath}));
			e.dataTransfer.setData('text', JSON.stringify({path : fpath}));

			var am = document.getElementById(othersideActionMenu);
			am.style.display = "block";

		};
	}(filepath, othersideActionMenu)), false);
	tar.addEventListener('dragend', (function (othersideActionMenu) {
		return function (e) {
			var am = document.getElementById(othersideActionMenu);
			am.style.display = "none";
		};
	}(othersideActionMenu)));
}
function addItemDropEvents(tar, dropcallback) {
	"use strict";
//	tar.addEventListener('dragover', function(e){
	tar.ondragover = function (e) {
		e.preventDefault();
	};//,false);
//	tar.addEventListener('dragenter', function(e){
	tar.ondragenter = function (e) {
		e.preventDefault();
		this.classList.add('actionitem_active');
	};//,false);
//	tar.addEventListener('dragleave', function(e){
	tar.ondragleave = function (e) {
		e.preventDefault();
		this.classList.remove('actionitem_active');
	};//,false);
	
//	tar.addEventListener('drop',function(e) {
	tar.ondrop = function (e) {
		var sjson,
			data;
		this.classList.remove('actionitem_active');
		if (e.stopPropagation) {
			e.stopPropagation(); // Stops some browsers from redirecting.
		}
		//var sjson = e.dataTransfer.getData('text/json');
		sjson = e.dataTransfer.getData('text');
		//console.log('droped:'+sjson);
		data = null;
		try {
			data = JSON.parse(sjson);
		} catch (er) {
			console.log('Failed JSON parse:' + sjson);
		}
		if (dropcallback) {
			dropcallback(data);
		}
		
		return false;
	};//, false);
	
}

function closeRenameBox() {
	"use strict";
	var container = document.getElementById('rename_box_container'),
		renameBox = document.getElementById('rename_box'),
		background = document.getElementById('popup_background');
	container.style.display = "none";
	renameBox.value = "";
	background.style.visibility = "hidden";
	background.removeEventListener('click', closeRenameBox);
}

function fbOpenDir(rftp, path) {
	"use strict";
	rftp.UpdateList(path);
}

function getFilename(path) {
	"use strict";
	var dirs = path.split('/');
	return dirs[dirs.length - 1];
}

/// show overwrite-confirm dialog
function showConfirm(callback) {
	"use strict";
	var save = document.getElementById('button_save'),
		cancel = document.getElementById('button_cancel'),
		savefunc,
		cancelfunc;
	
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("confirm_dialog").style.visibility = "visible";

	savefunc = function () {
		callback(true);
		save.removeEventListener("click", savefunc, true);
		cancel.removeEventListener("click", cancelfunc, true);
	};
	cancelfunc = function () {
		callback(false);
		save.removeEventListener("click", savefunc, true);
		cancel.removeEventListener("click", cancelfunc, true);
	};
	save.addEventListener("click", savefunc, true);
	cancel.addEventListener("click", cancelfunc, true);
}

/// hidden exist warning dialog
function hiddenExistWarning(callback) {
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("exist_warning_dialog").style.visibility = "hidden";
}

/// show same file/directory exists dialog
function showExistWarning(callback) {
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("exist_warning_dialog").style.visibility = "visible";

	function okfunc() {
		callback();
		ok.removeEventListener("click", okfunc, true);
	}
	ok.addEventListener("click", okfunc, true);
}

function withExistWarning(target, src, dest, doFunction) {
	"use strict";
	target.ExistsFile(target.GetDir(), src, function (exists) {
		// if file is existed, show confirm dialog
		if (exists) {
			showExistWarning(function () {
				hiddenExistWarning();
			});
		} else {
			doFunction(src, dest);
		}
	});
}


function showRenameBox(filelabel, fpath, ftp) {
	"use strict";
	var container = document.getElementById('rename_box_container'),
		renameBox = document.getElementById('rename_box'),
		scrollLeft = (document.body.scrollLeft + document.documentElement.scrollLeft),
		scrollTop  = (document.body.scrollTop + document.documentElement.scrollTop),
		bounds = filelabel.getBoundingClientRect(),
		background = document.getElementById('popup_background');
	container.style.display = "block";
	container.style.position = "absolute";
	container.style.left = (bounds.left + scrollLeft) + "px";
	container.style.top  = (bounds.top + scrollTop) + "px";
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
		if (keyCode === 13) { // Enter
			if (document.getElementById('rename_box_container').style.display === "block") {
				if (fpath !== ftp.GetDir() + newname) {
					withExistWarning(ftp, ftp.GetDir() + newname, ftp.GetDir() + newname, function (src, dest) {
						ftp.MoveFile(ftp.GetDir() + getFilename(fpath), dest);
					});
				}
				closeRenameBox();
				renameBox.removeEventListener('keydown', renamefunc);
			}
		} else if (keyCode === 27) { // Esc
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

function makeNode(name, type, isdisabled, filepath, rftp, argftp, side, another_rftp) {
	"use strict";
//	<div class="fileitem" id="dir2" draggable="true" ><div class="dir" ></div><p class="filelabel">dir1</p><button type="button" class="dustbox"></button></div>
	var newbtn = document.createElement('div'),
		fileicon,
		filelabel,
		dustbtn;
	
	if (isdisabled) {
		newbtn.setAttribute('class', "fileitem fileitem_disabled");
	} else {
		newbtn.setAttribute('class', "fileitem");
		newbtn.setAttribute('draggable', "true");
	}
	fileicon = document.createElement('div');
	if (type !== "file" && type !== "dir") {
		console.log("Unknown file type -> " + type);
		return null;
	}
	
	fileicon.setAttribute('class', type);
	newbtn.appendChild(fileicon);
	filelabel = document.createElement('p');
	if (isdisabled) {
		filelabel.setAttribute('class', "filelabel filelabel_disabled");
	} else {
		filelabel.setAttribute('class', "filelabel");
	}
	filelabel.innerHTML = name;
	newbtn.appendChild(filelabel);
	
	console.log("makenode:" + filepath);
	function renameboxfunc(filelabel, filepath, rftp) {
		console.log("renameboxfunc:" + filepath);
		closeRenameBox();
		showRenameBox(filelabel, filepath, rftp);
	}
	
	if (!isdisabled) {
		filelabel.oncontextmenu = (function (label, fpath, ftp) {
			return function () {
				renameboxfunc(label, fpath, ftp);
			};
		}(filelabel, filepath, rftp));

		dustbtn = document.createElement('button');
		dustbtn.setAttribute('class', 'dustbox');
		dustbtn.setAttribute('type', 'button');
		dustbtn.addEventListener('click', (function (fpath, ftp) {
			return function (e) {
				e.stopPropagation();
				if (this.getAttribute('class') === 'dustbox_ok') {
					console.log('DEL>:' + fpath);
					ftp.DeleteFile(fpath, (function (rftp, filepath) {
						console.log(rftp, filepath);
						fbOpenDir(rftp, filepath);
					}(rftp, getUpDir(filepath))));
				} else {
					this.setAttribute('class', 'dustbox_ok');
				}
			};
		}(filepath, rftp)));
		newbtn.appendChild(dustbtn);

		addItemDragEvents(newbtn, side, filepath, rftp, another_rftp);

		if (type === 'dir') {
			newbtn.setAttribute('onclick', 'fbOpenDir(' + argftp + ',"' + filepath + '")');
		}

		newbtn.addEventListener('click', (function (d) {
			return function () {
				d.setAttribute('class', 'dustbox');
			};
		}(dustbtn)));
	}
	
	newbtn.disabled = isdisabled;
	filelabel.disabled = isdisabled;
	return newbtn;
}


var rftpA = null;
var rftpB = null;


function getHostList() {
	"use strict";
/*	var xhr = new XMLHttpRequest();
	xhr.open("get", "./hostlist.json", true);
	xhr.onload = function(){
		var data = JSON.parse(this.responseText);*/
	socket.emit('REMOTEHOST:reqHostList', '');

}


function bootstrap() {
	"use strict";
	getHostList();
	document.oncontextmenu = function () {
		return false;
	};
}

/// hidden overwrite-confirm dialog
function hiddenConfirm(callback) {
	"use strict";
	var save = document.getElementById('button_save'),
		cancel = document.getElementById('button_cancel');
	
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("confirm_dialog").style.visibility = "hidden";
}

/// @param target L or R for existence check
function withConfirm(target, src, dest, doFunction) {
	"use strict";
	//console.log("src::"+ src);
	//console.log("dst::"+dest);
	target.ExistsFile(target.GetDir(), src, function (exists) {
		// if file is existed, show confirm dialog
		if (exists) {
			showConfirm(function (confirm) {
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

function startFileList(dataA, dataB) {
	"use strict";
	console.log('startFileList');
	
	var nameA = dataA.name_hr,
		nameB = dataB.name_hr,
		newConnectA = false,
		newConnectB = false,
		changeA = true,
		changeB = true,
		tmppath,
		menus,
		i,
		itm;
	
	console.log("startFileList", nameA, nameB);
	if (nameA === "" || dataB === "") {
		return;
	}
	
	function showmsgA(msg) {
		console.log('ConnectionA>' + msg);
		var node = document.getElementById("leftLog");
		node.innerHTML = msg;
	}
	function processedA(msg) {
		console.log('ConnectionA>' + msg);
		var node = document.getElementById("leftLog");
		node.innerHTML = msg;
		fbOpenDir(rftpA, rftpA.GetDir());
		fbOpenDir(rftpB, rftpB.GetDir());
	}
	function clearListA() {
		var flist = document.getElementById('leftFileList');
		flist.innerHTML = ""; // clear
	}
	function showmsgB(msg) {
		console.log('ConnectionB>' + msg);
		var node = document.getElementById("rightLog");
		node.innerHTML = msg;
	}
	function processedB(msg) {
		console.log('ConnectionB>' + msg);
		var node = document.getElementById("rightLog");
		node.innerHTML = msg;
		//console.log('processedB:',rftpA.GetDir(),rftpB.GetDir());
		fbOpenDir(rftpA, rftpA.GetDir());
		fbOpenDir(rftpB, rftpB.GetDir());
	}
	function clearListB() {
		var flist = document.getElementById('rightFileList');
		flist.innerHTML = ""; // clear
	}
	if (!rftpA || rftpA.name_hr !== nameA) {
		tmppath = undefined;
		if (rftpA) {
			rftpA.deleteConnection();
		}
		console.log('createA');
		rftpA = new RemoteFTP(socket, 'ConnectionA', nameA); // left
		newConnectA = true;
	} else {
		changeA = false; // no reflesh list item.
	}
	if (!rftpB || rftpB.name_hr !== nameB) {
		tmppath = undefined;
		if (rftpB) {
			rftpB.deleteConnection();
		}
		console.log('createB');
		rftpB = new RemoteFTP(socket, 'ConnectionB', nameB); // right
		newConnectB = true;
	} else {
		changeB = false; // no reflesh list item.
	}

	menus = [
		{name : 'copy_left', func : (function (L, R) {
			return function (data) {
				console.log('copy_left', data, L, R);
				if (L.server === R.server) {
					console.log(data);
					withConfirm(L, data.path, L.GetDir() + getFilename(data.path), function (src, dest) {
						L.CopyFile(src, dest);
					});
				} else {
					showmsgA('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'move_left', func : (function (L, R) {
			return function (data) {
				console.log('move_left', data);
				if (L.server === R.server) {
					withConfirm(L, data.path, L.GetDir() + getFilename(data.path), function (src, dest) {
						L.MoveFile(src, dest);
					});
				} else {
					showmsgA('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'extract_left', func : (function (L, R) {
			return function (data) {
				console.log('extract_left', data);
				if (L.server === R.server) {
					L.ExtractFile(data.path, L.GetDir());
				} else {
					showmsgA('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'compress_left', func : (function (L, R) {
			return function (data) {
				console.log('compress_left', data);
				if (L.server === R.server) {
					withConfirm(L, data.path + ".tar.gz", L.GetDir(), function (src, dest) {
						L.CompressFile(data.path, L.GetDir());
					});
				} else {
					showmsgA('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'upload_left', func : (function (L, R) {
			return function (data) {
				console.log('upload_left', data);
				if (L.server !== 'localhost' && R.server === 'localhost') {
					var fname = data.path.split('/');
					fname = fname[fname.length - 1];
					if (fname !== '') {
						withConfirm(L, data.path, L.GetDir() + fname, function (src, dest) {
							L.UploadFile(src, dest);
						});
					}
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'download_left', func : (function (L, R) {
			return function (data) {
				console.log('download_left', data);
				if (L.server === 'localhost' && R.server !== 'localhost') {
					var fname = data.path.split('/');
					fname = fname[fname.length - 1];
					if (fname !== '') {
						withConfirm(L, data.path, L.GetDir() + fname, function (src, dest) {
							R.DonwloadFile(src, dest);
						});
					}
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
/*-------------------------------------------------------------------------------*/
		{name : 'copy_right', func : (function (L, R) {
			return function (data) {
				console.log('copy_right', data, L, R);
				if (L.server === R.server) {
					withConfirm(R, data.path, R.GetDir() + getFilename(data.path), function (src, dest) {
						R.CopyFile(src, dest);
					});
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'move_right', func : (function (L, R) {
			return function (data) {
				console.log('move_right', data);
				if (L.server === R.server) {
					withConfirm(R, data.path, R.GetDir() + getFilename(data.path), function (src, dest) {
						R.MoveFile(src, dest);
					});
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'extract_right', func : (function (L, R) {
			return function (data) {
				console.log('extract_right', data);
				if (L.server === R.server) {
					R.ExtractFile(data.path, R.GetDir());
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'compress_right', func : (function (L, R) {
			return function (data) {
				console.log('compress_right', data);
				if (L.server === R.server) {
					withConfirm(R, data.path + ".tar.gz", R.GetDir(), function (src, dest) {
						R.CompressFile(data.path, R.GetDir());
					});
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'upload_right', func : (function (L, R) {
			return function (data) {
				console.log('upload_right', data);
				if (L.server === 'localhost' && R.server !== 'localhost') {
					var fname = data.path.split('/');
					fname = fname[fname.length - 1];
					console.log('fname=' + R.GetDir() + fname);
					if (fname !== '') {
						withConfirm(R, data.path, R.GetDir() + fname, function (src, dest) {
							R.UploadFile(src, dest);
						});
					}
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))},
		{name : 'download_right', func : (function (L, R) {
			return function (data) {
				console.log('download_right', data);
				if (L.server !== 'localhost' && R.server === 'localhost') {
					var fname = data.path.split('/');
					fname = fname[fname.length - 1];
					console.log('fname=' + R.GetDir() + fname);
					if (fname !== '') {
						withConfirm(R, data.path, R.GetDir() + fname, function (src, dest) {
							L.DonwloadFile(src, dest);
						});
					}
				} else {
					showmsgB('Not supported host type:' + L.server + ' and ' + R.server);
				}
			};
		}(rftpA, rftpB))}
	];
	for (i in menus) {
		if (menus.hasOwnProperty(i)) {
			itm = document.getElementById(menus[i].name);
			if (!itm) {
				console.log('Failed to set event:' + menus[i].name);
			} else {
				addItemDropEvents(itm, menus[i].func);
			}
		}
	}

	if (newConnectA) {
		rftpA.on('connected', (function (rftp) {
			return function (msg) {
				console.log("rftp Conneced:" + msg);
				showmsgA('Connected.');
			};
		}(rftpA)));
		rftpA.on('error', showmsgA);
		rftpA.on('processed', processedA);
		rftpA.on('openDir', function (data) {
			var pnode,
				unode,
				flist,
				i,
				type,
				node,
				isdisabled = false;
			
			clearListA();
			pnode = document.getElementById("leftPath");
			pnode.innerHTML = rftpA.GetDir();

			unode = makeUpNode(rftpA.GetDir(), 'rftpA');
			flist = document.getElementById('leftFileList');
			flist.appendChild(unode);
			for (i in data) {
				if (data.hasOwnProperty(i)) {
					if (data[i].filename.charAt(0) !== '.') {
						type = '';
						if (data[i].longname.charAt(0) === 'd') { // dir
							type = 'dir';
						} else { // file
							type = 'file';
						}
						isdisabled = data[i].excludepath;
						node = makeNode(data[i].filename, type, isdisabled, rftpA.GetDir() + data[i].filename, rftpA, 'rftpA', 'left', rftpB);
						if (node) {
							flist.appendChild(node);
						}
					}
				}
			}
			
			// Force to reflesh list item callback functions.
			if (changeA && !changeB) {
				changeA = changeB = false;
				rftpB.UpdateList(rftpB.tarDir);
			}
		});
		clearListA();
		showmsgA('Connecting.');
		if (dataA.password) {
			rftpA.Connect(null, dataA.password);
		} else {
			rftpA.Connect(dataA.passphrase, null);
		}
	}
	
	if (newConnectB) {

		rftpB.on('connected', (function (rftp) {
			return function (msg) {
				console.log("rftp Conneced:" + msg);
				showmsgB('Connected.');
			};
		}(rftpB)));
		rftpB.on('error', showmsgB);
		rftpB.on('processed', processedB);
		rftpB.on('openDir', function (data) {
			var pnode,
				unode,
				flist,
				i,
				type,
				node,
				isdisabled = false;
			
			clearListB();
			pnode = document.getElementById("rightPath");
			pnode.innerHTML = rftpB.GetDir();

			unode = makeUpNode(rftpB.GetDir(), 'rftpB');
			flist = document.getElementById('rightFileList');
			flist.appendChild(unode);
			for (i in data) {
				if (data.hasOwnProperty(i)) {
					if (data[i].filename.charAt(0) !== '.') {
						type = '';
						if (data[i].longname.charAt(0) === 'd') { // dir
							type = 'dir';
						} else { // file
							type = 'file';
						}
						isdisabled = data[i].excludepath;
						node = makeNode(data[i].filename, type, isdisabled, rftpB.GetDir() + data[i].filename, rftpB, 'rftpB', 'right', rftpA);
						if (node) {
							flist.appendChild(node);
						}
					}
				}
			}
			
			// Force to reflesh list item callback functions.
			if (!changeA && changeB) {
				changeA = changeB = false;
				rftpA.UpdateList(rftpA.tarDir);
			}
		});
		clearListB();
		showmsgB('Connecting.');
		if (dataB.password) {
			rftpB.Connect(null, dataB.password);
		} else {
			rftpB.Connect(dataB.passphrase, null);
		}
	}
} // startFileList

function startPasswordInput(nameA, nameB) {
	"use strict";
	var dataA,
		dataB;

	socket.emit('REMOTEHOST:REQHOSTINFO', {name_hr : nameA});
	socket.once('updateRemoteInfo', function (adata) {
		dataA = JSON.parse(adata);
		socket.emit('REMOTEHOST:REQHOSTINFO', {name_hr : nameB});
		socket.once('updateRemoteInfo', function (bdata) {
			var datas = {};
			dataB = JSON.parse(bdata);
			
			if (dataA.server !== 'localhost') {
				datas[nameA] = dataA;
			}
			if (dataB.server !== 'localhost') {
				datas[nameB] = dataB;
			}
			
			if (Object.keys(datas).length > 0) {
				password_input.createPasswordInputView(socket, datas, function () {
					startFileList(dataA, dataB);
				});
			} else {
				startFileList(dataA, dataB);
			}
		});
	});
}

socket.on('updateRemoteHostList', function (sdata) {
	"use strict";
	var data = JSON.parse(sdata),
		txt = "",
		s_left  = document.getElementById('select_host_left'),
		s_right = document.getElementById('select_host_right'),
		name_left = '',
		name_right = '',
		i,
		c1,
		c2;

	s_left.innerHTML = "";
	s_right.innerHTML = "";
	for (i = 0; i < data.length; i = i + 1) {
		//txt = txt + data.item[i].itemName + "　" + myData.item[i].itemPrice+"円<br>";
		console.log(data[i].name_hr);

		c1 = document.createElement('option');
		c1.setAttribute('class', 'option_host');
		c1.innerHTML = data[i].name_hr;
		c2 = document.createElement('option');
		c2.setAttribute('class', 'option_host');
		c2.innerHTML = data[i].name_hr;
		s_left.appendChild(c1);
		s_right.appendChild(c2);
	}

	if (data.length > 0) {
		name_left = name_right = data[0].name_hr;
	}

	s_left.addEventListener('change', function () {
		name_left = this.value;
		startPasswordInput(name_left, name_right);
	});
	s_right.addEventListener('change', function () {
		name_right = this.value;
		startPasswordInput(name_left, name_right);
	});

	// init
	console.log(name_left, name_right);
	startPasswordInput(name_left, name_right);
});



