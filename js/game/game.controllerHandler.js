window.game = window.game || {};

class controller {

	constructor(gamepad, i) {
		this.gamePad = gamepad;
		this.player = null;
		this.gamepadIndex = i;
		this.pressed = {};
		this.val = {};
		this.axes = {};
	}
			// keyCodesPS4 = { 
			// 	0: "cross",
			// 	1: "circle",
			// 	2: "square",
			// 	3: "triangle",
			// 	4: "L1",
			// 	5: "R1",
			// 	6: "L2",
			// 	7: "R2",
			// 	8: "share",
			// 	9: "start",
			// 	10: "L3",
			// 	11: "R3",
			// 	12: "up",
			// 	13: "down",
			// 	14: "left",
			// 	15: "right",
			// 	16: "ps",
			// };

			// axisCodePS4 = {
			// 	0: "leftHorizontal",
			// 	1: "leftVertical",
			// 	2: "rightHorizontal",
			// 	3: "rightVertical"
			// };

			

			poll() { //poll controller buttons
				var flag = false;
				for (var i = 0; i < this.gamePad.buttons.length; i++) {
	      			var val = this.gamePad.buttons[i].value;
	      			var pressedt = val == 1;
        			this.pressed[i] = pressedt;
       				this.val[i] = val.value;
       				if (pressedt) flag = true;
	    		}
	    		for (i = 0; i < this.gamePad.axes.length; i++) {
	    			if ( i == 3)
	      				this.axes[i] = -1*this.gamePad.axes[i].toFixed(4);
	      			else 
	      				this.axes[i] = this.gamePad.axes[i].toFixed(4);
	      			if (Math.abs(this.axes[i]) < 0.1) this.axes[i] = 0;
	    		}
	    		if (flag) return true;
	    		else return false;
			};
		}

window.game.controllerHandler = function () {
	var _controllerHandler = {

		controller: [],
		controllers: 0,
		playerHandler: null,

		connecthandler: function(e) { //connect binding for controller connect event
	  		_controllerHandler.addgamepad(e.gamepad);
		},

		addgamepad: function(gamepad) { //add gamepad
			var temp = new controller(gamepad, gamepad.index);
			_controllerHandler.controllers++;
		  	_controllerHandler.controller.push(temp);
		},

		getControllerByPlayer: function(playerNumber) { //detect controller using player number
			for (var i = 0; i < _controllerHandler.controller.length; i++) {
				if (_controllerHandler.controller[i] != null){
					if (_controllerHandler.controller[i].player == playerNumber) {
						return _controllerHandler.controller[i];
					}
				}
			}
			return null;
		},	

		disconnecthandler: function(e) { //disconnect binding for controller disconnect event
		  	_controllerHandler.removegamepad(e.gamepad);
		},

		removegamepad: function(gamepad) { //remove gamepad
		  	for (var i = 0; i < _controllerHandler.controller.length; i++) {
		  		if (_controllerHandler.controller[i].gamepadIndex == gamepad.index) {
		  			_controllerHandler.players--;
		  			_controllerHandler.playerHandler.removePlayer(_controllerHandler.controller[i].player);
		  			_controllerHandler.controller.splice(i,1);
		  			return;
		  		}
		  	}
		},

		updateStatus: function() { //update controllers and poll buttons
		  _controllerHandler.scangamepads();

		  var j;

		  for (j in _controllerHandler.controller) {
		    	var temp = _controllerHandler.controller[j];
		    	if (temp == null) {
		    		console.log("controller missing");
		    	}
		    	if (temp.poll()) {
		    		_controllerHandler.buttonPressed(temp);
		    	}
		  }

		  setTimeout(function(){ window.requestAnimationFrame(_controllerHandler.updateStatus); }, 1000/30); //caps framerate at 30fps preventing framerate drop in game
		  
		},

		buttonPressed: function(t) { //0 is cross
			_controllerHandler.anyControllerButtonPressed();
			if (t.pressed[0] && _controllerHandler.controllers > _controllerHandler.playerHandler.players && (t.player == null)) {
				_controllerHandler.playerHandler.addPlayer(t);
				t.player = _controllerHandler.playerHandler.player[_controllerHandler.playerHandler.player.length-1];
			}
		},

		anyControllerButtonPressed : function() {

		},

		scangamepads: function() { //scan gamepads and add if needed
		  var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
		  for (var i = 0; i < 4; i++) {
		    if (gamepads[i]) {
				var found = false;
				for (var j = 0; j < 4; j++) {
					if (_controllerHandler.controller[j]) {
						if (gamepads[i].index == _controllerHandler.controller[j].gamepadIndex && !found) {
							_controllerHandler.controller[j].gamePad = gamepads[i];
							found = true;
						}
					}
				}
				if (!found) {
					_controllerHandler.addgamepad(gamepads[i]);
				}
		    }
		  }
		}, 

		init: function(ph) { //bind functions to gamepad events
			window.addEventListener("gamepadconnected", _controllerHandler.updateStatus);
			window.addEventListener("gamepaddisconnected", _controllerHandler.disconnecthandler);
			_controllerHandler.playerHandler = ph;
		}
	}
	
	return _controllerHandler;
}