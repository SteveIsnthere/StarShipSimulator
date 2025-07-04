moduleLoader.define('vehicle', ['state'], (state) => {
    
    class Vehicle {
        constructor() {
            this.state = state;
            this.engineStatus = {
                raptor1: false,
                raptor2: false,
                raptor3: false
            };
            this.systemStatus = {
                rcs: false,
                fins: false,
                fuelDump: false,
                gearDown: false
            };
            this.warnings = {
                coldGasLow: false,
                fuelLow: false,
                heatDamaged: false,
                overPressure: false,
                overGload: false
            };
            this.failures = {
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
        }

        updateMass() {
            const dryMass = this.state.get('vehicle.dryMass');
            const propellantMass = this.state.get('vehicle.propellantMass');
            const totalMass = dryMass + propellantMass;
            
            this.state.set('vehicle.mass', totalMass);
            
            const diameter = this.state.get('vehicle.diameter');
            const height = this.state.get('vehicle.height');
            const momentOfInertia = totalMass * (diameter / 2) ** 2 * 0.25 + totalMass * height ** 2 / 12;
            this.state.set('vehicle.momentOfInertia', momentOfInertia);
            
            return totalMass;
        }

        consumeFuel(deltaTime) {
            const activeEngines = this.getActiveEngineCount();
            if (activeEngines === 0) return;

            const throttle = this.state.get('vehicle.throttleCurrent') / 100;
            const maxFuelFlowPerRaptor = this.state.get('vehicle.maxFuelFlowPerRaptor');
            const currentPropellantMass = this.state.get('vehicle.propellantMass');
            
            const fuelConsumption = activeEngines * maxFuelFlowPerRaptor * throttle * deltaTime;
            const newPropellantMass = Math.max(0, currentPropellantMass - fuelConsumption);
            
            this.state.set('vehicle.propellantMass', newPropellantMass);
            this.updateMass();

            if (newPropellantMass <= 0) {
                this.failures.fuelRunOut = true;
                this.engineStatus.raptor1 = false;
                this.engineStatus.raptor2 = false;
                this.engineStatus.raptor3 = false;
            } else if (newPropellantMass < 10000) {
                this.warnings.fuelLow = true;
            }

            return newPropellantMass;
        }

        dumpFuel(deltaTime) {
            if (!this.systemStatus.fuelDump) return;

            const dumpRate = this.state.get('vehicle.dumpRate');
            const currentPropellantMass = this.state.get('vehicle.propellantMass');
            
            const dumpAmount = dumpRate * deltaTime;
            const newPropellantMass = Math.max(0, currentPropellantMass - dumpAmount);
            
            this.state.set('vehicle.propellantMass', newPropellantMass);
            this.updateMass();

            return newPropellantMass;
        }

        getActiveEngineCount() {
            let count = 0;
            if (this.engineStatus.raptor1 && !this.failures.raptor1Fail) count++;
            if (this.engineStatus.raptor2 && !this.failures.raptor2Fail) count++;
            if (this.engineStatus.raptor3 && !this.failures.raptor3Fail) count++;
            return count;
        }

        calculateThrust() {
            const activeEngines = this.getActiveEngineCount();
            if (activeEngines === 0) {
                this.state.set('flight.thrust', 0);
                this.state.set('flight.twr', 0);
                return 0;
            }

            const throttle = this.state.get('vehicle.throttleCurrent') / 100;
            const maxThrustPerRaptor = this.state.get('vehicle.maxThrustPerRaptor');
            
            const totalThrust = activeEngines * maxThrustPerRaptor * throttle;
            this.state.set('flight.thrust', totalThrust);

            const vehicleMass = this.state.get('vehicle.mass');
            const gravity = this.state.get('world.gravity');
            const twr = totalThrust / (vehicleMass * gravity);
            this.state.set('flight.twr', twr);

            return totalThrust;
        }

        calculateThrustVector() {
            const thrust = this.state.get('flight.thrust');
            const pitch = this.state.get('flight.pitch');
            const gimbalPosition = this.state.get('vehicle.gimbalPosition');
            
            const thrustAngle = pitch + (gimbalPosition * Math.PI / 180);
            
            const thrustVectorX = thrust * Math.sin(thrustAngle);
            const thrustVectorY = thrust * Math.cos(thrustAngle);
            
            return { thrustVectorX, thrustVectorY, thrustAngle };
        }

        updateThrottleControl() {
            const targetThrottle = this.state.get('vehicle.throttle');
            const currentThrottle = this.state.get('vehicle.throttleCurrent');
            const throttleSpeedPerFrame = this.state.get('vehicle.throttleSpeedPerFrame');
            
            let newThrottle = currentThrottle;
            
            if (Math.abs(targetThrottle - currentThrottle) > throttleSpeedPerFrame) {
                if (targetThrottle > currentThrottle) {
                    newThrottle = currentThrottle + throttleSpeedPerFrame;
                } else {
                    newThrottle = currentThrottle - throttleSpeedPerFrame;
                }
            } else {
                newThrottle = targetThrottle;
            }
            
            const upperLimit = this.state.get('vehicle.throttleUpperLimit');
            const lowerLimit = this.state.get('vehicle.throttleLowerLimit');
            newThrottle = Math.max(lowerLimit, Math.min(upperLimit, newThrottle));
            
            this.state.set('vehicle.throttleCurrent', newThrottle);
            return newThrottle;
        }

        toggleEngine(engineNumber) {
            if (this.failures.fuelRunOut) return false;
            
            const engineKey = `raptor${engineNumber}`;
            const failureKey = `${engineKey}Fail`;
            
            if (this.failures[failureKey]) return false;
            
            this.engineStatus[engineKey] = !this.engineStatus[engineKey];
            return this.engineStatus[engineKey];
        }

        toggleAllEngines() {
            if (this.failures.fuelRunOut) return false;
            
            const anyEngineOn = this.engineStatus.raptor1 || this.engineStatus.raptor2 || this.engineStatus.raptor3;
            
            this.engineStatus.raptor1 = !anyEngineOn && !this.failures.raptor1Fail;
            this.engineStatus.raptor2 = !anyEngineOn && !this.failures.raptor2Fail;
            this.engineStatus.raptor3 = !anyEngineOn && !this.failures.raptor3Fail;
            
            return !anyEngineOn;
        }

        toggleSystem(systemName) {
            if (systemName in this.systemStatus) {
                this.systemStatus[systemName] = !this.systemStatus[systemName];
                return this.systemStatus[systemName];
            }
            return false;
        }

        checkLimits() {
            const perceivedG = this.state.get('flight.perceivedG');
            const thermalPower = this.state.get('flight.thermalPower');
            const dynamicPressure = this.state.get('flight.dynamicPressure');
            
            const gLimit = this.state.get('vehicle.gLimit');
            const heatLimit = this.state.get('vehicle.heatLimit');
            const dynamicPressureLimit = this.state.get('vehicle.dynamicPressureLimit');

            this.warnings.overGload = perceivedG > gLimit * 0.8;
            this.warnings.heatDamaged = thermalPower > heatLimit * 0.8;
            this.warnings.overPressure = dynamicPressure > dynamicPressureLimit * 0.8;

            this.failures.overGload = perceivedG > gLimit;
            this.failures.heatDamaged = thermalPower > heatLimit;
            this.failures.overPressure = dynamicPressure > dynamicPressureLimit;

            if (this.failures.overGload || this.failures.heatDamaged || this.failures.overPressure) {
                this.failures.inFlightBreakUp = true;
            }
        }

        update(deltaTime) {
            this.updateThrottleControl();
            this.calculateThrust();
            this.consumeFuel(deltaTime);
            this.dumpFuel(deltaTime);
            this.checkLimits();
        }

        getEngineStatus() {
            return { ...this.engineStatus };
        }

        getSystemStatus() {
            return { ...this.systemStatus };
        }

        getWarnings() {
            return { ...this.warnings };
        }

        getFailures() {
            return { ...this.failures };
        }

        initialize() {
            this.updateMass();
            this.calculateThrust();
        }
    }

    return new Vehicle();
});