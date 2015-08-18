/*jslint devel:true, node:true, nomen:true */
/*global RemoteFTP */
// depends: editor.js

(function (editor) {
	"use strict";
	var str_textclass = 'nodePropertyText',
		temporaryPass = {};

	function getCachePass(node, passwordInput) {
		if (temporaryPass.hasOwnProperty(node.type)) {
			if (passwordInput) {
				passwordInput.value = temporaryPass[node.type];
			}
			if (node.hasOwnProperty('sshkey')) {
				node.passphrase = temporaryPass[node.type];
			} else {
				node.password = temporaryPass[node.type];
			}
		}
	}
	
	function makePasswordInput(socket, node) {
		var row = document.createElement('div'),
			name = null,
			type = node.type,
			testbtn,
			clickfunc,
			passwordInput;
		
		row.setAttribute('class', "hostitem");
		row.setAttribute('draggable', "false");
		name = document.createElement('span');
		name.setAttribute('class', "hostlabel");
		if (node.server === 'localhost') {
			name.innerHTML = 'localhost';
		} else {
			name.innerHTML = node.name_hr;
		}
		row.appendChild(name);

		// input
		if (node.server !== 'localhost') {
			passwordInput = document.createElement('input');
			passwordInput.className = str_textclass;
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
			
			getCachePass(node, passwordInput);
		}

		testbtn = document.createElement('button');
		testbtn.setAttribute('class', "connecttest");
		row.appendChild(testbtn);
		clickfunc = (function (type, nodeData) {
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
						//var error_output = document.getElementById('error_output');
						//error_output.innerHTML = 'Connect Error' + data;
						thisptr.classList.add('connecttest_fail');
						testConnect.deleteConnection();
						testConnect = null;
						thisptr.addEventListener('click', clickfunc); // add clickfunc
					};
				}(this, type)));
				testConnect.on('processed', function (data) {
					console.log('Processed', data);
				});
				testConnect.on('openDir', (function (thisptr, type) {
					return function (data) {
						thisptr.classList.add('connecttest_ok');
						testConnect.deleteConnection();
						testConnect = null;
						temporaryPass[nodeData.type] = passwordInput.value;
						thisptr.addEventListener('click', clickfunc); // add clickfunc
					};
				}(this, type)));
				
				if (node.hasOwnProperty('sshkey')) {
					testConnect.ConnectTest(node.passphrase, null);
				} else {
					testConnect.ConnectTest(null, node.password);
				}
			};
		}(type, node));
		testbtn.addEventListener('click', clickfunc);

		row.addEventListener('click', (function (type) {
			return function (e) {
				socket.emit('REMOTEHOST:REQHOSTINFO', {type : type});
			};
		}(type)));
		return row;
	}
	
	function createPasswordInputView(socket, machines, okcallback, autoFlag) {
		var machine,
			i,
			row,
			nameElem,
			background = document.getElementById('popup_background'),
			regiterlist = document.getElementById('regiterlist'),
			okButton = document.getElementById('password_input_button_ok'),
			cancelButton = document.getElementById('password_input_button_cancel'),
			testbutton,
			isAuto = false;
		
		if (autoFlag) {
			isAuto = true;
			for (i in machines) {
				if (machines.hasOwnProperty(i)) {
					machine = machines[i];
					getCachePass(machine);
					if (!machine.hasOwnProperty('password') && !machine.hasOwnProperty('passphrase')) {
						isAuto = false;
					}
				}
			}
		}
		console.log("isAuto", isAuto);
		
		cancelButton.onclick = function (evt) {
			background.style.display = "none";
		};
		if (okcallback) {
			okButton.onclick = function (ev) {
				background.style.display = "none";
				okcallback(machines);
			};
		}
		
		if (isAuto && okcallback) {
			background.style.display = "none";
			okcallback(machines);
			return;
		}
		
		regiterlist.innerHTML = "";
		regiterlist.onclick = function (evt) {
			evt.stopPropagation();
		};
		regiterlist.zIndex = 110;
		for (i in machines) {
			if (machines.hasOwnProperty(i)) {
				machine = machines[i];
				getCachePass(machine);
				regiterlist.appendChild(makePasswordInput(socket, machine));
			}
		}
		background.style.display = "block";
	}
	
	window.password_input = {};
	window.password_input.makePasswordInput = makePasswordInput;
	window.password_input.createPasswordInputView = createPasswordInputView;
}(window.editor));
