/*
 * Game Cannon.js module
 *
 * A class for the Cannon.js setup providing rigid body management, collision detection extensions and some helpers
 */

window.game = window.game || {};

window.game.cannon = function() {
	var _cannon = {
		// Cannon.js world holding all rigid bodies of the level
		world: null,
		// Bodies correspond to the physical objects inside the Cannon.js world
		bodies: [],
		// Visuals are the visual representations of the bodies that are finally rendered by THREE.js
		visuals: [],
		numBodies : 0,
		// Default friction and restitution
		friction: 0.0,
		restitution: 0.0,
		// Default Z gravity (approximation of 9,806)
		gravity: -10,
		// Interval speed for Cannon.js to step the physics simulation
		timestep: 1 / 16,
		// Player physics material 
		playerPhysicsMaterial: null,
		// Enemy physics material 
		enemyPhysicsMaterial: null,
		// Solid material for all other level objects
		solidMaterial: null,
		// ground Material for ground
		groundMaterial: null,
		// Local storage of three
		three: null,
		//collision group settings in english (must be powers of 2 as it uses bitshifting)
		collisionGroup: {
			player : 1,
			projectile : 2,
			enemy : 4,
			solids : 8,
		},

		// Methods
		init: function(t) {
			_cannon.three = t;
			_cannon.world = new CANNON.World(); //initialize cannon world and physics solver
            _cannon.world.quatNormalizeSkip = 0;
            _cannon.world.quatNormalizeFast = false;

            var solver = new CANNON.GSSolver();

            _cannon.world.defaultContactMaterial.contactEquationStiffness = 1e8;
            _cannon.world.defaultContactMaterial.contactEquationRelaxation = 3;

            solver.iterations = 7;
            solver.tolerance = 0.1;
            var split = true;
            if(split)
                _cannon.world.solver = new CANNON.SplitSolver(solver);
        	else
                _cannon.world.solver = solver;

            _cannon.world.gravity.set(0,_cannon.gravity,0);
            _cannon.world.broadphase = new CANNON.NaiveBroadphase();

            // Create a slippery material (friction coefficient = 0.0)
            _cannon.groundMaterial = new CANNON.Material("groundMaterial");
            _cannon.createPhysicsMaterial({
            	material: _cannon.groundMaterial,
            	friction: 0.4,
            	restitution: 0.3,
            	frictionEquation: true
            });
            //solids material for solid objects 
            _cannon.solidMaterial = new CANNON.Material("solidsMaterial");
            _cannon.createPhysicsMaterial({
            	material: _cannon.solidMaterial
            });
            //player material that is slippery
            _cannon.playerPhysicsMaterial = new CANNON.Material("playerPhysicsMaterial");
            _cannon.createPhysicsMaterial({
            	material: _cannon.playerPhysicsMaterial,
            	friction: 0,
            	restitution: 0
            });
            //enemy material that is slippery
            _cannon.enemyPhysicsMaterial = new CANNON.Material("enemyMaterial");
            _cannon.createPhysicsMaterial({
            	material: _cannon.enemyPhysicsMaterial,
            	friction: 0,
            	restitution: 0
            });
		},

		setup: function() {

		},

		destroy: function () {
			// Remove all entities from the scene and Cannon's world
			_cannon.removeAllVisuals();
		},

		rotateOnAxis: function(body, axis, radians) { //additive to rotation
			// Equivalent to THREE's Object3D.rotateOnAxis
			var rotationQuaternion = new CANNON.Quaternion();
			rotationQuaternion.setFromAxisAngle(axis, radians);
			body.quaternion = rotationQuaternion.mult(body.quaternion);
		},

		setOnAxis: function(body, axis, radians) { //sets rotations
			//set rotation of object from radians
			body.quaternion.setFromAxisAngle(axis, radians);
		},

		replaceMesh: function(body, mesh) {
			var bodyCount = _cannon.bodies.length;
			for (var j = 0; j < bodyCount; j++){
				if (body == _cannon.bodies[j]) {
					_cannon.visuals[j] = mesh;
				}
			}
			_cannon.three.scene.add(mesh);
		},

		createBody: function(options) {
			// Creates a new rigid body based on specific options
			var body  = new CANNON.Body({mass: options.mass, shape: options.shape, material: options.material });
			body.position.set(options.position.x, options.position.y, options.position.z);

			// Apply a rotation if set by using Quaternions
			if (options.rotation) _cannon.setOnAxis(body, options.rotation[0], options.rotation[1]);

			if (options.collisionGroup && options.collisionFilter) {
				_cannon.applyCollisionGroups(body, options.collisionGroup, options.collisionFilter);
			} else {
				if (options.collisionGroup || options.collisionFilter) { //errors if one is present but not the other
					if (options.collisionGroup) console.error("cannot set collision group as filter is missing");
					else console.error("cannot set collision filter as group is missing")
				}
			}



			//create visual mesh
			var mesh = null;
			if (options.meshMaterial) {
				if (options.mesh) {
					mesh = options.mesh;
				} else {
					if (options.geometry == null) {
						 var shape = body.shapes[0];
						 mesh = _cannon.shape2mesh(shape, options.meshMaterial);
					} else {
						mesh = new THREE.Mesh(options.geometry, options.meshMaterial);
					}
				}
			} else {
				console.error("Cannot create mesh without material");
				return;
			}

			if (options.offset) body.shapeOffsets = [options.offset];
			mesh.position.set(options.position.x, options.position.y, options.position.z);
			if (options.receiveShadow) mesh.receiveShadow = options.receiveShadow;
			if (options.castShadow) mesh.castShadow = options.castShadow;
			
			
			// Add the entity to the scene and world
			_cannon.addVisual(body, mesh);
			
			return body;
		},

		applyCollisionGroups (body, group, masks) { //apply collision mask in array format and turn into bitwise or
			var mask;
			if (masks.length > 1) {
				mask = masks[0];
				for (var i = 1; i < masks.length; i++) {
					mask = mask | masks[i];
				}
			} else mask = masks;
			body.collisionFilterGroup = group;
			body.collisionFilterMask = mask;
		},

		getMeshFromBody: function(body) { //get mesh from body
			var bodyCount = _cannon.bodies.length;
				for (var j = 0; j < bodyCount; j++){
					if (body == _cannon.bodies[j]) {
						break;
					}
				}
			return _cannon.visuals[j];
		},

		createPhysicsMaterial: function(options) {
			// Create a new material and add a Cannon ContactMaterial to the world always using _cannon.playerPhysicsMaterial as basis
			var physicsMaterial = options.material || new CANNON.Material();
			var contactMaterial;
			if (!options.frictionEquation) {
				contactMaterial = new CANNON.ContactMaterial(_cannon.groundMaterial, physicsMaterial, {
					friction: options.friction || _cannon.friction, 
					restitution: options.restitution || _cannon.restitution,
				});
			} else {
				contactMaterial = new CANNON.ContactMaterial(_cannon.groundMaterial, physicsMaterial, {
					friction: options.friction || _cannon.friction, 
					restitution: options.restitution || _cannon.restitution,
            		frictionEquationStiffness: 1e8,
            		frictionEquationRegularizationTime: 3
				});
			}
			_cannon.world.addContactMaterial(contactMaterial);
			return physicsMaterial;
		},

		addVisual: function(body, mesh) {
			// Populate the bodies and visuals arrays
			if (body && mesh) {
				_cannon.bodies.push(body);
				_cannon.visuals.push(mesh);
				// Add body/mesh to scene/world
				_cannon.three.scene.add(mesh);
				_cannon.world.add(body);
				_cannon.numBodies++;
			} else {
				console.error("body or mesh not found, cannot add visual mesh");
			}
		},

		removeVisual: function(body){
			// Remove an entity from the scene/world
			if (body) {
				_cannon.three.scene.remove(_cannon.getMeshFromBody(body));
				_cannon.world.remove(body);
				for (var i = _cannon.bodies.length - 1; i >= 0; i--) {
					if (_cannon.bodies[i] == body) {
						_cannon.visuals.splice(i,1);
						_cannon.bodies.splice(i,1);
						_cannon.numBodies--;
						return;
					}
				}
			}
		},
		removeAllVisuals: function() {
			// Clear the whole physics world and THREE.js scene
			var bodyCount = _cannon.bodies.length;
			for (var i = 0; i < bodyCount; i++ ){
				_cannon.three.scene.remove(_cannon.visuals[i]);
				_cannon.world.remove(_cannon.bodies[i]);
			};
			_cannon.bodies.splice(0,_cannon.numBodies);
			_cannon.visuals.splice(0,_cannon.numBodies);
			_cannon.numBodies = 0;
		},
		updatePhysics: function() {
			// Store the amount of bodies into bodyCount
			var bodyCount = _cannon.bodies.length;
			// Copy coordinates from Cannon.js to Three.js
			for (var i = 0; i < bodyCount; i++) {
				var body = _cannon.bodies[i], visual = _cannon.visuals[i];
				visual.position.set(body.position.x, body.position.y, body.position.z);

				// Update the Quaternions
				if (body.quaternion) {
					visual.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
				}
			}
			// Perform a simulation step
			_cannon.world.step(_cannon.timestep);
		},
		shape2mesh: function(shape, material) {
		 	// Convert a given shape to a THREE.js mesh
		 	var mesh;
		 	//var submesh;
		 	switch (shape.type){
		 		case CANNON.Shape.types.SPHERE: //convert sphere from cannon to three visual
		 			var sphere = new THREE.SphereGeometry(shape.radius, 32, 32);
		 			mesh = new THREE.Mesh(sphere, material);
		 			break;

		 		case CANNON.Shape.types.BOX: { //convert box from cannon to three visual
		 			var box = new THREE.BoxGeometry(shape.halfExtents.x * 2,
		 					shape.halfExtents.y * 2,
		 					shape.halfExtents.z * 2);
		 			mesh = new THREE.Mesh(box, material);
		 			mesh.castShadow = true;
		 			mesh.receiveShadow = true;
		 			break;
		 		}

		 		case CANNON.Shape.types.CONVEXPOLYHEDRON: {
            		var geo = new THREE.Geometry();

        			// Add vertices
            		for (var i = 0; i < shape.vertices.length; i++) {
                		var v = shape.vertices[i];
            		    geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
            		}
		
            		for(var i=0; i < shape.faces.length; i++){
            		    var face = shape.faces[i];
		
            		    // add triangles
            		    var a = face[0];
            		    for (var j = 1; j < face.length - 1; j++) {
            		        var b = face[j];
            		        var c = face[j + 1];
            		        geo.faces.push(new THREE.Face3(a, b, c));
            		    }
            		}
            		geo.computeBoundingSphere();
            		geo.computeFaceNormals();
            		mesh = new THREE.Mesh( geo, material );
            		break;
            	}

		 		default:
		 			throw "Visual type not recognized: " + shape.type;
			}

	 		return mesh;
		}
	};

	var _three;

	return _cannon;
};
