/*jslint devel:true, node:true, nomen:true */
/*global RemoteFTP */
// depends: editor.js

(function (editor) {
	"use strict";
	var str_textclass = 'nodePropertyText';

	function makePasswordInput(socket, node) {
		var row = document.createElement('div'),
			name = node.name_hr,
			name_hr = node.name_hr,
			testbtn,
			clickfunc,
			passwordInput;
		
		row.setAttribute('class', "hostitem");
		row.setAttribute('draggable', "false");
		name = document.createElement('span');
		name.setAttribute('class', "hostlabel");
		name.innerHTML = node.name_hr;
		row.appendChild(name);

		// input
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

		testbtn = document.createElement('button');
		testbtn.setAttribute('class', "connecttest");
		row.appendChild(testbtn);
		clickfunc = (function (name_hr) {
			return function (e) {
				e.stopPropagation();
				this.classList.remove('connecttest_ok');
				this.classList.remove('connecttest_fail');
				e.target.removeEventListener('click', clickfunc);// remove clickfunc

				console.log('connect test : ' + name_hr);
				var testConnect = new RemoteFTP(socket, 'TestConnect-' + name_hr, name_hr);
				testConnect.on('error', (function (thisptr, name_hr) {
					return function (data) {
						console.log('Connect Error', data);
						//var error_output = document.getElementById('error_output');
						//error_output.innerHTML = 'Connect Error' + data;
						thisptr.classList.add('connecttest_fail');
						testConnect.deleteConnection();
						testConnect = null;
						thisptr.addEventListener('click', clickfunc); // add clickfunc
					};
				}(this, name_hr)));
				testConnect.on('processed', function (data) { console.log('Processed', data); });
				testConnect.on('openDir', (function (thisptr, name_hr) {
					return function (data) {
						thisptr.classList.add('connecttest_ok');
						testConnect.deleteConnection();
						testConnect = null;
						thisptr.addEventListener('click', clickfunc); // add clickfunc
					};
				}(this, name_hr)));
				
				if (node.password) {
					testConnect.Connect(null, node.password);
				} else {
					testConnect.Connect(node.passphrase, null);
				}
			};
		}(name_hr));
		testbtn.addEventListener('click', clickfunc);

		row.addEventListener('click', (function (name_hr) {
			return function (e) {
				socket.emit('REMOTEHOST:REQHOSTINFO', {name_hr : name_hr});
			};
		}(name_hr)));
		return row;
	}
	
	function createPasswordInputView(socket, machines, okcallback) {
		var machine,
			i,
			row,
			nameElem,
			background = document.getElementById('popup_background'),
			regiterlist = document.getElementById('regiterlist'),
			okButton = document.getElementById('password_input_button_ok'),
			cancelButton = document.getElementById('password_input_button_cancel'),
			testbutton;
		
		background.onclick = function (evt) {
			background.style.display = "none";
		};
		if (okcallback) {
			okButton.onclick = okcallback;
		}
		
		regiterlist.innerHTML = "";
		regiterlist.onclick = function (evt) {
			evt.stopPropagation();
		};
		regiterlist.zIndex = 110;
		for (i in machines) {
			if (machines.hasOwnProperty(i)) {
				machine = machines[i];
				console.log("createPasswordInputView", machine);
				regiterlist.appendChild(makePasswordInput(socket, machine));
			}
		}
		background.style.display = "block";
	}
	
	window.password_input = {};
	window.password_input.makePasswordInput = makePasswordInput;
	window.password_input.createPasswordInputView = createPasswordInputView;
}(window.editor));