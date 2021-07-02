function presisionAlignment(goal, timeNeededToAlign) {

    let pitchDifference = getPitchDifference(goal)

    let accelerationNeeded = -pitchDifference / timeNeededToAlign ** 2 - 2 * angularVelocity / timeNeededToAlign - offAxisThrustDifferenceAcceleration

    let torqueRequired = accelerationNeeded * vehicleMomentOfInertia

    let vectorForceRequired

    let yokePosition

    if (thrust > 0 && !finActive) {
        controlByThrustVector()
    } else if (thrust > 0 && finActive) {
        controlByThrustVectorAndFins()
    } else if (finActive) {
        controlByFins()
    } else {
        controlByRcs()
    }


    function getPitchDifference(goal) {
        let pitchDifference = pitch - goal

        if (pitchDifference < -Math.PI) {
            pitchDifference = Math.PI * 2 + pitchDifference
        } else if (pitchDifference > Math.PI) {
            pitchDifference = -(Math.PI * 2 - pitchDifference)
        }

        return pitchDifference
    }

    function controlByThrustVector() {
        vectorForceRequired = torqueRequired / engineDistanceFromCenterOfMass

        if (vectorForceRequired / thrust >= 1) {
            yokePosition = 100
        } else if (vectorForceRequired / thrust <= -1) {
            yokePosition = -100
        } else {
            yokePosition = Math.asin(vectorForceRequired / thrust) * 100 / gimbolAngleLimit

            if (yokePosition >= 100) {
                yokePosition = 100
            } else if (yokePosition <= -100) {
                yokePosition = -100
            }
        }
        if (rcsActive) {
            yokePosition = yokePosition * 0.98
        }

        pitchControl = yokePosition
        document.getElementById("pitchControl").value = pitchControl
    }

    function controlByThrustVectorAndFins() {
        vectorForceRequired = torqueRequired / engineDistanceFromCenterOfMass

        if (vectorForceRequired / thrust >= 1) {
            yokePosition = 100
        } else if (vectorForceRequired / thrust <= -1) {
            yokePosition = -100
        } else {
            yokePosition = Math.asin(vectorForceRequired / thrust) * 100 / gimbolAngleLimit

            if (yokePosition >= 100) {
                yokePosition = 100
            } else if (yokePosition <= -100) {
                yokePosition = -100
            }
        }
        if (rcsActive) {
            yokePosition = yokePosition * 0.98
        }

        pitchControl = yokePosition
        document.getElementById("pitchControl").value = pitchControl
    }

    function controlByFins() {

        if (torqueRequired > 0) {
            let maxFinNoseDownTorque = getDrag(frontFinSurfaceAera, finDragCoefficient) * Math.sin(finAcuationMaxAngle) * frontFinDistanceFromCenterOfMass + getDrag(aftFinSurfaceAera, finDragCoefficient) * aftFinDistanceFromCenterOfMass
            yokePosition = torqueRequired / maxFinNoseDownTorque * 100
            if (yokePosition >= 100) {
                yokePosition = 100
            }

        } else if (torqueRequired < 0) {
            let maxFinNoseUpTorque = getDrag(aftFinSurfaceAera, finDragCoefficient) * Math.sin(finAcuationMaxAngle) * aftFinDistanceFromCenterOfMass + getDrag(frontFinSurfaceAera, finDragCoefficient) * frontFinDistanceFromCenterOfMass
            yokePosition = torqueRequired / maxFinNoseUpTorque * 100
            if (yokePosition <= -100) {
                yokePosition = -100
            }
        } else {
            yokePosition = 0
        }

        if (rcsActive) {
            yokePosition *= 0.99
            controlByRcs()
        }

        pitchControl = yokePosition
        document.getElementById("pitchControl").value = pitchControl
    }

    function controlByRcs() {
        if (Math.abs(pitchDifference) > 0.1) {
            controller()
        }

        function controller() {
            if (torqueRequired > 0) {

                yokePosition = 100

            } else if (torqueRequired < 0) {

                yokePosition = -100

            } else {
                yokePosition = 0
            }

            pitchControl = yokePosition
            document.getElementById("pitchControl").value = pitchControl
        }

    }


}


function controlEnginebyTWR(goalTWR) {
    let throttleGoalPercentage = goalTWR * vehicleMass * gravity / getThrust() * 100

    if (throttleGoalPercentage > throttleUpperLimmit) {
        throttleGoalPercentage = throttleUpperLimmit
    } else if (throttleGoalPercentage < throttleLowwerLimmit) {
        throttleGoalPercentage = throttleLowwerLimmit
    }

    throttle = throttleGoalPercentage
    document.getElementById("throttleControl").value = throttle
}

function controlEnginebyEffectiveVerticalTWR(goalTWR) {
    let throttleGoalPercentage = goalTWR * vehicleMass * gravity / getEffectiveVerticalMaxThrust() * 100

    if (throttleGoalPercentage > throttleUpperLimmit) {
        throttleGoalPercentage = throttleUpperLimmit
    } else if (throttleGoalPercentage < throttleLowwerLimmit) {
        throttleGoalPercentage = throttleLowwerLimmit
    }

    throttle = throttleGoalPercentage
    document.getElementById("throttleControl").value = throttle
}

function horizontalSteering(targetSpeed, maxAngle, speedDifferenceThreshold, timeNeededToAlign) {
    let speedDifference = speedX - targetSpeed


    if (speedDifference < 0) {
        presisionAlignment(maxAngle, timeNeededToAlign)
        if (-speedDifference < speedDifferenceThreshold) {
            presisionAlignment(maxAngle * -speedDifference / speedDifferenceThreshold, timeNeededToAlign)
        }
    } else {
        presisionAlignment(-maxAngle, timeNeededToAlign)
        if (speedDifference < speedDifferenceThreshold) {
            presisionAlignment(-maxAngle * speedDifference / speedDifferenceThreshold, timeNeededToAlign)
        }
    }

}

function verticalSpeedAdjustment(targetSpeed, speedDifferenceThreshold, twrLimit) {
    let speedDifference = speedY - targetSpeed


    if (speedDifference < 0) {
        controlEnginebyEffectiveVerticalTWR(twrLimit)
        if (-speedDifference < speedDifferenceThreshold) {
            controlEnginebyEffectiveVerticalTWR(1 - speedDifference / speedDifferenceThreshold)
        }
    } else {
        controlEnginebyEffectiveVerticalTWR(0)
        if (speedDifference < speedDifferenceThreshold) {
            controlEnginebyEffectiveVerticalTWR(1 - speedDifference / speedDifferenceThreshold)
        }
    }

}

function horizontalSpeedAdjustment(targetSpeed, speedDifferenceThreshold, twrLimit) {
    let speedDifference = targetSpeed - Math.abs(speedX)


    if (speedDifference < 0) {
        controlEnginebyTWR(0)
        if (speedDifference < speedDifferenceThreshold) {
            controlEnginebyTWR(1 - speedDifference / speedDifferenceThreshold)
        }
    } else {
        controlEnginebyTWR(twrLimit)
        if (speedDifference < speedDifferenceThreshold) {
            controlEnginebyTWR(1 + speedDifference / speedDifferenceThreshold)
        }
    }

}



function raptorAutoShutDown_KeepMinTWRBelow1() {
    if (getTWR(getTotalMinThrust()) > 1) {
        if (getWorkingEngineCount() == 3) {
            toggleRaptor1()
        } else if (getWorkingEngineCount() == 2) {
            if (raptorN1Running && raptorN2Running) {
                toggleRaptor1()
            } else if (raptorN2Running && raptorN3Running) {
                toggleRaptor2()
            } else {
                toggleRaptor3()
            }
        } else {
            if (raptorN1Running) {
                toggleRaptor1()
            } else if (raptorN2Running) {
                toggleRaptor2()
            } else {
                toggleRaptor3()
            }
        }
    }
}