moduleLoader.define('flightController', ['state', 'vehicle', 'autopilot'], (state, vehicle, autopilot) => {
    
    class FlightController {
        constructor() {
            this.state = state;
            this.vehicle = vehicle;
            this.autopilot = autopilot;
            this.manualControlActive = false;
            this.controlInputs = {
                pitch: 0,
                throttle: 50,
                yaw: 0,
                roll: 0
            };
        }

        setManualControl(active) {
            this.manualControlActive = active;
            this.state.set('autopilot.manualControlOn', active);
            
            if (active) {
                this.autopilot.disableMode('pitchHold');
                this.autopilot.disableMode('attitudeHold');
            }
        }

        setControlInput(axis, value) {
            if (axis in this.controlInputs) {
                this.controlInputs[axis] = Math.max(-100, Math.min(100, value));
                
                if (this.manualControlActive) {
                    this.applyManualControl(axis, this.controlInputs[axis]);
                }
            }
        }

        applyManualControl(axis, value) {
            switch (axis) {
                case 'pitch':
                    const maxGimbal = this.state.get('vehicle.gimbalAngleLimit') * 180 / Math.PI;
                    const gimbalPosition = (value / 100) * maxGimbal;
                    this.state.set('vehicle.gimbalPosition', gimbalPosition);
                    break;

                case 'throttle':
                    const throttlePercent = ((value + 100) / 2);
                    this.state.set('vehicle.throttle', throttlePercent);
                    break;

                case 'yaw':
                    break;

                case 'roll':
                    break;
            }
        }

        processKeyboardInput(keyCode, isPressed) {
            const commands = [];

            switch (keyCode) {
                case 'KeyW':
                case 'ArrowUp':
                    if (isPressed) {
                        this.adjustThrottle(10);
                    }
                    break;

                case 'KeyS':
                case 'ArrowDown':
                    if (isPressed) {
                        this.adjustThrottle(-10);
                    }
                    break;

                case 'KeyA':
                case 'ArrowLeft':
                    this.setControlInput('pitch', isPressed ? -50 : 0);
                    break;

                case 'KeyD':
                case 'ArrowRight':
                    this.setControlInput('pitch', isPressed ? 50 : 0);
                    break;

                case 'KeyZ':
                    if (isPressed) {
                        this.state.set('vehicle.throttle', 100);
                    }
                    break;

                case 'KeyX':
                    if (isPressed) {
                        this.state.set('vehicle.throttle', 0);
                    }
                    break;

                case 'Space':
                    if (isPressed) {
                        this.vehicle.toggleAllEngines();
                    }
                    break;

                case 'Digit1':
                    if (isPressed) {
                        this.vehicle.toggleEngine(1);
                    }
                    break;

                case 'Digit2':
                    if (isPressed) {
                        this.vehicle.toggleEngine(2);
                    }
                    break;

                case 'Digit3':
                    if (isPressed) {
                        this.vehicle.toggleEngine(3);
                    }
                    break;

                case 'KeyF':
                    if (isPressed) {
                        this.vehicle.toggleSystem('fins');
                    }
                    break;

                case 'KeyR':
                    if (isPressed) {
                        this.vehicle.toggleSystem('rcs');
                    }
                    break;

                case 'KeyT':
                    if (isPressed) {
                        this.autopilot.toggleMode('attitudeHold');
                    }
                    break;

                case 'Backspace':
                    if (isPressed) {
                        this.autopilot.toggleMode('boostBack');
                    }
                    break;

                case 'Equal':
                case 'Plus':
                    if (isPressed) {
                        this.adjustZoom(0.1);
                    }
                    break;

                case 'Minus':
                    if (isPressed) {
                        this.adjustZoom(-0.1);
                    }
                    break;
            }

            return commands;
        }

        adjustThrottle(delta) {
            const currentThrottle = this.state.get('vehicle.throttle');
            const newThrottle = Math.max(0, Math.min(100, currentThrottle + delta));
            this.state.set('vehicle.throttle', newThrottle);
        }

        adjustZoom(delta) {
            const currentZoom = this.state.get('rendering.zoom') || 1.0;
            const newZoom = Math.max(0.1, Math.min(5.0, currentZoom + delta));
            this.state.set('rendering.zoom', newZoom);
        }

        processTouchInput(touchData) {
            if (touchData.type === 'pitch') {
                this.setControlInput('pitch', touchData.value);
            } else if (touchData.type === 'throttle') {
                this.setControlInput('throttle', touchData.value);
            }
        }

        processDeviceOrientation(orientationData) {
            if (this.state.get('ui.tiltControlEnabled')) {
                const pitchInput = orientationData.beta || 0;
                const normalizedPitch = Math.max(-45, Math.min(45, pitchInput)) / 45 * 100;
                this.setControlInput('pitch', normalizedPitch);
            }
        }

        executeControlInputs() {
            if (!this.manualControlActive) return;

            Object.keys(this.controlInputs).forEach(axis => {
                this.applyManualControl(axis, this.controlInputs[axis]);
            });
        }

        resetControls() {
            this.controlInputs = {
                pitch: 0,
                throttle: 50,
                yaw: 0,
                roll: 0
            };
            
            this.state.set('vehicle.gimbalPosition', 0);
            this.setManualControl(false);
        }

        getControlStatus() {
            return {
                manualControlActive: this.manualControlActive,
                controlInputs: { ...this.controlInputs },
                activeAutopilotModes: [...this.autopilot.activeModes],
                engineStatus: this.vehicle.getEngineStatus(),
                systemStatus: this.vehicle.getSystemStatus()
            };
        }

        update(deltaTime) {
            if (!this.manualControlActive) {
                this.autopilot.update(deltaTime);
            } else {
                this.executeControlInputs();
            }

            return this.getControlStatus();
        }

        initialize() {
            this.resetControls();
        }
    }

    return new FlightController();
});