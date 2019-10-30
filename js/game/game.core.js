/*
 * Game Core - Demo 1 (Simple demo)
 *
 * A simple example with basic controls (see _game.core.js for an uncommented version of this file)
 */

window.game = window.game || {};

window.game.core = function () {
	var _game = {
		// Methods
		init: function(options) {
			// Setup necessary game components (_events, _three, _cannon, _ui)
			_game.initComponents(options);
			_three.setupSkybox();
			// Create player and level
			//_game.level.create();
			//_game.enemy.create();
			// Initiate the game loop
			//_game.loop();
		},
		destroy: function() {
			// Pause animation frame loop
			window.cancelAnimationFrame(_animationFrameLoop);
			_ui.destroy();
			// Destroy THREE.js scene and Cannon.js world and recreate them
			_cannon.destroy();

			_three.reset(_cannon);
			//delete all enemies and players
			_playerHandler.destroy();
			_enemyHandler.destroy();
		},
		loop: function() {
			var dt = _clock.getDelta();
			// Assign an id to the animation frame loop
			_animationFrameLoop =  window.requestAnimationFrame(_game.loop);
			_controllerHandler.updateStatus();
			// Update Cannon.js world and player state
			_cannon.updatePhysics();
			_playerHandler.updatePlayers(dt);
			//_game.enemy.update();
			_enemyHandler.updateEnemies(dt);

			_three.updateCamera(_playerHandler);
			// css elements update
			_ui.update(_three);
			//player ui update
			//_playerUI.update();
			// Render visual scene
			_three.render();
		},
		reset: function() {
			_game.destroy();
			_game.start();
			_enemyHandler.addEnemy(new THREE.Vector3(5,2,5));
		},
		start: function() {
			_clock = new THREE.Clock(true);
			_clock.start();
			_levelHandler.create();
			_game.loop();
		},
		initComponents: function (options) {
			// Reference game components one time
			_events = window.game.events();
			_three = window.game.three();
			_cannon = window.game.cannon();
			_ui = window.game.ui();
			_controllerHandler = window.game.controllerHandler();
			_enemyHandler = window.game.enemyHandler();
			_playerHandler = window.game.playerHandler();
			_levelHandler = window.game.levelHandler();
			_options = options;
			// Initialize components with options
			_controllerHandler.init(_playerHandler, _ui);
			_playerHandler.init(_cannon,_three,_game,_controllerHandler,_ui,_enemyHandler);
			_levelHandler.init(_cannon,_three);
			_enemyHandler.init(_cannon,_three,_game,_playerHandler, _levelHandler, _ui);
			_events.init();
			_ui.init(_three);
			_cannon.init(_three);
			_three.init(_cannon, _options);
			_levelHandler.create();
			_game.start(options);
			for (var i = 0; i < 7; i++) {
				var xP = (Math.random()-0.5)*20;
          	    var yP = 1 + (Math.random()-0.5)*1;
          	    var zP = (Math.random()-0.5)*20;
          	    _enemyHandler.addEnemy(new THREE.Vector3(xP,yP,zP));
			}
			_enemyHandler.addEnemy(new THREE.Vector3(5,2,5));

			// Add specific events for key down
			_events.onKeyDown = function () {
				//if (!_ui.hasClass("glowI", "fade-out")) {
				//	_ui.fadeOut("glowI");
				//	if (!_events.keyboard.pressed["w"])
				//		_playerHandler.addPlayer();
				//}
				//if (!_ui.hasClass("infoboxIntro", "fade-out")) {
				//	_ui.fadeOut("infoboxIntro");
				//	if (!_events.keyboard.pressed["w"])
				//		_playerHandler.addPlayer();
				//}
				//debug kkeys
				if (_events.keyboard.pressed["leftArrow"]) {
					_three.camera.position.set(_three.camera.position.x+0.1,_three.camera.position.y,_three.camera.position.z);
					_three.camera.lookAt(0,0,0);
				}
				if (_events.keyboard.pressed["rightArrow"]) {
					_three.camera.position.set(_three.camera.position.x-0.1,_three.camera.position.y,_three.camera.position.z);
					_three.camera.lookAt(0,0,0);
				}
				if (_events.keyboard.pressed["upArrow"]) {
					_three.camera.position.set(_three.camera.position.x,_three.camera.position.y,_three.camera.position.z+0.1);
					_three.camera.lookAt(0,0,0);
				}
				if (_events.keyboard.pressed["downArrow"]) {
					_three.camera.position.set(_three.camera.position.x,_three.camera.position.y,_three.camera.position.z-0.1);
					_three.camera.lookAt(0,0,0);
				}
				if (_events.keyboard.pressed["w"]) {
					_game.reset();
				} 
				if (_events.keyboard.pressed["a"]) {
					_playerHandler.addPlayer();
				}
			};

			_controllerHandler.anyControllerButtonPressed = function() {
				//if (!_ui.hasClass("infoboxIntro", "fade-out")) {
				//	_ui.fadeOut("infoboxIntro");
				//}
			};
		}
	};

	// Internal variables
	var _events;
	var _three;
	var _cannon;
	var _ui;
	var _controllerHandler;
	var _animationFrameLoop;
	var _enemyHandler;
	var _playerHandler;
	var _levelHandler;
	var _options;
	var _clock;

	return _game;
};
