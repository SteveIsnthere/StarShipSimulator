moduleLoader.define('autopilot', ['state', 'vehicle'], (state, vehicle) => {
    
    class AutoPilot {
        constructor() {
            this.state = state;
            this.vehicle = vehicle;
            this.modes = new Map();
            this.activeModes = new Set();
        }

        registerMode(name, modeClass) {
            this.modes.set(name, new modeClass(this.state, this.vehicle));
        }

        enableMode(modeName) {
            if (this.modes.has(modeName)) {
                this.activeModes.add(modeName);
                const mode = this.modes.get(modeName);
                if (mode.onEnable) {
                    mode.onEnable();
                }
                return true;
            }
            return false;
        }

        disableMode(modeName) {
            if (this.activeModes.has(modeName)) {
                this.activeModes.delete(modeName);
                const mode = this.modes.get(modeName);
                if (mode.onDisable) {
                    mode.onDisable();
                }
                return true;
            }
            return false;
        }

        toggleMode(modeName) {
            if (this.activeModes.has(modeName)) {
                return this.disableMode(modeName);
            } else {
                return this.enableMode(modeName);
            }
        }

        isModeActive(modeName) {
            return this.activeModes.has(modeName);
        }

        update(deltaTime) {
            const commands = [];
            
            for (const modeName of this.activeModes) {
                const mode = this.modes.get(modeName);
                if (mode && mode.update) {
                    const modeCommands = mode.update(deltaTime);
                    if (modeCommands) {
                        commands.push(...modeCommands);
                    }
                }
            }

            this.executeCommands(commands);
            return commands;
        }

        executeCommands(commands) {
            for (const command of commands) {
                switch (command.type) {
                    case 'throttle':
                        this.state.set('vehicle.throttle', command.value);
                        break;
                    case 'gimbal':
                        this.state.set('vehicle.gimbalPosition', command.value);
                        break;
                    case 'engine':
                        this.vehicle.toggleEngine(command.engine);
                        break;
                    case 'rcs':
                        this.vehicle.toggleSystem('rcs');
                        break;
                    case 'fins':
                        this.vehicle.toggleSystem('fins');
                        break;
                    case 'pitch':
                        this.state.set('autopilot.holdingPitch', command.value);
                        break;
                }
            }
        }

        getActiveModesStatus() {
            const status = {};
            for (const modeName of this.activeModes) {
                const mode = this.modes.get(modeName);
                if (mode && mode.getStatus) {
                    status[modeName] = mode.getStatus();
                }
            }
            return status;
        }

        initialize() {
            this.registerMode('pitchHold', PitchHoldMode);
            this.registerMode('boostBack', BoostBackMode);
            this.registerMode('autoLand', AutoLandMode);
            this.registerMode('liftOff', LiftOffMode);
            this.registerMode('attitudeHold', AttitudeHoldMode);
        }
    }

    class AutoPilotMode {
        constructor(state, vehicle) {
            this.state = state;
            this.vehicle = vehicle;
            this.active = false;
        }

        onEnable() {
            this.active = true;
        }

        onDisable() {
            this.active = false;
        }

        update(deltaTime) {
            return [];
        }

        getStatus() {
            return { active: this.active };
        }
    }

    class PitchHoldMode extends AutoPilotMode {
        constructor(state, vehicle) {
            super(state, vehicle);
            this.targetPitch = 0;
        }

        onEnable() {
            super.onEnable();
            this.targetPitch = this.state.get('flight.pitch');
            this.state.set('autopilot.holdingPitch', this.targetPitch);
        }

        update(deltaTime) {
            if (!this.active) return [];

            const currentPitch = this.state.get('flight.pitch');
            const targetPitch = this.state.get('autopilot.holdingPitch');
            const pitchError = targetPitch - currentPitch;

            const kp = 2.0;
            const kd = 0.5;
            
            const angularVelocity = this.state.get('flight.angularVelocity');
            const gimbalCommand = kp * pitchError - kd * angularVelocity;
            
            const maxGimbal = this.state.get('vehicle.gimbalAngleLimit') * 180 / Math.PI;
            const clampedGimbal = Math.max(-maxGimbal, Math.min(maxGimbal, gimbalCommand * 180 / Math.PI));

            return [{ type: 'gimbal', value: clampedGimbal }];
        }

        getStatus() {
            return {
                active: this.active,
                targetPitch: this.targetPitch,
                pitchError: this.state.get('autopilot.holdingPitch') - this.state.get('flight.pitch')
            };
        }
    }

    class BoostBackMode extends AutoPilotMode {
        constructor(state, vehicle) {
            super(state, vehicle);
            this.stage = 'init';
            this.targetSite = 0;
        }

        onEnable() {
            super.onEnable();
            this.stage = 'init';
            this.targetSite = this.state.get('world.starBaseXpos');
            this.state.set('autopilot.autoBoostBackOn', true);
        }

        onDisable() {
            super.onDisable();
            this.state.set('autopilot.autoBoostBackOn', false);
        }

        update(deltaTime) {
            if (!this.active) return [];

            const commands = [];
            const altitude = this.state.get('flight.altitude');
            const downRange = this.state.get('flight.downRangeDistance');
            const speedX = this.state.get('flight.speedX');

            switch (this.stage) {
                case 'init':
                    this.initializeBoostBack();
                    this.stage = 'boost';
                    break;

                case 'boost':
                    if (this.shouldStartDecelerationStage()) {
                        this.stage = 'decelerate';
                    } else {
                        commands.push({ type: 'throttle', value: 100 });
                        commands.push({ type: 'pitch', value: this.calculateBoostBackAngle() });
                    }
                    break;

                case 'decelerate':
                    if (Math.abs(speedX) < 50) {
                        this.stage = 'complete';
                    } else {
                        commands.push({ type: 'throttle', value: 70 });
                        commands.push({ type: 'pitch', value: this.calculateDecelerationAngle() });
                    }
                    break;

                case 'complete':
                    commands.push({ type: 'throttle', value: 0 });
                    break;
            }

            return commands;
        }

        initializeBoostBack() {
            const downRange = this.state.get('flight.downRangeDistance');
            const targetSite = this.state.get('world.starBaseXpos');
            
            this.state.set('autopilot.boostbackDirection', Math.sign(targetSite - downRange));
        }

        shouldStartDecelerationStage() {
            const altitude = this.state.get('flight.altitude');
            const minHeight = this.state.get('autopilot.propulsiveCorrectionMinHeight');
            return altitude < minHeight;
        }

        calculateBoostBackAngle() {
            const boostbackDirection = this.state.get('autopilot.boostbackDirection');
            return boostbackDirection > 0 ? Math.PI / 6 : -Math.PI / 6;
        }

        calculateDecelerationAngle() {
            const speedX = this.state.get('flight.speedX');
            return Math.sign(speedX) * Math.PI / 4;
        }

        getStatus() {
            return {
                active: this.active,
                stage: this.stage,
                targetSite: this.targetSite
            };
        }
    }

    class AutoLandMode extends AutoPilotMode {
        constructor(state, vehicle) {
            super(state, vehicle);
            this.stage = 'init';
            this.subStage = '';
        }

        onEnable() {
            super.onEnable();
            this.stage = 'init';
            this.state.set('autopilot.autoLandOn', true);
        }

        onDisable() {
            super.onDisable();
            this.state.set('autopilot.autoLandOn', false);
        }

        update(deltaTime) {
            if (!this.active) return [];

            const commands = [];
            const altitude = this.state.get('flight.altitude');

            switch (this.stage) {
                case 'init':
                    this.initializeLanding();
                    this.stage = 'aeroDescent';
                    break;

                case 'aeroDescent':
                    if (altitude < 1000) {
                        this.stage = 'flip';
                    }
                    break;

                case 'flip':
                    if (this.flipCompleted()) {
                        this.stage = 'horizontalAdjustment';
                    } else {
                        commands.push(...this.executeFlip());
                    }
                    break;

                case 'horizontalAdjustment':
                    if (this.horizontalAdjustmentComplete()) {
                        this.stage = 'finalDescent';
                    } else {
                        commands.push(...this.executeHorizontalAdjustment());
                    }
                    break;

                case 'finalDescent':
                    commands.push(...this.executeFinalDescent());
                    if (altitude < 10) {
                        this.stage = 'complete';
                    }
                    break;
            }

            return commands;
        }

        initializeLanding() {
            this.state.set('autopilot.initVehicleConfigCompleted', true);
        }

        flipCompleted() {
            const pitch = this.state.get('flight.pitch');
            const flipGoalAngle = this.state.get('autopilot.flipGoalAngle');
            return Math.abs(pitch - flipGoalAngle) < 0.1;
        }

        executeFlip() {
            return [
                { type: 'engine', engine: 1 },
                { type: 'throttle', value: 50 },
                { type: 'pitch', value: this.state.get('autopilot.flipGoalAngle') }
            ];
        }

        horizontalAdjustmentComplete() {
            const speedX = this.state.get('flight.speedX');
            return Math.abs(speedX) < 5;
        }

        executeHorizontalAdjustment() {
            const speedX = this.state.get('flight.speedX');
            const correction = -Math.sign(speedX) * 0.2;
            
            return [
                { type: 'throttle', value: 60 },
                { type: 'gimbal', value: correction * 180 / Math.PI }
            ];
        }

        executeFinalDescent() {
            const altitude = this.state.get('flight.altitude');
            const speedY = this.state.get('flight.speedY');
            
            const targetDescentRate = -5;
            const descentError = speedY - targetDescentRate;
            
            const throttleAdjustment = descentError * 10;
            const baseThrottle = 70;
            const throttle = Math.max(40, Math.min(100, baseThrottle + throttleAdjustment));

            return [
                { type: 'throttle', value: throttle },
                { type: 'gimbal', value: 0 }
            ];
        }

        getStatus() {
            return {
                active: this.active,
                stage: this.stage,
                subStage: this.subStage
            };
        }
    }

    class LiftOffMode extends AutoPilotMode {
        constructor(state, vehicle) {
            super(state, vehicle);
            this.liftOffComplete = false;
        }

        onEnable() {
            super.onEnable();
            this.state.set('autopilot.autoTakeOffOn', true);
        }

        onDisable() {
            super.onDisable();
            this.state.set('autopilot.autoTakeOffOn', false);
        }

        update(deltaTime) {
            if (!this.active || this.liftOffComplete) return [];

            const altitude = this.state.get('flight.altitude');
            const commands = [];

            if (altitude < 100) {
                commands.push({ type: 'throttle', value: 100 });
                commands.push({ type: 'pitch', value: 0 });
            } else if (altitude < 25000) {
                const targetAngle = this.state.get('autopilot.aomAt_25km');
                const progress = altitude / 25000;
                const currentTarget = targetAngle * progress;
                
                commands.push({ type: 'throttle', value: 100 });
                commands.push({ type: 'pitch', value: currentTarget });
            } else if (altitude < 80000) {
                const aomAt25km = this.state.get('autopilot.aomAt_25km');
                const aomAt80km = this.state.get('autopilot.aomAt_80km');
                const progress = (altitude - 25000) / (80000 - 25000);
                const currentTarget = aomAt25km + (aomAt80km - aomAt25km) * progress;
                
                commands.push({ type: 'throttle', value: 80 });
                commands.push({ type: 'pitch', value: currentTarget });
            } else {
                this.liftOffComplete = true;
                commands.push({ type: 'throttle', value: 0 });
            }

            return commands;
        }

        getStatus() {
            return {
                active: this.active,
                liftOffComplete: this.liftOffComplete
            };
        }
    }

    class AttitudeHoldMode extends AutoPilotMode {
        constructor(state, vehicle) {
            super(state, vehicle);
            this.targetAttitude = { pitch: 0, roll: 0, yaw: 0 };
        }

        onEnable() {
            super.onEnable();
            this.targetAttitude.pitch = this.state.get('flight.pitch');
        }

        update(deltaTime) {
            if (!this.active) return [];

            const currentPitch = this.state.get('flight.pitch');
            const pitchError = this.targetAttitude.pitch - currentPitch;
            const angularVelocity = this.state.get('flight.angularVelocity');

            const kp = 1.5;
            const kd = 0.3;
            
            const correctionAngle = kp * pitchError - kd * angularVelocity;
            const maxCorrection = 15;
            const clampedCorrection = Math.max(-maxCorrection, Math.min(maxCorrection, correctionAngle * 180 / Math.PI));

            return [{ type: 'gimbal', value: clampedCorrection }];
        }

        setTargetPitch(pitch) {
            this.targetAttitude.pitch = pitch;
        }

        getStatus() {
            return {
                active: this.active,
                targetAttitude: { ...this.targetAttitude },
                pitchError: this.targetAttitude.pitch - this.state.get('flight.pitch')
            };
        }
    }

    return new AutoPilot();
});