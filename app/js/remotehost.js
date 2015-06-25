/*jslint devel:true, node:true, nomen:true */
/*global require, global, $, io, socket, FileDialog, RemoteFTP */

var socket = io.connect(),
	filedialog = new FileDialog('remotedlg', false, false);

function openFileDialog(path, type) {
	"use strict";
	var items;
	console.log("openFileDialog");
	filedialog.dir_only = false;
	console.log("path:" + path);
	document.getElementById("fbList").style.display = "block";
	document.getElementById('projdir_path').value = path;
	document.getElementById('popup_background').style.visibility = "visible";
	if (type === "file") {
		// remove active class tag
		items = document.getElementsByClassName('activefileitem');
		if (items.length > 0) {
			items[0].className = "fileitem";
		}
	} else {
		filedialog.FileList(path);
	}
	// warning!: "targetPath" is global variable
	tarPath = path;
}

function openFileBrowser() {
	"use strict";
	var s = window.open("filebrowser.html", "filebrowser");
	s.focus(); // TODO: for firefox
}

function makeNode(cap, hostname) {
	// <div class="hostitem" draggable="false"><span class="hostlabel">user@host1</span><button type="button" class="dustbox"/></div>
	var newbtn = document.createElement('div'),
		name,
		dust,
		testbtn,
		clickfunc;
	
	newbtn.setAttribute('class', "hostitem");
	newbtn.setAttribute('draggable', "false");
	name = document.createElement('span');
	name.setAttribute('class', "hostlabel");
	name.innerHTML = cap;
	newbtn.appendChild(name);
	dust = document.createElement('button');
	dust.setAttribute('class', "dustbox2");
	newbtn.appendChild(dust);
	dust.addEventListener('click', (function (hostname) {
		return function (e) {
			e.stopPropagation();
			if (this.getAttribute('class') === 'dustbox_ok2') {
				console.log('DEL>:' + hostname);
				socket.emit('REMOTEHOST:DELHOST', {hostname : hostname});
			} else {
				this.setAttribute('class', 'dustbox_ok2');
			}
		};
	}(hostname)));
	
	testbtn = document.createElement('button');
	testbtn.setAttribute('class', "connecttest");
	newbtn.appendChild(testbtn);
	clickfunc = function (hostname) {
		return function (e) {
			e.stopPropagation();
			this.classList.remove('connecttest_ok');
			this.classList.remove('connecttest_fail');
			e.target.removeEventListener(e.type, arguments.callee);// remove clickfunc

			console.log('connect test : ' + hostname);
			var testConnect = new RemoteFTP(socket, 'TestConnect-' + hostname, hostname);
			testConnect.on('error', (function (thisptr, hostname) {
				return function (data) {
					console.log('Connect Error', data);
					var error_output = document.getElementById('error_output');
					error_output.innerHTML = 'Connect Error' + data;
					thisptr.classList.add('connecttest_fail');
					testConnect.delete();
					testConnect = null;
					thisptr.addEventListener('click', clickfunc(hostname)); // add clickfunc
				};
			}(this, hostname)));
			testConnect.on('processed', function (data) { console.log('Processed', data); });
			testConnect.on('openDir', (function (thisptr, hostname) {
				return function (data) {
					thisptr.classList.add('connecttest_ok');
					testConnect.delete();
					testConnect = null;
					thisptr.addEventListener('click', clickfunc(hostname)); // add clickfunc
				};
			}(this, hostname)));
			testConnect.Connect();
		};
	};
	testbtn.addEventListener('click', clickfunc(hostname));
	
	newbtn.addEventListener('click', (function (dust) {
		return function (e) {
			dust.setAttribute('class', 'dustbox2');
		};
	}(dust)));
	newbtn.addEventListener('click', (function (hostname) {
		return function (e) {
			socket.emit('REMOTEHOST:REQHOSTINFO', {hostname : hostname});
		};
	}(hostname)));
	return newbtn;
}

function updateAuthTypeEditable() {
	"use strict";
	var usepassword = document.getElementById('usepassword').checked;
	document.getElementById('input_password').disabled = !usepassword;
	document.getElementById('input_passphrase').disabled = usepassword;
	document.getElementById('input_key').disabled = usepassword;
	document.getElementById('browse_button').disabled = usepassword;
}

socket.on('updateRemoteInfo', function (sdata) {
	"use strict";
	var data = JSON.parse(sdata),
		usepassword = data.usepassword || false;
	//console.log(data);
	document.getElementById('input_label').value = data.label;
	document.getElementById('input_host').value  = data.host || '';
	document.getElementById('input_path').value  = data.path || '';
	document.getElementById('input_id').value    = data.username || '';
	document.getElementById('input_passphrase').value = ''; // hidden
	document.getElementById('input_password').value = ''; // hidden
	document.getElementById('input_key').value   = data.privateKeyFile || '';
	
	document.getElementById('usepassword').checked = usepassword;
	document.getElementById('usekeyfile').checked = !usepassword;
	updateAuthTypeEditable();
});

socket.on('updateRemoteHostList', function (sdata) {
	"use strict";
	var data = JSON.parse(sdata),
		ls,
		i,
		cap,
		c;
	//if (data.length > 0)
	//	name_left = name_right = data[0].name;

	ls = document.getElementById('regiterlist');
	ls.innerHTML = "";// clear

	for (i = 0; i < data.length; i = i + 1) {
		cap = data[i].name + " : " + data[i].username + "@" + data[i].hostname;
		c = makeNode(cap, data[i].name);
		ls.appendChild(c);
	}
});

//-----------------------------------
filedialog.registerSocketEvent(socket);
var tarPath = '';
function openfileDialog(path) {
	"use strict";
	var c,
		i;
	tarPath = path;
	i = document.getElementsByClassName("popup_center")[0];
	i.style.display = "block";
	if (path === '/') {
		document.getElementById('popup_background').style.visibility = "visible";
	} else {
		document.getElementById('popup_background').style.visibility = "hidden";
	}

	c = document.getElementById('projdir_path');
	c.value = path;
	filedialog.FileList(path);
}
function closefileDialog() {
	"use strict";
	var i = document.getElementsByClassName("popup_center")[0];
	i.style.display = "none";
	document.getElementById('popup_background').style.visibility = "hidden";
}

function open_selectedFile() {
	"use strict";
	console.log("OPENPATH:" + tarPath);
	closefileDialog();
	//openProject(tarPath);
	var kpath = document.getElementById('input_key');
	kpath.value = tarPath;
}


function reqHostList() {
	"use strict";
	socket.emit('REMOTEHOST:reqHostList', '');
}

function addBtn() {
	"use strict";
	var labelname  = document.getElementById('input_label').value,
		hostname   = document.getElementById('input_host').value,
		path       = document.getElementById('input_path').value,
		username   = document.getElementById('input_id').value,
		passphrase = document.getElementById('input_passphrase').value,
		sshkey     = document.getElementById('input_key').value,
		error_output = document.getElementById('error_output'),
		usepassword = document.getElementById('usepassword').checked,
		password = document.getElementById('input_password').value,
		valid = true;
	
	if (!labelname) {
		error_output.innerHTML = 'Label is empty';
		valid = false;
	}
	if (!hostname) {
		error_output.innerHTML = 'HOST is empty';
		valid = false;
	}
	if (!path) {
		error_output.innerHTML = 'Path is empty';
		valid = false;
	}

	if (hostname !== 'localhost') {
		if (!username) {
			error_output.innerHTML = 'ID is empty';
			valid = false;
		}
		if (!usepassword) {
			if (!passphrase) {
				error_output.innerHTML = 'Passphrase is empty';
				valid = false;
			}
			if (!sshkey) {
				error_output.innerHTML = 'KEY is empty';
				valid = false;
			}
		} else {
			if (!password) {
				error_output.innerHTML = 'Password is empty';
				valid = false;
			}
		}
	}
	if (!valid) {
		return;
	}
	
	socket.emit('REMOTEHOST:AddHost', JSON.stringify({
		name : labelname,
		hostname : hostname,
		path : path,
		username : username,
		passphrase : passphrase,
		sshkey : sshkey,
		usepassword : usepassword,
		password : password
	}));
	
	error_output.innerHTML = "Added.";
	document.getElementById('input_label').value    = '';
	document.getElementById('input_host').value     = '';
	document.getElementById('input_path').value     = '';
	document.getElementById('input_id').value       = '';
	document.getElementById('input_passphrase').value = '';
	document.getElementById('input_password').value = '';
	document.getElementById('input_key').value      = '';
	document.getElementById('usepassword').checked = false;
	document.getElementById('usekeyfile').checked = true;
	updateAuthTypeEditable();
}

function initGUI() {
	"use strict";
	document.getElementById('usepassword').onchange = function (evt) {
		updateAuthTypeEditable();
	};
	document.getElementById('usekeyfile').onchange = function (evt) {
		updateAuthTypeEditable();
	};
}

function boot() {
	"use strict";
	reqHostList();
	initGUI();
}


