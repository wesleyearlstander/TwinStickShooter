/*
 * Game UI
 *
 * A class for handling the user interface of the gaming providing DOM element management and some helpers
 */

class  playerUI {
	constructor(player,ui){
		this.player = player;
		this.healthBar,
		this.ammoBar
		this.ui = ui;
	
	}
	
	create(three){ //initial set up of health and ammo bar
		var geometry = new THREE.RingGeometry( 3, 5, 32 );
		var material = new THREE.MeshBasicMaterial( { color: 'white', side: THREE.DoubleSide } );
		this.healthBar = new THREE.Mesh( geometry, material );
		this.healthBar.receiveShadow= true;
		this.healthBar.position.set(this.player.mesh.position.x,this.player.mesh.position.y-1,this.player.mesh.position.z);
		this.healthBar.rotation.set(Math.PI/2,0,0);
		three.scene.add( this.healthBar );
		var geometry = new THREE.RingGeometry(1,3,32);
		var material = new THREE.MeshBasicMaterial({color: 'white', side: THREE.DoubleSide}	);
		this.ammoBar = new THREE.Mesh(geometry,material);
		this.ammoBar.receiveShadow = true;
		this.ammoBar.position.set(this.player.mesh.position.x,this.player.mesh.position.y-1,this.player.mesh.position.z);
		this.ammoBar.rotation.set(Math.PI/2,0,0);
		three.scene.add(this.ammoBar);
	}
	// methods
	update(three){
		if (this.player != null) {
			this.makeAmmoBar(three);
			this.makeHealthBar(three);
		} else {
			this.removeBars(three);
		}
	}

	makeAmmoBar(three) { 
		if (this.player.weapon.reloading) { //reloading animation bar
			var	maxArcAngle = (this.player.weapon.reloadRateClock.getElapsedTime()/this.player.weapon.reloadRate) * 360;
			var geometry = new THREE.RingGeometry(0.5,1,32,1,-Math.PI/2,Math.PI*2 - (360 - maxArcAngle)/360*Math.PI*2);
			var material = new THREE.MeshBasicMaterial({color: 0xe1e1e1, side: THREE.DoubleSide}	);
			three.scene.remove(this.ammoBar);
			this.ammoBar = new THREE.Mesh(geometry,material);
			this.ammoBar.receiveShadow = true;
			this.ammoBar.position.set(this.player.mesh.position.x,this.player.mesh.position.y-1.5,this.player.mesh.position.z);
			this.ammoBar.rotation.set(Math.PI/2,0,0);
			three.scene.add(this.ammoBar);
		} else { //bullet magazine bar animation
			var magazine = 0; 
			if (this.player.weapon.magazine > 0) magazine = this.player.weapon.magazine;
			var	maxArcAngle = (magazine/this.player.weapon.magazineMax) * 360;
			var geometry = new THREE.RingGeometry(0.5,1,32,1,-Math.PI/2,Math.PI*2 - (360 - maxArcAngle)/360*Math.PI*2);
			var material = new THREE.MeshBasicMaterial({color: 'white', side: THREE.DoubleSide}	);
			three.scene.remove(this.ammoBar);
			this.ammoBar = new THREE.Mesh(geometry,material);
			this.ammoBar.receiveShadow = true;
			this.ammoBar.position.set(this.player.mesh.position.x,this.player.mesh.position.y-1.5,this.player.mesh.position.z);
			this.ammoBar.rotation.set(Math.PI/2,0,0);
			three.scene.add(this.ammoBar);
		}
	}

	makeHealthBar(three) { //create health bar
		var health = 0;
		var colour;
		this.ui.elements.leftOverScores[this.player.index-1] = this.player.score;
		if (this.player.health > 0) health = this.player.health;
		else {
			three.scene.remove(this.healthBar);
			three.scene.remove(this.ammoBar);
			return;
		}

		switch (true) { //change health bar colour depending on remaining health
			case this.player.health > 7: colour = 'green'; break;
			case this.player.health >5: colour = 'yellow'; break;
			case this.player.health >3: colour = 'orange'; break;
			default: colour = 'red'; break;
		}
		var	maxArcAngle = (health/10) * 360;
		var geometry = new THREE.RingGeometry(1,1.5,32,1,-Math.PI/2,Math.PI*2 - (360 - maxArcAngle)/360*Math.PI*2);
		var material = new THREE.MeshBasicMaterial({color: colour, side: THREE.DoubleSide}	);
		three.scene.remove(this.healthBar);
		this.healthBar = new THREE.Mesh(geometry,material);
		this.healthBar.receiveShadow= true;
		this.healthBar.position.set(this.player.mesh.position.x,this.player.mesh.position.y-1.5,this.player.mesh.position.z);
		this.healthBar.rotation.set(Math.PI/2,0,0);
		three.scene.add(this.healthBar);
	}

	removeBars(three) { //remove all bars
		three.scene.remove(this.healthBar);
		three.scene.remove(this.ammoBar);
	} 
}





window.game = window.game || {};

window.game.ui = function() {
	
	var _ui = {
		three: null,
		// Attributes
		elements: {
			// Properties for DOM elements are stored here
			infoboxIntro: null,
			playerUIData: [],
			menu: null,
			words: null,
			leftOverScores: [0,0,0,0]
		},

		// Methods
		init: function (three) {
			// Get DOM elements and bind events to them
			_ui.getElements();
			_ui.bindEvents();
			_ui.three = three;
		},
		addPlayer: function(player) {
			var temp = new playerUI(player,_ui);
			_ui.elements.playerUIData.push(temp);
			player.ui = temp;
			temp.create(_ui.three);
		},
		destroy: function () {
			for (let i = 0; i < _ui.elements.playerUIData.length; i++) {
				var p = _ui.elements.playerUIData[i];
				p.player = null;
			}
			playerUIData = [];
			_ui.elements.menu.className = "hidden";
		},
		update: function(three){
			for (let i = 0; i < _ui.elements.playerUIData.length; i++) {
				var p = _ui.elements.playerUIData[i];
				p.update(three);
			}
		},
		getElements: function () {
			// Store the DOM elements in the elements object to make them accessible in addClass, removeClass and hasClass
			_ui.elements.glowI = document.querySelector("#glowI");
			_ui.elements.menu = document.querySelector("#menu");
			_ui.elements.words = document.querySelector("#words");
			//_ui.elements.playerUIMain = document.querySelector(playerUIMain);
			//_ui.elements.infoboxIntro = document.querySelector("#infobox-intro");
//			_ui.elements.playerUIMain = document.querySelector(playerUIMain);
		},
		bindEvents: function () {
			// Event bindings
		},
		showEndMenu: function(win) {
			//_ui.removeClass("menu", "hidden");
			_ui.elements.menu.className = "";
			if (win) {
				_ui.elements.words.innerHTML = "WIN";	
				for (var i = 0; i < _ui.elements.playerUIData.length; i++) { //extract scores from live players
		 			_ui.elements.words.innerHTML += "\t player "+_ui.elements.playerUIData[i].player.index+":"+_ui.elements.playerUIData[i].player.score;
		 			if(_ui.elements.playerUIData.length + _ui.elements.leftOverScores.length > 1) _ui.elements.words.innerHTML += ","
				}
			} else {
				_ui.elements.words.innerHTML = "LOSE";
			}
			var start = true;
			for (var i = 0; i < _ui.elements.leftOverScores.length; i++) { //extract and add scores from dead players
				if (_ui.elements.leftOverScores[i] != 0) {
					_ui.elements.words.innerHTML += "\t player "+(i+1)+":"+_ui.elements.leftOverScores[i];
					if (!start) _ui.elements.words.innerHTML += ",";
					else start = false;
				}
			} 
		}
	};

	return _ui;
};