moduleLoader.define('aerodynamics', ['state'], (state) => {
    
    class Aerodynamics {
        constructor() {
            this.state = state;
        }

        getCrossSectionalArea() {
            const angleInToTheWind = this.state.get('flight.angleInToTheWind');
            const vehicleMaxArea = this.state.get('vehicle.inFlightMaxArea');
            const vehicleMinArea = this.state.get('vehicle.minArea');

            const crossSectionalArea = Math.abs(Math.sin(angleInToTheWind) * vehicleMaxArea) + 
                                     Math.abs(Math.cos(angleInToTheWind) * vehicleMinArea) / 2.1;

            this.state.set('flight.crossSectionalArea', crossSectionalArea);
            return crossSectionalArea;
        }

        getDrag(crossSectionalArea, dragCoefficient = 1.0) {
            const airDensity = this.state.get('world.airDensity');
            const trueSpeed = this.state.get('flight.trueSpeed');

            const drag = 0.5 * airDensity * trueSpeed ** 2 * dragCoefficient * crossSectionalArea;
            return drag;
        }

        getLift(crossSectionalArea, liftCoefficient = 0.1) {
            const airDensity = this.state.get('world.airDensity');
            const trueSpeed = this.state.get('flight.trueSpeed');
            const angleOfAttack = this.state.get('flight.angleOfAttack');

            const lift = 0.5 * airDensity * trueSpeed ** 2 * liftCoefficient * 
                        crossSectionalArea * Math.sin(angleOfAttack);
            return lift;
        }

        calculateFinDrag() {
            const frontFinExtention = this.state.get('vehicle.frontFinExtention');
            const aftFinExtention = this.state.get('vehicle.aftFinExtention');
            const finActuationMaxAngle = this.state.get('vehicle.finActuationMaxAngle');
            const frontFinSurfaceArea = this.state.get('vehicle.frontFinSurfaceArea');
            const aftFinSurfaceArea = this.state.get('vehicle.aftFinSurfaceArea');
            const finDragCoefficient = this.state.get('vehicle.finDragCoefficient');

            const frontFinEffectiveArea = frontFinSurfaceArea * 
                Math.sin(finActuationMaxAngle * frontFinExtention * 0.01);
            const aftFinEffectiveArea = aftFinSurfaceArea * 
                Math.sin(finActuationMaxAngle * aftFinExtention * 0.01);

            const frontFinDrag = this.getDrag(frontFinEffectiveArea, finDragCoefficient);
            const aftFinDrag = this.getDrag(aftFinEffectiveArea, finDragCoefficient);

            this.state.set('flight.frontFinDrag', frontFinDrag);
            this.state.set('flight.aftFinDrag', aftFinDrag);

            return { frontFinDrag, aftFinDrag };
        }

        calculateFinDragAngularAcceleration() {
            const frontFinDrag = this.state.get('flight.frontFinDrag');
            const aftFinDrag = this.state.get('flight.aftFinDrag');
            const frontFinDistanceFromCenterOfMass = this.state.get('vehicle.frontFinDistanceFromCenterOfMass');
            const aftFinDistanceFromCenterOfMass = this.state.get('vehicle.aftFinDistanceFromCenterOfMass');
            const vehicleMomentOfInertia = this.state.get('vehicle.momentOfInertia');
            const angleInToTheWind = this.state.get('flight.angleInToTheWind');

            const frontFinDragAngularAcceleration = frontFinDrag * frontFinDistanceFromCenterOfMass * 
                Math.sin(angleInToTheWind) / vehicleMomentOfInertia;
            const aftFinDragAngularAcceleration = -aftFinDrag * aftFinDistanceFromCenterOfMass * 
                Math.sin(angleInToTheWind) / vehicleMomentOfInertia;

            this.state.set('flight.frontFinDragAngularAcceleration', frontFinDragAngularAcceleration);
            this.state.set('flight.aftFinDragAngularAcceleration', aftFinDragAngularAcceleration);

            return {
                frontFinDragAngularAcceleration,
                aftFinDragAngularAcceleration
            };
        }

        updateAerodynamicForces() {
            const crossSectionalArea = this.getCrossSectionalArea();
            
            const aerodynamicDrag = this.getDrag(crossSectionalArea, 1.0);
            const aerodynamicLift = this.getLift(crossSectionalArea, 0.1);

            this.state.set('flight.aerodynamicDrag', aerodynamicDrag);
            this.state.set('flight.aerodynamicLift', aerodynamicLift);

            const vehicleMass = this.state.get('vehicle.mass');
            const aerodynamicDragAcceleration = aerodynamicDrag / vehicleMass;
            this.state.set('flight.aerodynamicDragAcceleration', aerodynamicDragAcceleration);

            this.calculateFinDrag();
            this.calculateFinDragAngularAcceleration();

            return {
                aerodynamicDrag,
                aerodynamicLift,
                aerodynamicDragAcceleration
            };
        }

        getMachNumber() {
            const trueSpeed = this.state.get('flight.trueSpeed');
            const speedOfSound = this.state.get('world.speedOfSound');
            
            const machSpeed = trueSpeed / speedOfSound;
            this.state.set('flight.machSpeed', machSpeed);
            
            return machSpeed;
        }

        initialize() {
            this.updateAerodynamicForces();
            this.getMachNumber();
        }
    }

    return new Aerodynamics();
});