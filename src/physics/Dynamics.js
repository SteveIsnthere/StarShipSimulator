moduleLoader.define('dynamics', ['state', 'vehicle', 'aerodynamics'], (state, vehicle, aerodynamics) => {
    
    class Dynamics {
        constructor() {
            this.state = state;
            this.vehicle = vehicle;
            this.aerodynamics = aerodynamics;
        }

        updatePosition(deltaTime) {
            const speedX = this.state.get('flight.speedX');
            const speedY = this.state.get('flight.speedY');
            const altitude = this.state.get('flight.altitude');
            const downRangeDistance = this.state.get('flight.downRangeDistance');

            const newAltitude = altitude + speedY * deltaTime;
            const newDownRangeDistance = downRangeDistance + speedX * deltaTime;

            this.state.set('flight.altitude', Math.max(0, newAltitude));
            this.state.set('flight.downRangeDistance', newDownRangeDistance);

            const planetRadius = this.state.get('world.planetRadius');
            const distanceToPlanetCenter = planetRadius + newAltitude;
            this.state.set('flight.distanceToPlanetCenter', distanceToPlanetCenter);

            const gravitationalConstant = this.state.get('world.gravitationalConstant');
            const planetMass = this.state.get('world.planetMass');
            const orbitalVelocity = Math.sqrt(gravitationalConstant * planetMass / distanceToPlanetCenter);
            this.state.set('flight.orbitalVelocityAtCurrentAltitude', orbitalVelocity);

            return { altitude: newAltitude, downRangeDistance: newDownRangeDistance };
        }

        updateVelocity(deltaTime) {
            const accelerationX = this.state.get('flight.accelerationX');
            const accelerationY = this.state.get('flight.accelerationY');
            const speedX = this.state.get('flight.speedX');
            const speedY = this.state.get('flight.speedY');

            const newSpeedX = speedX + accelerationX * deltaTime;
            const newSpeedY = speedY + accelerationY * deltaTime;

            this.state.set('flight.speedX', newSpeedX);
            this.state.set('flight.speedY', newSpeedY);

            const trueSpeed = Math.sqrt(newSpeedX ** 2 + newSpeedY ** 2);
            this.state.set('flight.trueSpeed', trueSpeed);

            return { speedX: newSpeedX, speedY: newSpeedY, trueSpeed };
        }

        calculateGravity() {
            const altitude = this.state.get('flight.altitude');
            const planetRadius = this.state.get('world.planetRadius');
            const gravity = this.state.get('world.gravity');

            const distanceFromCenter = planetRadius + altitude;
            const gravitationalAcceleration = gravity * (planetRadius / distanceFromCenter) ** 2;

            return gravitationalAcceleration;
        }

        calculateAcceleration() {
            const vehicleMass = this.state.get('vehicle.mass');
            const thrust = this.state.get('flight.thrust');
            const pitch = this.state.get('flight.pitch');
            const gimbalPosition = this.state.get('vehicle.gimbalPosition');
            
            const thrustAngle = pitch + (gimbalPosition * Math.PI / 180);
            
            const thrustAccelerationX = (thrust * Math.sin(thrustAngle)) / vehicleMass;
            const thrustAccelerationY = (thrust * Math.cos(thrustAngle)) / vehicleMass;

            const aerodynamicDrag = this.state.get('flight.aerodynamicDrag');
            const aerodynamicLift = this.state.get('flight.aerodynamicLift');
            const angleOfMotion = this.state.get('flight.angleOfMotion');
            
            const dragAccelerationX = -(aerodynamicDrag * Math.cos(angleOfMotion)) / vehicleMass;
            const dragAccelerationY = -(aerodynamicDrag * Math.sin(angleOfMotion)) / vehicleMass;
            
            const liftAccelerationX = (aerodynamicLift * Math.sin(angleOfMotion)) / vehicleMass;
            const liftAccelerationY = (aerodynamicLift * Math.cos(angleOfMotion)) / vehicleMass;

            const gravity = this.calculateGravity();
            
            const totalAccelerationX = thrustAccelerationX + dragAccelerationX + liftAccelerationX;
            const totalAccelerationY = thrustAccelerationY + dragAccelerationY + liftAccelerationY - gravity;

            this.state.set('flight.accelerationX', totalAccelerationX);
            this.state.set('flight.accelerationY', totalAccelerationY);
            
            const totalAcceleration = Math.sqrt(totalAccelerationX ** 2 + totalAccelerationY ** 2);
            this.state.set('flight.totalAcceleration', totalAcceleration);

            const perceivedG = totalAcceleration / this.state.get('world.gravity');
            this.state.set('flight.perceivedG', perceivedG);
            this.state.set('flight.perceivedG_X', totalAccelerationX / this.state.get('world.gravity'));
            this.state.set('flight.perceivedG_Y', totalAccelerationY / this.state.get('world.gravity'));

            return {
                accelerationX: totalAccelerationX,
                accelerationY: totalAccelerationY,
                totalAcceleration,
                perceivedG
            };
        }

        updateAngularMotion(deltaTime) {
            const angularVelocity = this.state.get('flight.angularVelocity');
            const angularAcceleration = this.state.get('flight.angularAcceleration');
            const pitch = this.state.get('flight.pitch');

            const newAngularVelocity = angularVelocity + angularAcceleration * deltaTime;
            const newPitch = pitch + newAngularVelocity * deltaTime;

            this.state.set('flight.angularVelocity', newAngularVelocity);
            this.state.set('flight.pitch', newPitch);

            const pitchRateOfChange = newAngularVelocity;
            this.state.set('flight.pitchRateOfChange', pitchRateOfChange);

            return { angularVelocity: newAngularVelocity, pitch: newPitch };
        }

        calculateAngularAcceleration() {
            const vehicleMomentOfInertia = this.state.get('vehicle.momentOfInertia');
            const thrust = this.state.get('flight.thrust');
            const gimbalPosition = this.state.get('vehicle.gimbalPosition');
            const engineDistanceFromCenterOfMass = this.state.get('vehicle.engineDistanceFromCenterOfMass');
            
            const gimbalAngle = gimbalPosition * Math.PI / 180;
            const thrustTorque = thrust * Math.sin(gimbalAngle) * engineDistanceFromCenterOfMass;
            
            const frontFinDragAngularAcceleration = this.state.get('flight.frontFinDragAngularAcceleration');
            const aftFinDragAngularAcceleration = this.state.get('flight.aftFinDragAngularAcceleration');
            
            const angularVelocity = this.state.get('flight.angularVelocity');
            const angularDrag = -angularVelocity * Math.abs(angularVelocity) * 0.1;
            
            const totalAngularAcceleration = (thrustTorque / vehicleMomentOfInertia) + 
                                           frontFinDragAngularAcceleration + 
                                           aftFinDragAngularAcceleration + 
                                           angularDrag;

            this.state.set('flight.angularAcceleration', totalAngularAcceleration);
            this.state.set('flight.angularDragAcceleration', angularDrag);

            return totalAngularAcceleration;
        }

        updateFlightAngles() {
            const speedX = this.state.get('flight.speedX');
            const speedY = this.state.get('flight.speedY');
            const pitch = this.state.get('flight.pitch');

            const angleOfMotion = Math.atan2(speedX, speedY);
            this.state.set('flight.angleOfMotion', angleOfMotion);

            const angleOfAttack = pitch - angleOfMotion;
            this.state.set('flight.angleOfAttack', angleOfAttack);

            const wind = this.state.get('world.wind');
            const angleInToTheWind = Math.atan2(speedX - wind, speedY);
            this.state.set('flight.angleInToTheWind', angleInToTheWind);

            return { angleOfMotion, angleOfAttack, angleInToTheWind };
        }

        checkGroundCollision() {
            const altitude = this.state.get('flight.altitude');
            const speedY = this.state.get('flight.speedY');
            const pitch = this.state.get('flight.pitch');
            
            if (altitude <= 0) {
                const touchDownSpeedLimit = this.state.get('vehicle.touchDownSpeedLimit');
                const touchDownPitchLimit = this.state.get('vehicle.touchDownPitchLimit');
                
                if (Math.abs(speedY) > touchDownSpeedLimit || Math.abs(pitch) > touchDownPitchLimit) {
                    return 'crashed';
                } else {
                    this.state.set('flight.speedX', 0);
                    this.state.set('flight.speedY', 0);
                    this.state.set('flight.angularVelocity', 0);
                    return 'landed';
                }
            }
            
            return 'flying';
        }

        update(deltaTime) {
            this.updateFlightAngles();
            this.aerodynamics.updateAerodynamicForces();
            this.calculateAcceleration();
            this.calculateAngularAcceleration();
            
            this.updateVelocity(deltaTime);
            this.updatePosition(deltaTime);
            this.updateAngularMotion(deltaTime);
            
            const collisionStatus = this.checkGroundCollision();
            
            return {
                position: {
                    altitude: this.state.get('flight.altitude'),
                    downRangeDistance: this.state.get('flight.downRangeDistance')
                },
                velocity: {
                    speedX: this.state.get('flight.speedX'),
                    speedY: this.state.get('flight.speedY'),
                    trueSpeed: this.state.get('flight.trueSpeed')
                },
                attitude: {
                    pitch: this.state.get('flight.pitch'),
                    angularVelocity: this.state.get('flight.angularVelocity')
                },
                status: collisionStatus
            };
        }

        initialize() {
            this.updateFlightAngles();
            this.calculateAcceleration();
            this.calculateAngularAcceleration();
        }
    }

    return new Dynamics();
});