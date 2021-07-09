function getReentryHeatPower(vehicleNoseRadius) {
    let reentryHeatPower = 1.83 * 10 ** (-7) * trueSpeed ** 3 * Math.sqrt(airDensity / vehicleNoseRadius)
    return reentryHeatPower
}

function updateAtmosphere() {
    if (altitude < 11000) {
        tropo()
    } else {
        lowerStrato()
    }

    function upperStrato() {
        airTemperature = -131.21 + 0.0299 * altitude
        airPressure = 2.488 * ((airTemperature + 273.1) / 216.6) ** (-11.388)
        airDensity = getDensity()
    }
    function lowerStrato() {
        airTemperature = -56.46
        airPressure = 22.65 * Math.E ** (1.73 - 0.000157 * altitude)
        airDensity = getDensity()
    }
    function tropo() {
        airTemperature = 15.04 - 0.00649 * altitude
        airPressure = 101.29 * ((airTemperature + 273.1) / 288.08) ** 5.256
        airDensity = getDensity()
    }
    function getDensity() {
        let result = airPressure / (0.2869 * (airTemperature + 273.1))
        return result
    }
}

function getDynamicPressure() {
    dynamicPressure = airDensity * trueSpeed ** 2 * 0.0005
    return dynamicPressure
}

function getCrossSectionalArea() {
    let cSArea

    cSArea = Math.abs(Math.sin(angleInToTheWind) * vehicleInFlightMaxArea) + Math.abs(Math.cos(angleInToTheWind) * vehicleMinArea) / 2.1

    return cSArea
}

function getDrag(cross_sectionArea, dragCoefficient) {
    let drag = 1 / 2 * airDensity * trueSpeed ** 2 * dragCoefficient * cross_sectionArea

    return drag
}

function getLift(wingArea) {
    let liftCoefficient = getLiftCoefficient()
    let lift = liftCoefficient * airDensity * trueSpeed ** 2 * wingArea * 0.5

    return lift

    function getLiftCoefficient() {

        let liftCoefficient
        let angleITW = Math.abs(angleInToTheWind)

        if (angleITW >= 1.48) {
            liftCoefficient = -1.1 * angleITW + 1.728
        } else if (angleITW >= 0.52) {
            liftCoefficient = -1 / 9.6 * angleITW + 0.254
        } else if (angleITW >= 0.47) {
            liftCoefficient = -8 * angleITW + 4.36
        } else if (angleITW >= 0.35) {
            liftCoefficient = 5 / 6 * angleITW + 0.2083
        } else {
            liftCoefficient = 5 / 3.5 * angleITW
        }

        return liftCoefficient

    }
}

function getBodyDragCoefficient() {
    let bdc
    if (machSpeed >= 10) {
        bdc = 2.5
    } else {
        bdc = machSpeed * 0.1347 + 1.153
    }

    return bdc
}

function getAcceleration(force, mass) {
    let acc = force / mass
    return acc
}

function getAngularAcceleration(force, distanceToCenterOfMass, momentOfInertia) {
    let torque = force * distanceToCenterOfMass
    let acc = torque / momentOfInertia
    return acc
}

function getHorizontalAcceleration() {
    let dragComponent = getDragComponent()
    let liftComponent = getLiftComponent()
    let thrustComponent = getThrustComponent()

    let hAcc = dragComponent + thrustComponent + liftComponent


    return hAcc

    function getDragComponent() {
        let horizontalDragComponentCoefficient

        if (0 <= angleOfMotion && angleOfMotion <= Math.PI / 2) {
            horizontalDragComponentCoefficient = -Math.sin(angleOfMotion)
        } else if (Math.PI / 2 < angleOfMotion && angleOfMotion <= Math.PI) {
            horizontalDragComponentCoefficient = -Math.sin(Math.PI - angleOfMotion)
        } else if (-Math.PI / 2 <= angleOfMotion && angleOfMotion < 0) {
            horizontalDragComponentCoefficient = Math.sin(-angleOfMotion)
        } else {
            horizontalDragComponentCoefficient = Math.sin(angleOfMotion + Math.PI)
        }

        let horizontalDragComponent = horizontalDragComponentCoefficient * aerodynamicDragAcceleration

        return horizontalDragComponent
    }

    function getLiftComponent() {
        let horizontalLiftComponent
        let horizontalLiftComponentCoefficient

        if (0 <= angleOfMotion && angleOfMotion <= Math.PI / 2) {
            horizontalLiftComponentCoefficient = -Math.sin(Math.PI / 2 - angleOfMotion)
        } else if (Math.PI / 2 < angleOfMotion && angleOfMotion < Math.PI) {
            horizontalLiftComponentCoefficient = Math.cos(Math.PI - angleOfMotion)
        } else if (-Math.PI / 2 <= angleOfMotion && angleOfMotion < 0) {
            horizontalLiftComponentCoefficient = -Math.sin(Math.PI / 2 + angleOfMotion)
        } else {
            horizontalLiftComponentCoefficient = Math.sin(-angleOfMotion - Math.PI / 2)
        }

        if ((0 < angleOfAttack && angleOfAttack < Math.PI / 2) || (-Math.PI < angleOfAttack && angleOfAttack < -Math.PI / 2)) {
            horizontalLiftComponent = -horizontalLiftComponentCoefficient * aerodynamicLiftAcceleration
        } else {
            horizontalLiftComponent = horizontalLiftComponentCoefficient * aerodynamicLiftAcceleration
        }


        return horizontalLiftComponent
    }

    function getThrustComponent() {
        let horizontalThrustComponent
        let horizontalThrustComponentCoefficient


        if (0 <= gimbolPointingDirection && gimbolPointingDirection <= Math.PI / 2) {
            horizontalThrustComponentCoefficient = Math.sin(gimbolPointingDirection)
        } else if (Math.PI / 2 < gimbolPointingDirection && gimbolPointingDirection <= Math.PI) {
            horizontalThrustComponentCoefficient = Math.cos(gimbolPointingDirection - Math.PI / 2)
        } else if (-Math.PI / 2 <= gimbolPointingDirection && gimbolPointingDirection < 0) {
            horizontalThrustComponentCoefficient = Math.sin(gimbolPointingDirection)
        } else {
            horizontalThrustComponentCoefficient = -Math.cos(gimbolPointingDirection + Math.PI / 2)
        }

        horizontalThrustComponent = horizontalThrustComponentCoefficient * thrustAcceleration

        return horizontalThrustComponent
    }
}

function getVerticalAcceleration() {

    let dragComponent = getDragComponent()
    let liftComponent = getLiftComponent()
    let thrustComponent = getThrustComponent()

    let vAcc = -gravity + dragComponent + thrustComponent + liftComponent

    return vAcc

    function getDragComponent() {
        let verticalDragComponentCoefficient

        if (0 <= angleOfMotion && angleOfMotion <= Math.PI / 2) {
            verticalDragComponentCoefficient = -Math.cos(angleOfMotion)
        } else if (Math.PI / 2 < angleOfMotion && angleOfMotion <= Math.PI) {
            verticalDragComponentCoefficient = Math.cos(Math.PI - angleOfMotion)
        } else if (-Math.PI / 2 <= angleOfMotion && angleOfMotion < 0) {
            verticalDragComponentCoefficient = -Math.cos(angleOfMotion)
        } else {
            verticalDragComponentCoefficient = Math.cos(angleOfMotion + Math.PI)
        }

        let verticalDragComponent = verticalDragComponentCoefficient * aerodynamicDragAcceleration

        return verticalDragComponent
    }

    function getLiftComponent() {
        let verticalLiftComponent
        let verticalLiftComponentCoefficient

        if (0 <= angleOfMotion && angleOfMotion <= Math.PI / 2) {
            verticalLiftComponentCoefficient = Math.cos(Math.PI / 2 - angleOfMotion)
        } else if (Math.PI / 2 < angleOfMotion && angleOfMotion <= Math.PI) {
            verticalLiftComponentCoefficient = Math.sin(Math.PI - angleOfMotion)
        } else if (-Math.PI / 2 <= angleOfMotion && angleOfMotion < 0) {
            verticalLiftComponentCoefficient = -Math.cos(Math.PI / 2 + angleOfMotion)
        } else {
            verticalLiftComponentCoefficient = -Math.cos(-angleOfMotion - Math.PI / 2)
        }

        if ((0 < angleOfAttack && angleOfAttack < Math.PI / 2) || (-Math.PI < angleOfAttack && angleOfAttack < -Math.PI / 2)) {
            verticalLiftComponent = -verticalLiftComponentCoefficient * aerodynamicLiftAcceleration
        } else {
            verticalLiftComponent = verticalLiftComponentCoefficient * aerodynamicLiftAcceleration
        }


        return verticalLiftComponent
    }

    function getThrustComponent() {
        let verticalThrustComponent
        let verticalThrustComponentCoefficient

        if (0 <= gimbolPointingDirection && gimbolPointingDirection <= Math.PI / 2) {
            verticalThrustComponentCoefficient = Math.cos(gimbolPointingDirection)
        } else if (Math.PI / 2 < gimbolPointingDirection && gimbolPointingDirection <= Math.PI) {
            verticalThrustComponentCoefficient = -Math.sin(gimbolPointingDirection - Math.PI / 2)
        } else if (-Math.PI / 2 <= gimbolPointingDirection && gimbolPointingDirection < 0) {
            verticalThrustComponentCoefficient = Math.cos(gimbolPointingDirection)
        } else {
            verticalThrustComponentCoefficient = Math.sin(gimbolPointingDirection + Math.PI / 2)
        }

        verticalThrustComponent = verticalThrustComponentCoefficient * thrustAcceleration

        return verticalThrustComponent
    }
}

function updatePerceivedG() {
    perceivedG_Y = (accelerationY + orbitGravityAccCompensation + gravity) / gravity
    perceivedG_X = accelerationX / gravity
    perceivedG = Math.sqrt(perceivedG_Y ** 2 + perceivedG_X ** 2)
}

function getAngle(rad) {
    return rad / Math.PI * 180
}

function getRad(angle) {
    return angle / 180 * Math.PI
}

function getThrust() {
    let maxThrust = getTotalMaxThrust()

    return maxThrust * throttleCurrent * 0.01
}

function getTotalMaxThrust() {
    let totalThrust = 0

    totalThrust = getWorkingEngineCount() * maxThrustPerRaptor

    return totalThrust
}

function getTotalMinThrust() {
    let totalThrust = 0

    totalThrust = getWorkingEngineCount() * maxThrustPerRaptor * throttleLowwerLimmit * 0.01

    return totalThrust
}

function getThrustVectorForce() {
    return thrust * Math.sin(0.01 * gimbolPosition * gimbolAngleLimit)
}

function getWorkingEngineCount() {
    let workingEngineCount = 0

    if (raptorN1Running && raptorN2Running && raptorN3Running) {
        workingEngineCount = 3
    } else if ((raptorN1Running && raptorN2Running) || (raptorN3Running && raptorN2Running) || (raptorN1Running && raptorN3Running)) {
        workingEngineCount = 2
    } else if (raptorN1Running || raptorN2Running || raptorN3Running) {
        workingEngineCount = 1
    }

    return workingEngineCount
}

function updateAngleOfMotion() {
    angleOfMotion = Math.atan2(speedX, speedY)
}

function updateAngleOfAttack() {

    angleOfAttack = pitch - angleOfMotion

    if (angleOfAttack < -Math.PI) {
        angleOfAttack = Math.PI * 2 + angleOfAttack
    } else if (angleOfAttack > Math.PI) {
        angleOfAttack = -(Math.PI * 2 - angleOfAttack)
    }

    if (angleOfAttack > Math.PI / 2) {
        angleInToTheWind = Math.PI - angleOfAttack
    } else if (angleOfAttack < -Math.PI / 2) {
        angleInToTheWind = - Math.PI - angleOfAttack
    } else {
        angleInToTheWind = angleOfAttack
    }
}

function updateCrossSectionalArea() {
    crossSectionalArea = getCrossSectionalArea()
}

function getAngularDragAcceleration() {

    let angularDragAcc = airDensity * vehicleDiameter * angularVelocity ** 2 * intergalOfRCubedTimesDx / vehicleMomentOfInertia

    if (angularVelocity > 0) {
        return -angularDragAcc
    } else {
        return angularDragAcc
    }

}

function getFrontFinDrag() {
    if (angleOfAttack < 0) {
        return -getDrag(Math.abs(Math.sin(angleInToTheWind)) * frontFinSurfaceAera, finDragCoefficient) * frontFinEffectiveAreaFraction
    } else {
        return getDrag(Math.abs(Math.sin(angleInToTheWind)) * frontFinSurfaceAera, finDragCoefficient) * frontFinEffectiveAreaFraction
    }
}

function getAftFinDrag() {
    if (angleOfAttack < 0) {
        return getDrag(Math.abs(Math.sin(angleInToTheWind)) * aftFinSurfaceAera, finDragCoefficient) * aftFinEffectiveAreaFraction
    } else {
        return -getDrag(Math.abs(Math.sin(angleInToTheWind)) * aftFinSurfaceAera, finDragCoefficient) * aftFinEffectiveAreaFraction
    }
}

function updateOrbitGravityAccCompensation() {
    distanceToPlanetCenter = planetRadius + altitude
    orbitGravityAccCompensation = gravity * Math.abs(speedX) / orbitalVelocityAtCurrentAltitude

    if (orbitGravityAccCompensation >= gravity) {
        orbitGravityAccCompensation = gravity
    }
}

function checkIfCrash() {
    if (altitude <= vehicleHeight * Math.abs(Math.cos(pitch)) * 0.5) {
        if (speedY < -0.5) {
            if (Math.abs(speedX) < 2 && Math.abs(speedY) < touchDownSpeedLimit && Math.abs(pitch) < touchDownPitchLimit) {
                configLanded()
            } else {
                configCrashed()
            }
        } else if (thrustAcceleration <= gravity) {
            configOnTheGround()
        }
    } else {
        landed = false
        onTheGround = false
    }

    function configLanded() {
        if (firstTimeLanded) {
            speedX = 0
            speedY = 0
            angularVelocity = 0
            firstTimeLanded = false
        } else {
            landed = true
            speedX = 0
            speedY = 0
            angularVelocity = 0
        }


    }
    function configCrashed() {
        crashed = true
        speedX = 0
        speedY = 0
        angularVelocity = 0
        pitch = 0
        propellantMass = 0
        raptorN1Running = false
        raptorN2Running = false
        raptorN3Running = false
        rcsRunTimeRemaining = 0
    }
    function configOnTheGround() {
        onTheGround = true
        speedX = 0
        speedY = 0
        angularVelocity = 0
    }
}


function checkIfBreakUp() {
    if (totalAcceleration > gLimit * gravity || thermalPower > heatLimit || dynamicPressure > dynamicPressureLimit) {
        inFightBreakUp = true
        angularVelocity = 0

        propellantMass = 0
        raptorN1Running = false
        raptorN2Running = false
        raptorN3Running = false
        rcsRunTimeRemaining = 0
    }
}

function checkIfOutOfFuel() {
    if (propellantMass <= 0) {
        fuelRunOut = true
    }
}

function upDateVehicleInFlightMaxArea() {
    frontFinEffectiveAreaFraction = Math.sin(finAcuationMaxAngle * frontFinExtention * 0.01)
    aftFinEffectiveAreaFraction = Math.sin(finAcuationMaxAngle * aftFinExtention * 0.01)

    totalFinSurfaceAera = frontFinEffectiveAreaFraction * frontFinSurfaceAera + aftFinEffectiveAreaFraction * aftFinSurfaceAera

    vehicleInFlightMaxArea = vehicleMaxArea + totalFinSurfaceAera * 1.8 // fin has a higher drag coefficient
}

function getRaptorIgnitionTime() {
    let realtime = (Math.random() * 1.5 + 0.5) * raptorIgnitionTimeMean * renderTimeInterval / frameRate
    return realtime
}

function raptorIgnitionPossibleFaliure(raptorNumber) {
    if (Math.random() < raptorIgnitionFaliureRate) {
        if (raptorNumber == 1) {
            raptorN1Fail = true
        } else if (raptorNumber == 2) {
            raptorN2Fail = true
        } else {
            raptorN3Fail = true
        }
    }
}

function updatePitchRateOfChange() {
    pitchRecord.push(pitch)
    pitchRecord.shift()

    let lastPitch = pitchRecord[0]

    pitchRateOfChange = (pitch - lastPitch) / renderTimeInterval * 3600
}

function getEffectiveVerticalMaxThrust() {
    let maxThrust = getTotalMaxThrust()

    return maxThrust * getThrustComponentCoefficient()

    function getTotalMaxThrust() {
        let totalThrust = 0

        totalThrust = getWorkingEngineCount() * maxThrustPerRaptor

        return totalThrust
    }
    function getThrustComponentCoefficient() {
        let verticalThrustComponentCoefficient

        if (0 <= gimbolPointingDirection && gimbolPointingDirection <= Math.PI / 2) {
            verticalThrustComponentCoefficient = Math.cos(gimbolPointingDirection)
        } else if (Math.PI / 2 < gimbolPointingDirection && gimbolPointingDirection <= Math.PI) {
            verticalThrustComponentCoefficient = -Math.sin(gimbolPointingDirection - Math.PI / 2)
        } else if (-Math.PI / 2 <= gimbolPointingDirection && gimbolPointingDirection < 0) {
            verticalThrustComponentCoefficient = Math.cos(gimbolPointingDirection)
        } else {
            verticalThrustComponentCoefficient = Math.sin(gimbolPointingDirection + Math.PI / 2)
        }

        return verticalThrustComponentCoefficient
    }
}

function updateCurrentTWR() {
    twr = thrustAcceleration / gravity
}

function getTWR(force) {
    return force / (vehicleMass * gravity)
}

function getOffAxisThrustDifference() {
    return (raptorN1Running * raptorN1offAxisForceFraction + raptorN2Running * raptorN2offAxisForceFraction + raptorN3Running * raptorN3offAxisForceFraction) * throttleCurrent * 0.01 * maxThrustPerRaptor
}

function updateGimbolPointingDirection() {
    gimbolPointingDirection = pitch - (0.01 * gimbolPosition * gimbolAngleLimit)

    if (gimbolPointingDirection > Math.PI) {
        gimbolPointingDirection = gimbolPointingDirection - 2 * Math.PI
    } else if (gimbolPointingDirection < -Math.PI) {
        gimbolPointingDirection = gimbolPointingDirection + 2 * Math.PI
    }
}


function getFreeFallTimeRemainingPrediction(goalHeight) {
    return Math.sqrt(vehicleMass / (gravity * airResistance_k)) * Math.asinh(Math.E ** ((altitude - goalHeight) * airResistance_k / vehicleMass)) + speedY / gravity
}

function getMaxSpeedWithSafeDynamicPressure() {
    let maxDynamicPressure = 35
    return Math.sqrt(maxDynamicPressure / airDensity * 2000)
}

function getMaxHSpeedWithSafeDynamicPressure() {
    return Math.sqrt(getMaxSpeedWithSafeDynamicPressure() ** 2 - speedY ** 2)
}