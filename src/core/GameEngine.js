moduleLoader.define('gameEngine', [
    'state', 'atmosphere', 'aerodynamics', 'vehicle', 'dynamics', 
    'autopilot', 'flightController', 'sceneManager'
], (state, atmosphere, aerodynamics, vehicle, dynamics, autopilot, flightController, sceneManager) => {
    
    class GameEngine {
        constructor() {
            this.state = state;
            this.atmosphere = atmosphere;
            this.aerodynamics = aerodynamics;
            this.vehicle = vehicle;
            this.dynamics = dynamics;
            this.autopilot = autopilot;
            this.flightController = flightController;
            this.sceneManager = sceneManager;
            
            this.isRunning = false;
            this.isPaused = false;
            this.lastTime = 0;
            this.deltaTime = 0;
            this.frameCount = 0;
            this.targetFPS = 60;
            this.frameTime = 1000 / this.targetFPS;
            
            this.performanceStats = {
                fps: 60,
                frameTime: 16.67,
                updateTime: 0,
                renderTime: 0
            };
        }

        async initialize() {
            console.log('Initializing Game Engine...');
            
            this.state.initializeState();
            
            await this.atmosphere.initialize();
            await this.aerodynamics.initialize();
            await this.vehicle.initialize();
            await this.dynamics.initialize();
            await this.autopilot.initialize();
            await this.flightController.initialize();
            
            const canvas = document.getElementById('mainView');
            if (!canvas) {
                throw new Error('Canvas element with id "mainView" not found');
            }
            
            await this.sceneManager.initialize(canvas);
            
            this.setupEventListeners();
            
            console.log('Game Engine initialized successfully');
            return true;
        }

        setupEventListeners() {
            document.addEventListener('keydown', (event) => {
                this.flightController.processKeyboardInput(event.code, true);
            });

            document.addEventListener('keyup', (event) => {
                this.flightController.processKeyboardInput(event.code, false);
            });

            window.addEventListener('deviceorientation', (event) => {
                this.flightController.processDeviceOrientation({
                    alpha: event.alpha,
                    beta: event.beta,
                    gamma: event.gamma
                });
            });

            window.addEventListener('beforeunload', () => {
                this.stop();
            });
        }

        start() {
            if (this.isRunning) return;
            
            console.log('Starting Game Engine...');
            this.isRunning = true;
            this.isPaused = false;
            this.lastTime = performance.now();
            
            this.gameLoop();
        }

        stop() {
            console.log('Stopping Game Engine...');
            this.isRunning = false;
            this.isPaused = false;
        }

        pause() {
            this.isPaused = true;
        }

        resume() {
            if (this.isRunning) {
                this.isPaused = false;
                this.lastTime = performance.now();
            }
        }

        gameLoop() {
            if (!this.isRunning) return;

            const currentTime = performance.now();
            const rawDeltaTime = currentTime - this.lastTime;
            
            if (rawDeltaTime >= this.frameTime) {
                this.deltaTime = rawDeltaTime / 1000;
                this.lastTime = currentTime;

                if (!this.isPaused) {
                    const updateStartTime = performance.now();
                    this.update(this.deltaTime);
                    this.performanceStats.updateTime = performance.now() - updateStartTime;
                }

                this.updatePerformanceStats(rawDeltaTime);
                this.frameCount++;
            }

            requestAnimationFrame(() => this.gameLoop());
        }

        update(deltaTime) {
            const timeAccel = this.state.get('world.timeAccel') || 1;
            const acceleratedDeltaTime = deltaTime * timeAccel;

            try {
                this.atmosphere.updateAtmosphere();
                this.atmosphere.getDynamicPressure();
                this.atmosphere.getReentryHeatPower();

                this.aerodynamics.updateAerodynamicForces();
                this.aerodynamics.getMachNumber();

                this.vehicle.update(acceleratedDeltaTime);

                const flightStatus = this.dynamics.update(acceleratedDeltaTime);

                this.flightController.update(acceleratedDeltaTime);

                this.updateFlightTime(acceleratedDeltaTime);
                this.updateFrameCount();

                if (flightStatus.status === 'crashed') {
                    this.handleCrash();
                } else if (flightStatus.status === 'landed') {
                    this.handleLanding();
                }

            } catch (error) {
                console.error('Error in game update loop:', error);
                this.handleError(error);
            }
        }

        updateFlightTime(deltaTime) {
            const currentTime = this.state.get('flight.timeSpent') || 0;
            const environmentTime = this.state.get('world.environmentTime') || 0;
            
            this.state.set('flight.timeSpent', currentTime + deltaTime);
            this.state.set('world.environmentTime', environmentTime + deltaTime);
        }

        updateFrameCount() {
            const currentCount = this.state.get('flight.updatedFrameCount') || 0;
            this.state.set('flight.updatedFrameCount', currentCount + 1);
        }

        handleCrash() {
            console.log('Vehicle crashed!');
            this.vehicle.failures.crashed = true;
            
            this.state.set('flight.speedX', 0);
            this.state.set('flight.speedY', 0);
            this.state.set('flight.angularVelocity', 0);
            
            this.pause();
        }

        handleLanding() {
            console.log('Vehicle landed successfully!');
            
            this.state.set('flight.speedX', 0);
            this.state.set('flight.speedY', 0);
            this.state.set('flight.angularVelocity', 0);
            
            this.pause();
        }

        handleError(error) {
            console.error('Game Engine Error:', error);
            this.pause();
        }

        updatePerformanceStats(frameTime) {
            this.performanceStats.frameTime = frameTime;
            this.performanceStats.fps = 1000 / frameTime;
        }

        restart() {
            console.log('Restarting simulation...');
            
            this.pause();
            
            this.state.reset();
            this.state.initializeState();
            
            this.vehicle.engineStatus = {
                raptor1: false,
                raptor2: false,
                raptor3: false
            };
            this.vehicle.systemStatus = {
                rcs: false,
                fins: false,
                fuelDump: false,
                gearDown: false
            };
            this.vehicle.warnings = {
                coldGasLow: false,
                fuelLow: false,
                heatDamaged: false,
                overPressure: false,
                overGload: false
            };
            this.vehicle.failures = {
                crashed: false,
                inFlightBreakUp: false,
                coldGasRunOut: false,
                fuelRunOut: false,
                raptor1Fail: false,
                raptor2Fail: false,
                raptor3Fail: false,
                heatDamaged: false,
                overPressure: false,
                overGload: false,
                flippedOver: false
            };
            
            this.flightController.resetControls();
            
            this.autopilot.activeModes.clear();
            
            this.frameCount = 0;
            
            console.log('Simulation restarted');
            this.resume();
        }

        setTimeAcceleration(factor) {
            const clampedFactor = Math.max(0.1, Math.min(10, factor));
            this.state.set('world.timeAccel', clampedFactor);
            this.state.set('world.renderTimeInterval', this.targetFPS / clampedFactor);
        }

        configureScenario(altitude, xPosition, speedX, speedY, pitch, propellant) {
            this.pause();
            
            this.state.set('flight.altitude', altitude || 0);
            this.state.set('flight.downRangeDistance', xPosition || this.state.get('world.starBaseXpos'));
            this.state.set('flight.speedX', speedX || 0);
            this.state.set('flight.speedY', speedY || 0);
            this.state.set('flight.pitch', (pitch || 0) * Math.PI / 180);
            this.state.set('vehicle.propellantMass', propellant || 350000);
            
            this.vehicle.updateMass();
            this.dynamics.updateFlightAngles();
            
            console.log('Scenario configured');
        }

        getStatus() {
            return {
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                frameCount: this.frameCount,
                performance: { ...this.performanceStats },
                flightTime: this.state.get('flight.timeSpent'),
                timeAcceleration: this.state.get('world.timeAccel')
            };
        }

        getFlightData() {
            return {
                altitude: this.state.get('flight.altitude'),
                speed: this.state.get('flight.trueSpeed'),
                downrange: this.state.get('flight.downRangeDistance'),
                fuel: this.state.get('vehicle.propellantMass'),
                thrust: this.state.get('flight.thrust'),
                twr: this.state.get('flight.twr'),
                gforce: this.state.get('flight.perceivedG'),
                pitch: this.state.get('flight.pitch') * 180 / Math.PI
            };
        }

        destroy() {
            this.stop();
            this.sceneManager.destroy();
        }
    }

    return new GameEngine();
});