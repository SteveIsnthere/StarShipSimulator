function updateBackEnd() {
    environmentUpDate()

    vehicleStatusUpDate()
    FlightParamsUpDate()
    controlsUpdate()

    saveDataPoint()
}

function vehicleStatusUpDate() {
    failureDetection()
    propellantUpdate()
    raptorsStatusUpdate()

    function failureDetection() {
        checkIfBreakUp()
        checkIfCrash()
        checkIfOutOfFuel()
    }

    function propellantUpdate() {
        normalUsage()
        dumpFuel()

        function normalUsage() {
            if (propellantMass > 0) {
                let flowRate = getWorkingEngineCount() * throttleCurrent * 0.01 * maxFuelFlowPerRaptor
                propellantMass -= flowRate / renderTimeInterval
            } else {
                propellantMass = 0
            }
        }

        function dumpFuel() {
            if (dumpingFuel) {
                if ((propellantMass > dumpLimit || forceDump)&&propellantMass>0) {
                    propellantMass -= dumpRate / renderTimeInterval
                } else {
                    dumpingFuel = toggle(dumpingFuel)
                }
            }
        }

        vehicleMass = vehicleDryMass + propellantMass
    }

    function raptorsStatusUpdate() {
        if (fuelRunOut) {
            raptorN1Running = false
            raptorN2Running = false
            raptorN3Running = false
        }
    }

}

function FlightParamsUpDate() {
    updateBasicParams()
    updateSpactialMotion()
    updateRotationalMotion()

    usedTime++

    function updateBasicParams() {
        upDateVehicleInFlightMaxArea()
        updateCrossSectionalArea()
        updateAngleOfMotion()
        updateAngleOfAttack()
        updateGimbolPointingDirection()
        updateThermal_DynamicPressure()
        updatePitchRateOfChange()
        updateCurrentTWR()

        aerodynamicDrag = getDrag(crossSectionalArea, getBodyDragCoefficient())
        aerodynamicLift = getLift(vehicleInFlightMaxArea)
        thrust = getThrust()
    }



    function updateSpactialMotion() {
        altitude += speedY / renderTimeInterval

        downRangeDistanceNextFrame = downRangeDistance + speedX / renderTimeInterval
        if (downRangeDistanceNextFrame > planetCirconference) {
            downRangeDistance = downRangeDistanceNextFrame - planetCirconference
        } else if (downRangeDistanceNextFrame < 0) {
            downRangeDistance = downRangeDistanceNextFrame + planetCirconference
        } else {
            downRangeDistance = downRangeDistanceNextFrame
        }

        speedX += accelerationX / renderTimeInterval
        speedY += (accelerationY + orbitGravityAccCompensation) / renderTimeInterval

        trueSpeed = Math.sqrt(speedX ** 2 + speedY ** 2)
        machSpeed = trueSpeed / speedOfSound

        updateSpactialAccelerations()
        updateOrbitGravityAccCompensation()

        function updateSpactialAccelerations() {

            aerodynamicDragAcceleration = getAcceleration(aerodynamicDrag, vehicleMass)
            aerodynamicLiftAcceleration = getAcceleration(aerodynamicLift, vehicleMass)
            thrustAcceleration = getAcceleration(thrust, vehicleMass)

            accelerationX = getHorizontalAcceleration()
            accelerationY = getVerticalAcceleration()

            totalAcceleration = Math.sqrt(accelerationX ** 2 + accelerationY ** 2)
        }

    }
    function updateRotationalMotion() {
        vehicleMomentOfInertiaUpdate()

        if (pitch > Math.PI) {
            pitch = pitch - 2 * Math.PI
        } else if (pitch < -Math.PI) {
            pitch = pitch + 2 * Math.PI
        }

        pitch += angularVelocity / renderTimeInterval

        angularVelocity += angularAcceleration / renderTimeInterval

        updateRotationalAcceleration()

        function updateRotationalAcceleration() {
            thrustVectorForce = getThrustVectorForce()
            frontFinDrag = getFrontFinDrag()
            aftFinDrag = getAftFinDrag()

            thrustVectorAcceleration = getAngularAcceleration(thrustVectorForce, engineDistanceFromCenterOfMass, vehicleMomentOfInertia)
            angularDragAcceleration = getAngularDragAcceleration()
            frontFinDragAngularAcceleration = getAngularAcceleration(frontFinDrag, frontFinDistanceFromCenterOfMass, vehicleMomentOfInertia)
            aftFinDragAngularAcceleration = getAngularAcceleration(aftFinDrag, aftFinDistanceFromCenterOfMass, vehicleMomentOfInertia)
            rcsThrustAngularAcceleration = getAngularAcceleration(rcsThrust, rcsThrustDistanceFromCenterOfMass, vehicleMomentOfInertia)
            offAxisThrustDifferenceAcceleration = getAngularAcceleration(getOffAxisThrustDifference(), engineDistanceFromCenterOfMass, vehicleMomentOfInertia)

            angularAcceleration = thrustVectorAcceleration + angularDragAcceleration + frontFinDragAngularAcceleration + aftFinDragAngularAcceleration + rcsThrustAngularAcceleration + offAxisThrustDifferenceAcceleration
        }
        function vehicleMomentOfInertiaUpdate() {
            vehicleMomentOfInertia = vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + vehicleMass * vehicleHeight ** 2 / 12
        }
    }

    function updateThermal_DynamicPressure() {
        thermalPower = getReentryHeatPower(crossSectionalArea)
        dynamicPressure = getDynamicPressure()
    }
}

function controlsUpdate() {
    highLevelInput()

    controlTranslation()

    throttleUpdate()

    function highLevelInput() {
        autoPilotControlInput()
        readInputFromManualFlightControl()
    }

    function autoPilotControlInput() {
        autoMaxThrust()
        pitchHold()
        autoLand()
        autoBoostBack()
    }

    function readInputFromManualFlightControl() {
        manualcontrolsLUpdate()
        manualAttitudeControlUpdate()

        function manualcontrolsLUpdate() {
            throttle = +document.getElementById("throttleControl").value;
        }

        function manualAttitudeControlUpdate() {
            pitchControl = +document.getElementById("pitchControl").value;
        }
    }
}

function environmentUpDate() {
    updateAtmosphere()
}

function saveDataPoint() {

    if (usedTime % recordTimeInterval == 0 && !crashed && !inFightBreakUp && !onTheGround) {
        //timeNodes
        timeNodes.push(usedTime)

        //motionAnglePlot
        listOfPitchAngle.push(pitch)
        listOfAngleOfMotion.push(angleOfMotion)
        listOfAngleOfAttack.push(angleOfAttack)
        listOfAngleInToTheWind.push(angleInToTheWind)

        //motionSpeedPlot
        listOfSpeedX.push(speedX)
        listOfSpeedY.push(speedY)
        listOfSpeed.push(trueSpeed)

        //aerodynamicForcePlot
        listOfaerodynamicDrag.push(aerodynamicDrag)
        listOfaerodynamicLift.push(aerodynamicLift)

        //altitudePlot
        listOfAltitude.push(altitude)
        listOfDownRangeDistance.push(downRangeDistance)

        //thermalPower&dynamicPressurePlot
        listOfThermalPower.push(thermalPower)
        listOfDynamicPressure.push(dynamicPressure)

        //accelerationPlot
        listOfAcceleration.push(totalAcceleration)
        listOfAccelerationX.push(accelerationX)
        listOfAccelerationY.push(accelerationY)

        //controlOutPutPlot
        listOfPitchControl.push(pitchControl)
        listOfThrottle.push(throttle)

        //propellentPlot
        listOfpropellentRemaining.push(propellantMass)
    }

}

