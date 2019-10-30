window.game = window.game || {};

var weaponType = { //weapon type
	MACHINE_GUN: 0,
	SHOTGUN: 1,
	NORMAL: 2
}

var pickupType = { //pickup type 
	HEALTH_DRINK: 3
}

class pickup {
	constructor(pos, cannon, key, playerHandler) { //create pickup
		this.mesh = null;
		this.body = null;
		this.cannon = cannon;
		this.ph = playerHandler;
		this.key = key;
		this.done = false;
		this.timer = new THREE.Clock();
		this.timer.start();
		var self = this;
		var filePath;
		if (key == weaponType.MACHINE_GUN) { 
			filePath = "models/MachineGun.glb"
		}
		else if (key == weaponType.SHOTGUN) {
			filePath = "models/shotgun.glb"
		} else if (key == pickupType.HEALTH_DRINK) {
			filePath = "models/drink.glb"
		}
		var loader = new THREE.GLTFLoader();
		loader.load(filePath, function (gltf) {
			if (key == pickupType.HEALTH_DRINK) 
				gltf.scene.scale.set(20,20,20);
			self.mesh = gltf.scene;
			self.body = self.cannon.createBody({ // create rigidbody and mesh
				mass: 100,
				position: {
					x: pos.x,
					y: pos.y,
					z: pos.z
				},
				mesh: self.mesh,
				meshMaterial: new THREE.MeshBasicMaterial({color: 0x010101}),
				shape: new CANNON.Box(new CANNON.Vec3(1,1,1)),
				material: self.cannon.groundMaterial,
				collisionGroup: self.cannon.collisionGroup.solids,
				collisionFilter: self.cannon.collisionGroup.player | self.cannon.collisionGroup.solids // | cannon.collisionGroup.enemy
			});
			self.body.addEventListener("collide", function(e){ //remove pickup if it collides with player
				var p = self.ph.getPlayerFromBody(e.body);
				if (p != null && !this.done) {
					setTimeout(function() {
						//console.log(self.key);
						this.done = true;
						if (self.key != pickupType.HEALTH_DRINK)
							p.weapon.loadWeapon(self.key);
						else 
							p.healthPickup();
						self.cannon.removeVisual(self.body);
					}, 0);
				}
			});
		});
	}
}

class Weapon {
	constructor(player, cannon) {
		this.player = player;
		this.cannon = cannon;
		this.body = null;
		this.mesh = null;
		this.hasLoaded = false;
		this.weaponType = weaponType.NORMAL;
		//handles all projectiles produced by this gun
		this.projectiles = [];
		this.numProjectiles = 0;
		this.shootPosition = new CANNON.Vec3(0,0,0);

		this.fireRate = 0.5;
		this.fireRateClock = new THREE.Clock();
		this.fireRateClock.start();

		this.reloadRate = 1.5;
		this.reloadRateClock = new THREE.Clock();
		this.reloading = false;

		this.magazineMax = 6;
		this.magazine = this.magazineMax;
		this.magazines = 0;

		
		// create an AudioListener and add it to the camera
		var listener = new THREE.AudioListener();
		this.cannon.three.camera.add( listener );

		// create a global audio source
		this.sound = new THREE.Audio( listener );
		var audioLoader = new THREE.AudioLoader();
		var self = this;
		audioLoader.load( 'sounds/FireGun.mp3', function( buffer ) {
			self.sound.setBuffer( buffer );
			self.sound.setLoop( false );
			self.sound.setVolume( 1 );
			self.playbackRate = 1;
		});
		this.loadWeapon(this.weaponType);
		this.update();
	}

	//update all projectiles and shooting position with player movement
	update() {
		this.player.body.pointToWorldFrame(new CANNON.Vec3(-0.1,0.75,-2), this.shootPosition);
		//for (var i = this.projectiles.length - 1; i >= 0; i--) {
		//	this.projectiles[i].update();
		//}
		if (this.hasLoaded && this.weaponType != weaponType.NORMAL) {
			//var offset = Math.cos(Math.PI/180*(this.player.mixer.time*this.player.mixer.timeScale*360))*0.01;
			//console.log(offset);
			this.player.body.pointToWorldFrame(new CANNON.Vec3(-0.1,0.75,-2), this.shootPosition);
			this.body.position = this.shootPosition;
			if (this.weaponType == weaponType.MACHINE_GUN)
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.player.lastRotation.angle - Math.PI/2);
			else
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.player.lastRotation.angle);
		}
		var p;
		for (p in this.projectiles) {
			this.projectiles[p].update();
		}

		if (this.reloadRateClock.getElapsedTime() > this.reloadRate && this.reloading) { //finish reloading
			this.reloading = false;
			this.magazine = this.magazineMax;
		}
	}

	//remove projectile from weapon data
	removeProjectile(p) {
		for (var i = this.projectiles.length - 1; i >= 0; i--) {
			if (this.projectiles[i].index == p.index) {
				this.cannon.removeVisual(p.body);
				this.projectiles.splice(i,1);
				return;
			}
		}
	}

	//fire a projectile
	fire(cannon) {
		if (!this.reloading) {
			if (this.fireRateClock.getElapsedTime() > this.fireRate) { //fire rate
				if (this.weaponType == weaponType.SHOTGUN) {
					for (var i = 0; i < 8; i++) {
						var offset = new CANNON.Vec3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5);
						this.projectiles.push(new Projectile(this, cannon, this.numProjectiles, offset));
						this.numProjectiles++;
					}
				} else {
					this.projectiles.push(new Projectile(this, cannon, this.numProjectiles));
					this.numProjectiles++;
				}
				if (this.sound.isPlaying) this.sound.stop();
				this.sound.play();
				if (this.numProjectiles > 200) this.numProjectiles = 0;
				this.fireRateClock.start();
				this.magazine--;
				if (this.magazine <= 0) { //reload if magazine empty
					this.reloading = true;
					this.magazines++;
					if (this.magazines >= 10)
						this.loadWeapon(weaponType.NORMAL);
					this.reloadRateClock.start();
				}
			}
		}
	}

	loadWeapon(weaponTypeKey) {
		this.magazines = 0;
		if (this.weaponType == weaponTypeKey)
			return;
		//load in the gun model in glb format
		var loader = new THREE.GLTFLoader();
		//load in audio
		var audioLoader = new THREE.AudioLoader();
		if (this.body != null) {
			this.cannon.removeVisual(this.body);
		}
		this.weaponType = weaponTypeKey;
		var filePath;
		var self = this;
		if (weaponTypeKey == weaponType.MACHINE_GUN) {
			filePath = "models/MachineGun.glb"
			this.fireRate = 0.2;
			this.reloadRate = 2;
			this.magazineMax = 20;
			this.magazine = this.magazineMax;
			audioLoader.load( 'sounds/FireMachineGun.mp3', function( buffer ) {
				self.sound.setBuffer( buffer );
				self.sound.setLoop( false );
				self.sound.setVolume( 1 );
				self.playbackRate = 2;
			});
		}
		else if (weaponTypeKey == weaponType.SHOTGUN) {
			filePath = "models/shotgun.glb"
			this.fireRate = 0.8;
			this.reloadRate = 2;
			this.magazineMax = 2;
			this.magazine = this.magazineMax;
			audioLoader.load( 'sounds/FireShotgun.mp3', function( buffer ) {
				self.sound.setBuffer( buffer );
				self.sound.setLoop( false );
				self.sound.setVolume( 1 );
				self.playbackRate = 1;
			});
		}
		else if (weaponTypeKey == weaponType.NORMAL) {
			this.fireRate = 0.5;
			this.reloadRate = 1.5;
			this.magazineMax = 6;
			this.magazine = this.magazineMax;
			this.hasLoaded = true;
			audioLoader.load( 'sounds/FireGun.mp3', function( buffer ) {
				self.sound.setBuffer( buffer );
				self.sound.setLoop( false );
				self.sound.setVolume( 1 );
				self.playbackRate = 1;
			});
			return;
		}
		
		loader.load(filePath, function (gltf) {
			var offset = new CANNON.Vec3(0,0,0);
			if (weaponTypeKey == weaponType.MACHINE_GUN) {
				gltf.scene.scale.set(0.7,0.7,0.7);
			} else if (weaponTypeKey == weaponType.SHOTGUN) {
				gltf.scene.scale.set(0.7,0.7,0.7);
			}
			self.mesh = gltf.scene;
			//var group = new THREE.Group();
			//group.add(self.player.mesh);
			//self.mesh.position.set(self.shootPosition.x,self.shootPosition.y,self.shootPosition.z);
			//group.add(self.mesh);
			//self.cannon.replaceMesh(self.player.body, group);
			self.body = self.cannon.createBody({ // create rigidbody and mesh
				mass: 0,
				position: {
					x: self.shootPosition.x,
					y: self.shootPosition.y,
					z: self.shootPosition.z
				},
				mesh: self.mesh,
				meshMaterial: new THREE.MeshBasicMaterial({color: 0x010101}),
				shape: new CANNON.Box(new CANNON.Vec3(0.1,0.1,0.1)),
				material: self.cannon.solidMaterial,
				collisionGroup: self.cannon.collisionGroup.player,
				collisionFilter: self.cannon.collisionGroup.solids // | cannon.collisionGroup.enemy
			});
			self.hasLoaded = true;
	   	});
	}
}

class Projectile {
	constructor(weapon, cannon, i, offset=null) {
		this.weapon = weapon;
		this.speed = 6;
		this.damage = 2;
		this.lastDistance = 0.0001;
		this.clock = new THREE.Clock();
		this.index = i;
		this.clock.start();
		this.shootPosition = null;
		this.body = cannon.createBody({ // create rigidbody and mesh
			mass: 1,
			position: {
				x: weapon.shootPosition.x,
				y: weapon.shootPosition.y,
				z: weapon.shootPosition.z
			},
			meshMaterial: new THREE.MeshBasicMaterial({color: 0x010101}),
			shape: new CANNON.Sphere(0.1),
			material: cannon.solidMaterial,
			collisionGroup: cannon.collisionGroup.projectile,
			collisionFilter: cannon.collisionGroup.solids //| cannon.collisionGroup.enemy
		});
		if (offset != null) {
			this.body.velocity.set( //set initial velocity with respect to shooting position
				(this.body.position.x - weapon.player.body.position.x)*this.speed + offset.x*this.speed,
				offset.y*this.speed,
				(this.body.position.z - weapon.player.body.position.z)*this.speed + offset.z*this.speed
			);
		} else {
			this.body.velocity.set( //set initial velocity with respect to shooting position
				(this.body.position.x - weapon.player.body.position.x)*this.speed,
				0,
				(this.body.position.z - weapon.player.body.position.z)*this.speed
			);
		}
		this.shootPosition = weapon.shootPosition;
		//console.log(cannon.world.raycastClosest(from, to, raycastOptions, result));
		//console.log(result.body.position);
		this.body.addEventListener("collide", function(e){ //remove projectile if it collides with something solid
			if (e.body.collisionFilterGroup == cannon.collisionGroup.solids) {
				setTimeout(function() {
					weapon.removeProjectile(this);
				}, 0);
			}
		});
	}

	update() {
		this.body.position.set( //prevent from dipping below shooting position's y height
			this.body.position.x,
			this.shootPosition.y,
			this.body.position.z
		);
		//this.body.velocity.set( //keep velocity constant and 0 y axis velocity
		//	this.body.velocity.x,
		//	this.body.velocity.y,
		//	this.body.velocity.z
		//);
		var totalVel = Math.sqrt(Math.pow(this.body.velocity.x,2) + Math.pow(this.body.velocity.z,2));
		var velInFrame = totalVel*this.clock.getDelta() * 5; //optimizing raycasts to only be called initially and nearby the enemy
		if (this.lastDistance > velInFrame * 5 || this.lastDistance <= 0) {
			this.lastDistance -= velInFrame;
		} else { //raycasts to see if collsion
			var from = this.body.position;
			var distance = 3 - this.clock.getElapsedTime();
			var to = new CANNON.Vec3(from.x + this.body.velocity.x * distance, from.y, from.z + this.body.velocity.z * distance);
			var result = new CANNON.RaycastResult();
			var raycastOptions = { //filter for enemies
				collisionFilterGroup: this.weapon.cannon.collisionGroup.projectile,
				collisionFilterMask: this.weapon.cannon.collisionGroup.enemy //| this.weapon.cannon.collisionGroup.solids
			};
			this.weapon.cannon.world.raycastClosest(from, to, raycastOptions, result);
			if (result.body){ // if collision
				if (result.body.collisionFilterGroup == this.weapon.cannon.collisionGroup.enemy) { //collided with enemy
					this.lastDistance = this.body.position.distanceTo(result.body.position);
					if (this.body.position.distanceTo(result.body.position) < result.body.shapes[0].boundingSphereRadius + this.body.shapes[0].boundingSphereRadius) {
						var enemy = this.weapon.player.enemyHandler.getEnemyFromBody(result.body);
						if (enemy != null) { //find enemy and make them take damage
							enemy.takeDamage(this.damage, this.weapon.player);
							this.weapon.removeProjectile(this);
						}
					}
				}
			}
		}
		if (this.clock.getElapsedTime() > 2) { //default death timer
			this.weapon.removeProjectile(this);
		}

	}
}

class Player { //turn into class
	constructor(controller, enemyHandler, index, uiHandler) {

		this.index = index;
		this.controller = controller;
		this.weapon = null; //weapon holder
		this.enemyHandler = enemyHandler;
		this.uiHandler = uiHandler;
		//mesh, body and shape of collider
		this.mesh = null;
		this.shape = null;
		this.body = null;
		this.model = null;
		//lastRotation to keep player from rolling around
		this.lastRotation = null;
		// Player mass which affects other rigid bodies in the world
		this.mass = 3;
		// Configuration for player speed
		this.speed = 2;
		this.health = 10;
		this.score = 0;

		// animation variables
		this.mixer = null;
		this.walkingAnimation = null;
		this.walkingAction = null;

		// Third-person camera configuration
		this.cameraCoords = null;
		// Camera offsets behind the player (horizontally and vertically)
		this.cameraOffsetH = 380;
		this.cameraOffsetV = 280;

		this.jumpTimer = new THREE.Clock()
		this.jumpTimer.start();
		//button codes for the controller
		this.controllerCodes =  {
			cross : 0,
			circle : 1,
			square : 2,
			triangle : 3,
			L1 : 4,
			R1 : 5,
			L2 : 6,
			R2 : 7,
			share : 8,
			start : 9,
			L3 : 10,
			R3 : 11,
			up : 12,
			down : 13,
			left : 14,
			right : 15,
			ps : 16
		};

		//axis codes for the controller
		this.axisCode = {
			leftHorizontal : 0,
			leftVertical : 1,
			rightHorizontal : 2,
			rightVertical : 3
		};

		this.hasLoaded = false;
	}
	
	//create player
	create(cannon, three) {
		//collider is cube
		this.shape = new CANNON.Box(new CANNON.Vec3(1,1,1)); //1 is half of actual size
//load in the player model in glb format
		var loader = new THREE.GLTFLoader();
		var filePath =  "models/player" + this.index.toString() + ".glb";
		console.log(filePath);
		var self = this;
		loader.load(filePath, function (gltf) {

			gltf.scene.scale.set(0.75,0.75,0.75);

			self.model = gltf.scene;

			gltf.scene.traverse( function( node ) {

				//add shadows to the model
				if ( node instanceof THREE.SkinnedMesh ) {
					node.castShadow = true;
					node.receiveShadow = true;
					//self.model = node.parent;
					//self.model.scale.set(2,2,2);
				}

			});

			// set mixer for animations
			self.mixer = new THREE.AnimationMixer(self.model);

			// set walk animation
			self.walkingAnimation = gltf.animations[0];
			self.playWalkingAnimation();
			//create player rigidbody
			self.body = cannon.createBody({
				//geometry: this.model,
				position: {
					x: 0,
					y: 2,
					z: 0
				},
				meshMaterial: new THREE.MeshLambertMaterial({color: window.game.static.colors.cyan, flatShading: true}),
				mass: self.mass,
				mesh: self.model,
				shape: self.shape,
				material: cannon.playerPhysicsMaterial,
				castShadow: true,
				offset: new CANNON.Vec3(0,-0.8,0), //corrective offset for the model
				collisionGroup: cannon.collisionGroup.player,
				collisionFilter: cannon.collisionGroup.enemy | cannon.collisionGroup.solids
			});

			self.mesh = cannon.getMeshFromBody(self.body);
			self.weapon = new Weapon(self, cannon);
			self.uiHandler.addPlayer(self);
			self.hasLoaded = true;
		})

	}

	addScore(score) {
		this.score+=score;
		//console.log("Player:"+this.index, this.score);
	}

	playWalkingAnimation() {
		if (this.mixer != null) {
			this.currentAction = this.mixer.clipAction(this.walkingAnimation);
			this.currentAction.loop = THREE.LoopRepeat;
			this.currentAction.play();
		}
	}

	stopWalkingAnimation() {
		if (this.currentAction != null) 
			if (this.currentAction.isRunning())
				this.currentAction.stop();
	}

	//destroy player and remove player from controller bind
	destroy(cannon) {
		cannon.removeVisual(this.body);
		if (this.weapon.body != null) cannon.removeVisual(this.weapon.body);
		this.controller.player = null;
	}

	removeVisual(cannon){
		cannon.removeVisual(this.body);
		if (this.weapon.body != null) cannon.removeVisual(this.weapon.body);
	}

	update(cannon,three,game,dt) {

		if (this.hasLoaded) {
			// Basic game logic to update player and camera
			this.processUserInput(cannon);

			if (this.weapon != null)
				this.weapon.update();
			if (this.mixer != null)
				this.mixer.update(dt);
			//this.updateCamera(three);
		}
	}

	updateCamera(three) {
		// Calculate camera coordinates by using Euler radians from a fixed angle (135 degrees)
		this.cameraCoords = window.game.helpers.polarToCartesian(this.cameraOffsetH, window.game.helpers.degToRad(135));
		// Apply camera coordinates to camera position
		three.camera.position.x = this.mesh.position.x + this.cameraCoords.x;
		three.camera.position.y = this.mesh.position.y + this.cameraCoords.y;
		three.camera.position.z = this.mesh.position.z + this.cameraOffsetV;
		// Place camera focus on player mesh
		three.camera.lookAt(this.mesh.position);
	}

	//move player on x-z plane
	moveWithAxis(horizontal, vertical) {
		//if (Math.sqrt(Math.pow(this.body.velocity.x,2) + Math.pow(this.body.velocity.z,2)) > this.speed) {
		this.body.velocity.set(horizontal * this.speed, this.body.velocity.y, vertical * this.speed);
		if (Math.abs(horizontal) > 0 || Math.abs(vertical) > 0) {
			if (vertical < 0) this.mixer.timeScale = (Math.abs(horizontal) + Math.abs(vertical)) * -1;
			else this.mixer.timeScale = Math.abs(horizontal) + Math.abs(vertical);
		} else {
			this.mixer.timeScale = 0;
		}
		//} else this.body.applyForce(new CANNON.Vec3(horizontal * this.acceleration * 100, 0, vertical * this.acceleration * 100), this.body.position);
	}

	//rotate player on y axis 
	rotateOnAxis(horizontal, vertical, cannon) {
		this.body.angularDamping = 0;
		if (this.lastRotation == null) {
			this.lastRotation = window.game.helpers.cartesianToPolar(0,0);
		}
		if (horizontal == 0 && vertical == 0) {
			cannon.setOnAxis(this.body, new CANNON.Vec3(0, 1, 0), this.lastRotation.angle - Math.PI/2);
		} else {
			this.lastRotation = window.game.helpers.cartesianToPolar(horizontal,vertical);
			cannon.setOnAxis(this.body, new CANNON.Vec3(0, 1, 0), this.lastRotation.angle - Math.PI/2);
		}
	}

	//process user input from controller
	processUserInput(cannon) {
		if (this.controller != null && this.health > 0 ) { //controller connected and not dead
			this.moveWithAxis(this.controller.axes[this.axisCode.leftHorizontal],this.controller.axes[this.axisCode.leftVertical]);
			this.rotateOnAxis(this.controller.axes[this.axisCode.rightHorizontal],this.controller.axes[this.axisCode.rightVertical],cannon);
			if (this.controller.pressed[this.controllerCodes.R1]) {
				this.weapon.fire(cannon);
			}
			if (this.controller.pressed[this.controllerCodes.cross] && this.body.velocity.y <= 0.1 && this.jumpTimer.getElapsedTime() > 1) { //jump
				this.jumpTimer.start();
				this.body.velocity = new CANNON.Vec3(this.body.velocity.x, 6, this.body.velocity.z)
			}
			if (this.controller.pressed[this.controllerCodes.start]) alert("PAUSED")
		}
	}

	healthPickup() {
		function clamp(num, min, max) {
 			return num <= min ? min : num >= max ? max : num;
		}
		this.health = clamp(this.health+5, 0, 10);
	}

	//make this player take damage from a zombie
	takeDamage() {
		this.health--;
		if (this.health <= 0) {
			this.removeVisual(this.weapon.cannon);
			this.hasLoaded = false;
		}
	}
};

window.game.playerHandler = function () {
	var _playerHandler = {

		players: 0,
		cannon: null,
		three: null,
		game: null,
		controllerHandler: null,
		ui: null,
		enemyHandler: null,

		player: [],
		pickups: [],
		pickupTimer: new THREE.Clock(),
		//add a player by linking them to a controller
		addPlayer: function(controller) {
			var temp = new Player(controller, this.enemyHandler, this.players+1, this.ui);
			temp.create(_playerHandler.cannon, _playerHandler.three);
			_playerHandler.players++;
		  	_playerHandler.player.push(temp);
		},

		getPlayerFromBody: function(body) { //find player using body
			for (var i = 0; i < _playerHandler.player.length; i++) {
				if (_playerHandler.player[i].body == body) {
					return _playerHandler.player[i];
				}
			}
			return null;
		},

		//updates the individual players
		updatePlayers: function(dt) {
			var dead = 0;
			var low = 0;
			if (_playerHandler.player[0] != null) {
				for (var i = _playerHandler.player.length - 1; i >= 0; i--) {
					_playerHandler.player[i].update(_playerHandler.cannon,_playerHandler.three,_playerHandler.game,dt);
					if (_playerHandler.player[i].health <= 5) low++;
					if (_playerHandler.player[i].health <= 3) low++;
					if (_playerHandler.player[i].health <= 0) dead++;
				}
				for (var i = 0; i < this.pickups.length; i++) {
					if (this.pickups[i].timer.getElapsedTime() > 10) {
						this.cannon.removeVisual(this.pickups[i].body);
						this.pickups[i].done = true;
					}
				 	if (this.pickups[i].done) {
				 		this.pickups.splice(i,1);
				 		this.pickupTimer.start();
				 	}
				} 
				if (dead == this.player.length) {
						this.ui.showEndMenu(false);
						//this.game.reset();
					}
				if (low >= 1) {
					if (Math.random() > 1/(low-dead*2)) {
						if (this.pickups.length < low-1-dead*2 && this.pickupTimer.getElapsedTime() > 5) {
							this.pickupTimer.stop();
							this.pickups.push(new pickup(new THREE.Vector3(Math.random()*20-10,1,Math.random()*20-10), this.cannon, pickupType.HEALTH_DRINK, this));
						}
					}
				}
			}
		},

		//removes player by searching for player then destroying the player, then removing him
		removePlayer: function(p) {
			for (var i = _playerHandler.player.length - 1; i >= 0; i--) {
				if (_playerHandler.player[i] == p) {
					_playerHandler.players--;
					_playerHandler.player[i].destroy(_playerHandler.cannon);
					_playerHandler.player.splice(i, 1);
					return;
				}
			}
		},

		//destroy all the players and set up the player handler for a restart
		destroy: function() {
			if (_playerHandler.player.length > 0) {
				var p;
				for (p in _playerHandler.player) {
					_playerHandler.player[p].destroy(_playerHandler.cannon);
				}
				_playerHandler.player.splice(0,_playerHandler.players);
				_playerHandler.players = 0; 
				for (var i = 0; i < this.pickups.length; i++) {
					this.cannon.removeVisual(this.pickups[i].body);
				 	this.pickups.splice(i,1);
				} 
			}
		},

		//initalize the links to other handlers and game
		init: function(c,t,g,ch,ui,eh) {
			_playerHandler.cannon = c;
			_playerHandler.three = t;
			_playerHandler.game = g;
			_playerHandler.controllerHandler = ch;
			// Create a global physics material for the player which will be used as ContactMaterial for all other objects in the level
			_playerHandler.ui = ui;
			_playerHandler.enemyHandler = eh;
		}

	}

	return _playerHandler;
}
