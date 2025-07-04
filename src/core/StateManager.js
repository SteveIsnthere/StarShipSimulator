class StateManager {
    constructor() {
        this.state = {
            world: {},
            vehicle: {},
            flight: {},
            autopilot: {},
            rendering: {},
            ui: {},
            recorder: {}
        };
        
        this.listeners = new Map();
        this.initialized = false;
    }

    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    initializeState() {
        if (this.initialized) return;
        
        this.initWorld();
        this.initVehicle();
        this.initFlight();
        this.initAutopilot();
        this.initRecorder();
        
        this.initialized = true;
    }

    initWorld() {
        this.state.world = {
            lastFrameRenderedTime: Date.now(),
            frameRate: 60,
            timeAccel: 1,
            renderTimeInterval: 60,
            
            planetRadius: 6400000,
            planetCirconference: 2 * 6400000 * Math.PI,
            planetMass: 5.972e+24,
            planetTimeToRotate: 24 * (60 * 60),
            planetLineaVelocity: (2 * 6400000 * Math.PI) / (24 * 60 * 60),
            
            gravitationalConstant: 6.674e-11,
            gravity: 9.807,
            airResistance_k: 250,
            speedOfSound: 343,
            
            environmentTime: 0,
            wind: 0,
            gust: 0,
            
            starBaseXpos: (2 * 6400000 * Math.PI) / 2,
            
            airDensity: 1.225,
            airPressure: 101.325,
            airTemperature: 15
        };
        
        this.state.world.renderTimeInterval = this.state.world.frameRate / this.state.world.timeAccel;
    }

    initVehicle() {
        this.state.vehicle = {
            height: 50,
            diameter: 9,
            dryMass: 120000,
            propellantMass: 350000,
            
            raptorOffsetFromCenter: 1,
            engineDistanceFromCenterOfMass: 21.8,
            maxThrustPerRaptor: 2200000,
            maxFuelFlowPerRaptor: 650,
            
            throttle: 100,
            throttleCurrent: 100,
            throttleSpeed: 60,
            throttleUpperLimit: 100,
            throttleLowerLimit: 40,
            
            gimbalPosition: 0,
            gimbalSpeed: 600,
            gimbalAngleLimit: 0.2618,
            gimbalPointingDirection: 0,
            
            rcsMaxThrust: 800000,
            rcsThrustDistanceFromCenterOfMass: 20,
            rcsRunTimeRemaining: 25,
            
            finActuationMaxAngle: 1.03,
            frontFinExtention: 0,
            aftFinExtention: 0,
            finActuationSpeed: 120,
            
            frontFinSurfaceArea: 24.2,
            frontFinDistanceFromCenterOfMass: 23.3,
            aftFinSurfaceArea: 45.8,
            aftFinDistanceFromCenterOfMass: 12.6,
            
            finDragCoefficient: 2,
            
            gLimit: 13,
            heatLimit: 55,
            dynamicPressureLimit: 50,
            touchDownPitchLimit: 0.09,
            touchDownSpeedLimit: 10,
            
            dumpRate: 3500,
            dumpLimit: 12000
        };
        
        this.state.vehicle.maxArea = this.state.vehicle.diameter * this.state.vehicle.height;
        this.state.vehicle.minArea = Math.PI * (this.state.vehicle.diameter / 2) ** 2;
        this.state.vehicle.inFlightMaxArea = this.state.vehicle.maxArea;
        this.state.vehicle.mass = this.state.vehicle.dryMass + this.state.vehicle.propellantMass;
        this.state.vehicle.momentOfInertia = this.state.vehicle.mass * (this.state.vehicle.diameter / 2) ** 2 * 0.25 + 
                                           this.state.vehicle.mass * this.state.vehicle.height ** 2 / 12;
        this.state.vehicle.throttleSpeedPerFrame = this.state.vehicle.throttleSpeed / this.state.world.renderTimeInterval;
        this.state.vehicle.gimbalSpeedPerFrame = this.state.vehicle.gimbalSpeed / this.state.world.renderTimeInterval;
        this.state.vehicle.finActuationSpeedPerFrame = this.state.vehicle.finActuationSpeed / this.state.world.renderTimeInterval;
        this.state.vehicle.totalFinSurfaceArea = this.state.vehicle.frontFinSurfaceArea + this.state.vehicle.aftFinSurfaceArea;
    }

    initFlight() {
        this.state.flight = {
            updatedFrameCount: 0,
            timeSpent: 0,
            
            altitude: this.state.vehicle.height / 2,
            downRangeDistance: this.state.world.starBaseXpos,
            downRangeDistanceNextFrame: this.state.world.starBaseXpos,
            
            trueSpeed: 0,
            speedX: 0,
            speedY: 0,
            machSpeed: 0,
            
            thrust: 0,
            thrustAcceleration: 0,
            offAxisThrustDifferenceAcceleration: 0,
            twr: 0,
            
            accelerationX: 0,
            accelerationY: -this.state.world.gravity,
            totalAcceleration: this.state.world.gravity,
            
            thrustVectorForce: 0,
            thrustVectorAcceleration: 0,
            
            rcsThrust: 0,
            rcsThrustAngularAcceleration: 0,
            angularDragAcceleration: 0,
            
            pitch: 0,
            pitchRateOfChange: 0,
            pitchRecord: [Infinity, Infinity],
            
            angularVelocity: 0,
            angularAcceleration: 0,
            
            angleOfMotion: 0,
            angleOfAttack: 0,
            angleInToTheWind: 0,
            
            crossSectionalArea: 100,
            aerodynamicDrag: 0,
            aerodynamicLift: 0,
            aerodynamicDragAcceleration: 0,
            
            thermalPower: 0,
            dynamicPressure: 0,
            
            perceivedG: 0,
            perceivedG_X: 0,
            perceivedG_Y: 0,
            
            frontFinDrag: 0,
            aftFinDrag: 0,
            frontFinDragAngularAcceleration: 0,
            aftFinDragAngularAcceleration: 0
        };
        
        this.state.flight.distanceToPlanetCenter = this.state.world.planetRadius + this.state.flight.altitude;
        this.state.flight.orbitalVelocityAtCurrentAltitude = Math.sqrt(
            this.state.world.gravitationalConstant * this.state.world.planetMass / this.state.flight.distanceToPlanetCenter
        );
        this.state.flight.orbitGravityAccCompensation = this.state.world.gravity * 
            Math.abs(this.state.flight.speedX) / this.state.flight.orbitalVelocityAtCurrentAltitude;
    }

    initAutopilot() {
        this.state.autopilot = {
            manualControlOn: false,
            holdingPitch: 0,
            controlInputTimeConstant: 1 / this.state.world.frameRate * this.state.world.renderTimeInterval,
            
            pitchHoldOn: false,
            
            autoBoostBackOn: false,
            initAutoLandXposDiffThreshold: 500,
            propulsiveCorrectionMinHeight: 5000,
            propulsiveCorrectionAccuracyRequired: 250,
            decelerationStageHorizontalAcc: this.state.world.gravity * 1.6,
            decelerationStageEstDuration: 0,
            finalXposPrediction: Infinity,
            freeFallTimeRemainingPrediction: Infinity,
            boostbackDirection: 0,
            boostBackInitCompleted: false,
            boostBackAeroDeceleration: true,
            boostBackDecelerationStageInitCompleted: false,
            accelerationStageCompleted: false,
            
            autoLandOn: false,
            initVehicleConfigCompleted: false,
            landingSiteXpos: this.state.world.starBaseXpos,
            autoLandFinalStageEngineCount: 1,
            dualRaptorMode: false,
            trialRaptorMode: false,
            flipStageEngineCount: 1,
            
            aeroDecentCompleted: false,
            aeroDecentMaxCorrectionAngle: 0.0524,
            fineTunePercentage: 1,
            fineTuneMultiplier: 2,
            fineTuneMaxSpeed: 5,
            
            bellyFlopTriggerAltitude: 0,
            flipStageInitted: false,
            flipCompleted: false,
            flipGoalAngle: 0.1745,
            flipInducedXposChange: 100,
            
            horizontalAdjustmentStageCompleted: false,
            horizontalAdjustmentStageInitted: false,
            adjustmentMaxAngle: 0.3491,
            horizontalAdjustmentDurationEstimateSingleEngine: 5.5,
            horizontalAdjustmentDurationEstimate: 5.5,
            horizontalAdjustmentHorizontalSpeedLimit: 5,
            horizontalAdjustmentVerticalSpeedLimit: -30,
            
            finalDecentStageInitted: false,
            finalDecentStageCompleted: false,
            noSteeringHeight: 5,
            
            autoMaxThrustOn: false,
            
            autoTakeOffOn: false,
            autoTakeOffInited: false,
            aomAt_25km: 0.9599,
            aomAt_80km: 1.4835,
            
            horizontalAccelerationByAeroBreakingCorrectionAngle: 0,
            aeroBreakingMaxCorrectionAngle: Math.PI * 0.5,
            aeroBreakingFineTuneThreshold: 0.5,
            aeroBreakingAdjDegreePerSec: 0.5236
        };
    }

    initRecorder() {
        this.state.recorder = {
            recordTimeInterval: 5,
            timeNodes: [],
            
            listOfPitchAngle: [],
            listOfAngleOfMotion: [],
            listOfAngleOfAttack: [],
            listOfAngleInToTheWind: [],
            
            listOfSpeedX: [],
            listOfSpeedY: [],
            listOfSpeed: [],
            
            listOfAerodynamicDrag: [],
            listOfAerodynamicLift: [],
            
            listOfAltitude: [],
            listOfDownRangeDistance: [],
            
            listOfThermalPower: [],
            listOfDynamicPressure: [],
            
            listOfAcceleration: [],
            listOfAccelerationX: [],
            listOfAccelerationY: [],
            
            listOfPitchControl: [],
            listOfThrottle: [],
            
            listOfPropellentRemaining: []
        };
    }

    get(path) {
        const keys = path.split('.');
        let current = this.state;
        
        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.state;
        
        for (const key of keys) {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        this.notifyListeners(path, value, oldValue);
        
        return value;
    }

    addEventListener(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }
        this.listeners.get(path).push(callback);
    }

    removeEventListener(path, callback) {
        if (this.listeners.has(path)) {
            const callbacks = this.listeners.get(path);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifyListeners(path, newValue, oldValue) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach(callback => {
                callback(newValue, oldValue, path);
            });
        }
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    setState(newState) {
        this.state = { ...newState };
        this.notifyListeners('*', this.state, null);
    }

    reset() {
        this.state = {
            world: {},
            vehicle: {},
            flight: {},
            autopilot: {},
            rendering: {},
            ui: {},
            recorder: {}
        };
        this.initializeState();
    }
}

window.StateManager = StateManager;

const state = StateManager.getInstance();
window.state = state;