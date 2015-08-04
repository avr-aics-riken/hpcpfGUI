/*jslint devel:true, node:true, nomen:true, regexp : true */
/*global require, global, $, io, socket, FileDialog, RemoteFTP */

var socket = io.connect(),
	filedialog = new FileDialog('remotedlg', false, false),
	tarPath = '';

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

function makeNode(cap, node) {
	"use strict";
	// <div class="hostitem" draggable="false"><span class="hostlabel">user@host1</span><button type="button" class="dustbox"/></div>
	var row = document.createElement('div'),
		name,
		type = node.type,
		dust,
		testbtn,
		clickfunc,
		passwordInput;
	
	row.setAttribute('class', "hostitem");
	row.setAttribute('draggable', "false");
	name = document.createElement('span');
	name.setAttribute('class', "hostlabel");
	name.innerHTML = cap;
	row.appendChild(name);
	dust = document.createElement('button');
	dust.setAttribute('class', "dustbox2");
	row.appendChild(dust);
	dust.addEventListener('click', (function (type) {
		return function (e) {
			e.stopPropagation();
			if (this.getAttribute('class') === 'dustbox_ok2') {
				console.log('DEL>:' + type);
				socket.emit('REMOTEHOST:DELHOST', {type : type});
			} else {
				this.setAttribute('class', 'dustbox_ok2');
			}
		};
	}(type)));

	// input
	if (node.hasOwnProperty('server') && node.server !== 'localhost') {
		passwordInput = document.createElement('input');
		passwordInput.className = 'nodePropertyText';
		passwordInput.type = "password";
		passwordInput.addEventListener('keyup', (function (nodeData, passwordInput) {
			return function (e) {
				if (nodeData.hasOwnProperty('sshkey')) {
					nodeData.passphrase = passwordInput.value;
				} else {
					nodeData.password = passwordInput.value;
				}
			};
		}(node, passwordInput)));
		row.appendChild(passwordInput);
	}
	
	testbtn = document.createElement('button');
	testbtn.setAttribute('class', "connecttest");
	row.appendChild(testbtn);
	clickfunc = (function (type) {
		return function (e) {
			e.stopPropagation();
			this.classList.remove('connecttest_ok');
			this.classList.remove('connecttest_fail');
			e.target.removeEventListener('click', clickfunc);// remove clickfunc

			console.log('connect test : ' + type);
			var testConnect = new RemoteFTP(socket, 'TestConnect-' + type, type);
			testConnect.on('error', (function (thisptr, type) {
				return function (data) {
					console.log('Connect Error', data);
					var error_output = document.getElementById('error_output');
					error_output.innerHTML = 'Connect Error' + data;
					thisptr.classList.add('connecttest_fail');
					testConnect.deleteConnection();
					testConnect = null;
					thisptr.addEventListener('click', clickfunc); // add clickfunc
				};
			}(this, type)));
			testConnect.on('processed', function (data) { console.log('Processed', data); });
			testConnect.on('openDir', (function (thisptr, type) {
				return function (data) {
					thisptr.classList.add('connecttest_ok');
					testConnect.deleteConnection();
					testConnect = null;
					thisptr.addEventListener('click', clickfunc); // add clickfunc
				};
			}(this, type)));
			
			if (node.password) {
				testConnect.ConnectTest(null, node.password);
			} else {
				testConnect.ConnectTest(node.passphrase, null);
			}
		};
	}(type));
	testbtn.addEventListener('click', clickfunc);
	
	row.addEventListener('click', (function (dust) {
		return function (e) {
			dust.setAttribute('class', 'dustbox2');
		};
	}(dust)));
	row.addEventListener('click', (function (type) {
		return function (e) {
			socket.emit('REMOTEHOST:REQHOSTINFO', {type : type});
		};
	}(type)));
	return row;
}

function updateAuthTypeEditable() {
	"use strict";
	var usepassword = document.getElementById('usepassword').checked;
	//document.getElementById('input_password').disabled = !usepassword;
	//document.getElementById('input_passphrase').disabled = usepassword;
	document.getElementById('input_key').disabled = usepassword;
	document.getElementById('browse_button').disabled = usepassword;
}

socket.on('updateRemoteInfo', function (sdata) {
	"use strict";
	var data = JSON.parse(sdata),
		usepassword = !data.hasOwnProperty('sshkey');
	console.log(data);
	document.getElementById('input_type').value = data.type;
	document.getElementById('input_label').value = data.name_hr || '';
	document.getElementById('input_host').value  = data.server || '';
	document.getElementById('input_path').value  = data.workpath || '';
	document.getElementById('input_id').value    = data.userid || '';
	//document.getElementById('input_passphrase').value = ''; // hidden
	//document.getElementById('input_password').value = ''; // hidden
	document.getElementById('input_key').value   = data.sshkey || '';
	
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

	console.log(sdata);
	ls = document.getElementById('regiterlist');
	ls.innerHTML = "";// clear

	for (i = 0; i < data.length; i = i + 1) {
		cap = data[i].type + " : " + data[i].name_hr + " : " + data[i].userid + "@" + data[i].server;
		console.log("datadata", data[i]);
		c = makeNode(cap, data[i]);
		ls.appendChild(c);
	}
});

//-----------------------------------
filedialog.registerSocketEvent(socket);
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
		host   = document.getElementById('input_host').value,
		path       = document.getElementById('input_path').value,
		userid   = document.getElementById('input_id').value,
		//passphrase = document.getElementById('input_passphrase').value,
		sshkey     = document.getElementById('input_key').value,
		error_output = document.getElementById('error_output'),
		usepassword = document.getElementById('usepassword').checked,
		type = document.getElementById('input_type').value,
		//password = document.getElementById('input_password').value,
		valid = true;
	
	if (!labelname && host !== 'localhost') {
		error_output.innerHTML = 'Label is empty';
		valid = false;
	}
	if (!host) {
		error_output.innerHTML = 'HOST is empty';
		valid = false;
	}
	if (!path) {
		error_output.innerHTML = 'Path is empty';
		valid = false;
	}

	if (host !== 'localhost') {
		if (!userid) {
			error_output.innerHTML = 'ID is empty';
			valid = false;
		}
		if (!usepassword) {
			if (!sshkey) {
				error_output.innerHTML = 'KEY is empty';
				valid = false;
			}
		}
	}
	if (!valid) {
		return;
	}
	
	if (usepassword) {
		socket.emit('REMOTEHOST:AddHost', JSON.stringify({
			type : type,
			name_hr : labelname,
			server : host,
			workpath : path,
			userid : userid
		}));
	} else {
		socket.emit('REMOTEHOST:AddHost', JSON.stringify({
			type : type,
			name_hr : labelname,
			server : host,
			workpath : path,
			userid : userid,
			sshkey : sshkey
		}));
	}
	
	error_output.innerHTML = "Added.";
	document.getElementById('input_label').value    = '';
	document.getElementById('input_host').value     = '';
	document.getElementById('input_path').value     = '';
	document.getElementById('input_id').value       = '';
	document.getElementById('input_type').value       = '';
	//document.getElementById('input_passphrase').value = '';
	//document.getElementById('input_password').value = '';
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
	document.getElementById('input_type').onchange = function (evt) {
		var val = evt.target.value,
			res = "",
			i;
		for (i = 0; i < val.length; i = i + 1) {
			if (val[i].match(/^[a-zA-Z0-9!-/:-@¥[-`{-~]+$/)) {
				console.log(val[i]);
				res = res + val[i];
			}
		}
		evt.target.value = res;
	};
}

function boot() {
	"use strict";
	reqHostList();
	initGUI();
}


