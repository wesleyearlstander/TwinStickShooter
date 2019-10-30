
window.game = window.game || {}

// enum of enemy animations
// maps keys to indices
var enemyAnimation = {
	ATTACK1_L : 0,
	ATTACK1_R : 1,
	ATTACK2 : 2,
	ATTACK3 : 3,
	DEAD1 : 4,
	DEAD2 : 5,
	DEAD3 : 6,
	ENTER : 7,
	HURT1 : 8,
	HURT2 : 9,
	HURT_HEAD : 10,
	HURT_L : 11,
	HURT_R : 12,
	IDLE : 13,
	RUN : 14,
	WALK : 15
}

//enemy states
var enemyState = {
	ENTER : 0,
	IDLE : 1,
	WALK : 2,
	ATTACK : 3,
	HURT : 4,
	DEAD : 5,
	ATTACKED : 6,
	ATTACKDONE : 7,
	DEADDONE : 8
}

class Enemy {

	// // keeps track of players
	// // static variables shared between each instance of this class
	// static players = [];

	constructor(i) {

		this.mass = 3,
		this.speed = 1.5,
		this.speedMax = 30, // Enemy mass which affects other rigid bodies in the world
		this.lastAngle = null;
		this.hurtDirection = null;
		this.walkDistance = 0;
		this.body = null;
		// Enemy entity including mesh and rigid body
		this.model = null;
		this.shape = null;
		this.index = i;
		this.health = 10;
		this.mixer = null;

		this.hasLoaded = false;
		this.state = null;

		this.currentAnimation = null;
		this.currentAction = null;
		this.animations = [];
		//enemy.rotation = rotation;

	}

	create(cannon, three, pos, gltfFilePath) {
		// function that creates an enemy character
		var loader = new THREE.GLTFLoader();

	    this.shape = new CANNON.Box(new CANNON.Vec3(0.8,3,0.8));
	    var rand1 = Math.random() * 2 -1;
	    var rand2 = Math.random() * 2 -1;
	    this.lastAngle = window.game.helpers.cartesianToPolar(rand1,rand2).angle;
	    var self = this;
	    loader.load(gltfFilePath,
	    	function(gltf) { //load enemy model

	    	gltf.scene.scale.set(0.5,0.5,0.5);

			gltf.scene.traverse( function( node ) {

        		if ( node instanceof THREE.Mesh ) {
        			node.castShadow = true;
        			node.receiveShadow = true;
        			self.model = node.parent;
        			self.model.scale.set(2,2,2);
        		}
					});


			// set mixer for animations and load animationa
			self.mixer = new THREE.AnimationMixer(self.model);

			for (var i = 0; i < gltf.animations.length; i++)
				self.animations.push(gltf.animations[i]);

			// using animations example
			self.switchCurrentAnimation(enemyAnimation.ENTER , true);
			self.state = enemyState.ENTER;
			//self.playCurrentAnimation();
			self.mixer.addEventListener( 'finished', function( e ) {
				if (self.state == enemyState.ENTER) {
					self.switchCurrentAnimation(enemyAnimation.IDLE);
					self.state = enemyState.IDLE;
				} else if (self.state == enemyState.HURT) {
					self.state = enemyState.IDLE;
					self.switchCurrentAnimation(enemyAnimation.IDLE);
				} else if (self.state == enemyState.ATTACKDONE) {
					self.state = enemyState.IDLE;
					self.switchCurrentAnimation(enemyAnimation.IDLE);
				} else if (self.state == enemyState.DEAD) {
					self.state = enemyState.DEADDONE;
				}
			})
			self.body = new cannon.createBody({ //create enemy body and mesh in cannon
				mass: self.mass,
				shape: self.shape,
		    	mesh: self.model,
				material: cannon.enemyPhysicsMaterial,
				meshMaterial: new THREE.MeshLambertMaterial({color : 0xff0000}),
				position: {
					x: pos.x,
					y: pos.y,
					z: pos.z
				},
				castShadow: true,
				offset: new CANNON.Vec3(0,+3,0), //corrective offset for the model
				collisionGroup: cannon.collisionGroup.enemy,
				collisionFilter: cannon.collisionGroup.player | cannon.collisionGroup.solids | cannon.collisionGroup.enemy | cannon.collisionGroup.projectile
			});

			self.hasLoaded = true;

			self.mesh = cannon.getMeshFromBody(self.body);

	    	}, function ( xhr ) {

				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

			}, function ( error ) {

				console.log( 'An error happened' );

			}
		);

		// this.body.addEventListener("collide", function(event) {

		// } );
	}

	switchCurrentAnimation(animationEnumKey, once) { //switch current animation
		if (this.currentAnimation != this.animations[animationEnumKey]) {
			if (this.currentAnimation != null) this.stopCurrentAnimation();
			this.currentAnimation = this.animations[animationEnumKey];
			if (once)
				this.playCurrentAnimationOnce();
			else this.playCurrentAnimation();
		}
	}

	playCurrentAnimation() { //play current animation
		this.currentAction = this.mixer.clipAction(this.currentAnimation);
		this.currentAction.loop = THREE.LoopRepeat;
		this.currentAction.play();
	}

	playCurrentAnimationOnce() { //play current animation
		this.currentAction = this.mixer.clipAction(this.currentAnimation);
		this.currentAction.loop = THREE.LoopOnce;
		this.currentAction.play().reset();
	}

	stopCurrentAnimation() { //stop current animation
		this.currentAction.stop();
	}

	takeDamage(damage, player) { //take damage from player weapon
		this.health -= damage;
		if (this.health > 0) {
			player.addScore(10);
		} else {
			player.addScore(100);
		}
		this.state = enemyState.HURT;
	}

	destroy(cannon) { //removes visual and cannon body from scene
		cannon.removeVisual(this.body);
	}

	attack() {
		if (this.state != enemyState.ATTACK) { //if not attacking attack, and choose random attack animation
			var rand;
			if (this.currentAnimation == this.animations[enemyAnimation.RUN]) {
				rand = Math.random()*2+2;
			} else{
				rand = Math.random()*4;
			}
			this.state = enemyState.ATTACK;
				switch (true) {
					case (rand < 1): this.switchCurrentAnimation(enemyAnimation.ATTACK1_R, true); break;
					case (rand < 2): this.switchCurrentAnimation(enemyAnimation.ATTACK1_L, true); break;
					case (rand < 3): this.switchCurrentAnimation(enemyAnimation.ATTACK2, true); break;
					case (rand < 4): this.switchCurrentAnimation(enemyAnimation.ATTACK3, true); break;
				}
		}
	}

	die(cannon) {
		if (this.state != enemyState.DEAD) { //if not dead, die and choose random death animation
			this.state = enemyState.DEAD;
			var rand = Math.random()*3;
				switch (true) {
					case (rand < 1): this.switchCurrentAnimation(enemyAnimation.DEAD1, true); break;
					case (rand < 2): this.switchCurrentAnimation(enemyAnimation.DEAD2, true); break;
					case (rand < 3): this.switchCurrentAnimation(enemyAnimation.DEAD3, true); break;
				}
			this.body.collisionFilterGroup = cannon.collisionGroup.player; //makes them untargetable
		}
	}

	update(playerHandler, dt) {

		if (this.hasLoaded) {
			if (this.health <= 0 && this.state != enemyState.DEAD) { //check if dead
				this.die(playerHandler.cannon);
			}
			if (this.currentAnimation == this.animations[enemyAnimation.WALK]){ //make walk animation twice as fast
				dt*=2;
			}

			if (this.mixer != null) //update animation mixer with time
				this.mixer.update(dt);
			// utility function to find the straight line distance between two points
			// in a 3D space
			var getStraightLineDistance = function(positionA, positionB) {
				return Math.sqrt(Math.pow((positionA.x - positionB.x), 2) + Math.pow((positionA.y - positionB.y), 2) + Math.pow((positionA.z - positionB.z), 2))
			}

			// find index of player that's closest to the enemy
			var min = 10000000;
			var minPlayerIndex = -1;
			for (var i = 0; i < playerHandler.player.length; i++) {
				if (playerHandler.player[i].hasLoaded) {
					var currDistance = getStraightLineDistance(this.body.position, playerHandler.player[i].body.position);
					if (currDistance < min) {
						min = currDistance;
						minPlayerIndex = i;
					}
				}
			}

			if (playerHandler.player[minPlayerIndex] != null && playerHandler.player[minPlayerIndex].hasLoaded)  { //check if can attack or move towards player or idle
				var closestPlayer = playerHandler.player[minPlayerIndex];
				var closestPlayerPosition = closestPlayer.body.position;
				var v = new CANNON.Vec3(closestPlayerPosition.x - this.body.position.x, 0, closestPlayerPosition.z - this.body.position.z);
				var magnitude = Math.sqrt(Math.pow(v.x,2)+Math.pow(v.y,2)+Math.pow(v.z,2));
				var direction = new CANNON.Vec3(v.x/magnitude,v.y/magnitude,v.z/magnitude);
				if (this.state != enemyState.HURT)
					this.hurtDirection = direction;
				direction = new CANNON.Vec3(direction.x*this.speed,this.body.velocity.y,direction.z*this.speed);
				if (this.state == enemyState.IDLE && magnitude < 30) { //close enough to walk to
					this.state = enemyState.WALK;
					this.walkDistance = magnitude;
				}
				if (this.state == enemyState.WALK && magnitude < 3) { //close enough to attack
					this.attack();
				}
			} else {
				this.state = enemyState.IDLE;
			}

			if (this.state == enemyState.ENTER) { //spawn animation
				this.body.velocity.set(0,0,0);
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
			} else if (this.state == enemyState.IDLE) { //stay idle
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
				this.body.velocity.set(0,0,0);
				this.switchCurrentAnimation(enemyAnimation.IDLE);
			} else if (this.state == enemyState.WALK) { //walk towards player
				if (this.walkDistance-magnitude > 5) {
					this.body.velocity.set(direction.x*2,this.body.velocity.y,direction.z*2);
					this.switchCurrentAnimation(enemyAnimation.RUN);
				} else {
					this.body.velocity.set(direction.x,this.body.velocity.y,direction.z);
					this.switchCurrentAnimation(enemyAnimation.WALK);
				}
				this.lastAngle = window.game.helpers.cartesianToPolar(direction.x,-1*direction.z).angle - Math.PI/2;
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
				
			} else if (this.state == enemyState.HURT) { //hurt animation and stagger
				if (this.hurtDirection != null) {
					this.body.velocity = new CANNON.Vec3(-1*this.hurtDirection.x/2,this.body.velocity.y,-1*this.hurtDirection.z/2);
					this.hurtDirection = new CANNON.Vec3(this.hurtDirection.x*0.98, this.hurtDirection.y*0.98, this.hurtDirection.z*0.98); //damping down to zero
				}
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
				this.switchCurrentAnimation(enemyAnimation.HURT1, true);
			} else if (this.state == enemyState.ATTACK) { //attack if haven't attacked
				this.body.velocity.set(0,0,0);
				this.lastAngle = window.game.helpers.cartesianToPolar(direction.x,-1*direction.z).angle - Math.PI/2;
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
				if (this.currentAction.time > 0.5) {
					this.state = enemyState.ATTACKED;
				}
			} else if (this.state == enemyState.DEAD) { //death 
				this.body.velocity.set(0,0,0);
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
			}
			if (this.state == enemyState.ATTACKED) { //player takes damage after attack if close enough
				if (magnitude < 4) {
					closestPlayer.takeDamage();
				}
				this.state = enemyState.ATTACKDONE;
			}
			if (this.state == enemyState.ATTACKDONE) { //end attack animation 
				this.body.velocity.set(0,0,0);
				this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this.lastAngle);
			}

		}

	}

}

window.game.enemyHandler = function() {

	var _enemyHandler = {

		numEnemies: 0,
		cannon: null,
		three: null,
		game: null,
		playerHandler: null,
		levelHandler: null,
		uiHandler: null,
		enemies: [],
		maxEnemies: 100,
		maxCurrentEnemies: 5,
		spawnClock: new THREE.Clock(),
		pickups: [],
		mirrorTrophy: null,

		addEnemy: function(position) { //add enemy and load model
			var enemy = new Enemy(_enemyHandler.numEnemies);
			var filePath = "models/zombie.gltf";
			enemy.create(_enemyHandler.cannon, _enemyHandler.three, position, filePath);
			_enemyHandler.enemies.push(enemy);
			_enemyHandler.numEnemies++;
			if (this.numEnemies % 10 == 0) { //create weapon pickup
				if (Math.random() < 0.5) 
					this.pickups.push(new pickup(new THREE.Vector3(Math.random()*20-10,1,Math.random()*20-10), this.cannon, weaponType.SHOTGUN, this.playerHandler));
				else
		  			this.pickups.push(new pickup(new THREE.Vector3(Math.random()*20-10,1,Math.random()*20-10), this.cannon, weaponType.MACHINE_GUN, this.playerHandler));
		  	}
		},

		removeEnemy: function(enemy) { //remove enemy and destroy mesh
			for (var i = 0; i < _enemyHandler.enemies.length; i++) {
				if (_enemyHandler.enemies[i].index == enemy.index) {
					_enemyHandler.enemies[i].destroy(_enemyHandler.cannon);
					_enemyHandler.enemies.splice(i, 1);
					break;
				}
			}

			if (_enemyHandler.numEnemies >= this.maxEnemies && _enemyHandler.enemies.length == 0) {
				//Spawn trophy (currently just a mirrored sphere)
				var mirrorTrophyPos = {x:0, y:5, z:0};
				this.mirrorTrophy = new MirrorTrophy1(this.cannon,this.three,mirrorTrophyPos);
				this.uiHandler.showEndMenu(true);
				//this.game.reset();
			}
		},

		updateEnemies: function(dt) { //update and spawn enemies
			if (_enemyHandler.numEnemies < this.maxEnemies) { //spawn enemies at respective room spawn points
				if (_enemyHandler.enemies.length < this.maxCurrentEnemies * _enemyHandler.playerHandler.player.length) {
					if (this.spawnClock.getElapsedTime() > 1) {
						var grates = this.levelHandler.gratez;
						var min = Math.ceil(0);
						var max = Math.floor(grates.length);
    					var temp = Math.floor(Math.random() * (max - min + 1)) + min;
    					if (grates[temp] != null) {
    						this.spawnClock.start();
							this.addEnemy(new THREE.Vector3(grates[temp].pos.x,grates[temp].pos.y,grates[temp].pos.z));
						}
						for (var i = 0; i < this.pickups.length; i++) {
							if (this.pickups[i].timer.getElapsedTime() > 15) {
								this.cannon.removeVisual(this.pickups[i].body);
								this.pickups[i].done = true;
							}
							if (this.pickups[i].done) {
								this.pickups.splice(i,1);
							}
						}
					}
				}
			} 
			if (this.mirrorTrophy != null) {
				this.three.updateCubeMap();
				if (this.three.cubeCamera != null)
					this.three.cubeCamera.position.set(0,5,0);
			}
			// update enemies
			for (var i = 0; i < _enemyHandler.enemies.length; i++) {
				_enemyHandler.enemies[i].update(_enemyHandler.playerHandler, dt);
				if (_enemyHandler.enemies[i].state == enemyState.DEADDONE) { //remove enemy if it's death animation is done
					_enemyHandler.removeEnemy(_enemyHandler.enemies[i]);
				}
			}
		},

		//find and return enemy using it's cannon body
		getEnemyFromBody: function(body) {
			for (var i = 0; i < _enemyHandler.enemies.length; i++) {
				if (_enemyHandler.enemies[i].body == body) {
					return _enemyHandler.enemies[i];
				}
			}
			return null;
		},

		//destroy all enemies and reset enemyhandler
		destroy: function() {
			var e;
			for (e in _enemyHandler.enemies) {
				_enemyHandler.enemies[e].destroy(_enemyHandler.cannon);
			}
			_enemyHandler.enemies.splice(0,_enemyHandler.enemies.length);

			_enemyHandler.numEnemies = 0;
			for (var i = 0; i < this.pickups.length; i++) {
				this.cannon.removeVisual(this.pickups[i].body);
			 	this.pickups.splice(i,1);
			} 
			this.cannon.removeVisual(this.mirrorTrophy);
			mirrorTrophy = null;
			this.three.scene.remove(this.three.cubeCamera);
			this.three.cubeCamera = null;
		},

		//initialize links between handlers and game
		init: function(c,t,g,ph,lh,ui) {
			_enemyHandler.cannon = c;
			_enemyHandler.three = t;
			_enemyHandler.game = g;
			_enemyHandler.playerHandler = ph;
			_enemyHandler.levelHandler = lh;
			_enemyHandler.spawnClock.start();
			_enemyHandler.uiHandler = ui;
		}
	}

	return _enemyHandler;
}

//Creates and renders Mirrored Trophy at position specified by pos - {x,y,z}
class MirrorTrophy1 {
	constructor(cannon, three, pos) {
		three.setUpCubeCamera();
		this.reflectiveMaterial = new THREE.MeshLambertMaterial();
		this.reflectiveMaterial.envMap = three.cubeCamera.renderTarget.texture;
		this.shape = new CANNON.Sphere(2);

		this.body = new cannon.createBody({
			mass: 0,
			shape: this.shape,
			material: cannon.solidMaterial,
			meshMaterial: this.reflectiveMaterial,
			position: {
				x: pos.x,
				y: pos.y,
				z: pos.z
			},
			castShadow: true,
			collisionGroup: cannon.collisionGroup.solids,
			collisionFilter: cannon.collisionGroup.solids | cannon.collisionGroup.player | cannon.collisionGroup.enemy// | cannon.collisionGroup.projectile
		});
		this.mesh = cannon.getMeshFromBody(this.body);
	}
}
