function pitchHold() {
    if (pitchHoldOn && !manualControlOn) {
        controller()
    }

    function controller() {
        if (Math.abs(pitchRateOfChange) < 0.4) {
            holdingPitch = pitch
        }
        presisionAlignment(holdingPitch, 0.5)
    }
}

function prograde() {
    if (progradeOn && !manualControlOn && !pitchHoldOn) {
        controller()
    }

    function controller() {
        presisionAlignment(angleOfMotion, 0.5)
    }
}

function autoLand() {
    if (autoLandOn && !manualControlOn && !pitchHoldOn) {
        if (!initVehicleConfigCompleted) {
            initVehicleConfig()
        }

        if (!(altitude <= bellyFlopTriggerAltitude)) {
            //aeroDesent
            updateBellyFlopTriggerAltitude()
            aeroDescentController()
        } else if (!flipCompleted) {
            //bellyFlop
            flipStageController()
        } else if (!horizontalAdjustmentStageCompleted) {
            //horizontalAdjustment
            horizontalAdjustmentStageController()
        } else if (!finalDesentStageCompleted) {
            //finalDesent
            finalDesentStageController()
        }

    }

    function initVehicleConfig() {
        finActive = true
        rcsActive = true
        throttleControl(throttleLowwerLimmit)

        if (propellantMass > dumpLimit) {
            dumpingFuel = true
        }

        if (getWorkingEngineCount() > 0) {
            toggleAllRaptors()
        }

        initVehicleConfigCompleted = true
    }

    function updateBellyFlopTriggerAltitude() {
        finalStagePessimisticAvailableThrust = finalStagePessimisticAvailableThrust
        horizontalAdjustmentDurationEstimate = horizontalAdjustmentDurationEstimateSingleEngine
        dualRaptorMode = false
        trialRaptorMode = false

        if (finalStagePessimisticAvailableThrust * 0.8 < gravity * vehicleMass) {
            //there's always more raptors
            finalStagePessimisticAvailableThrust = finalStagePessimisticAvailableThrustDualRaptorMode
            horizontalAdjustmentDurationEstimate = horizontalAdjustmentDurationEstimateDualRaptorMode
            dualRaptorMode = true
            if (finalStagePessimisticAvailableThrust * 0.8 < gravity * vehicleMass) {
                horizontalAdjustmentDurationEstimate = horizontalAdjustmentDurationEstimateDualRaptorMode
                finalStagePessimisticAvailableThrust = finalStagePessimisticAvailableThrustTrialRaptorMode
                trialRaptorMode = true
            }
        }

        let finalStagePessimisticAvailableAcc = finalStagePessimisticAvailableThrust / vehicleMass - gravity

        let finalStagePessimisticDuration = -speedY / finalStagePessimisticAvailableAcc
        finalStagePessimisticAltitude = -speedY * finalStagePessimisticDuration * 0.5

        let flipStagePessimisticAcc = getAngularAcceleration(flipStagePessimisticAvailableThrust, engineDistanceFromCenterOfMass, vehicleMomentOfInertia)
        let flipStagePessimisticDuration = Math.sqrt((Math.PI / 2 + flipGoalAngle) / 2 / flipStagePessimisticAcc * 2) * 2

        bellyFlopTriggerAltitude = finalStagePessimisticAltitude + -speedY * (flipStagePessimisticDuration + raptorIgnitionTimeMean * 0.001) - horizontalAdjustmentVerticalSpeedLimit * horizontalAdjustmentDurationEstimate + vehicleHeight / 2;
    }

    function aeroDescentController() {
        let distanceToSite = downRangeDistance - landingSiteXpos + flipEnducedXposChange
        let timeToSite = -distanceToSite / speedX

        steerTowardsSite()

        function steerTowardsSite() {
            let correctionAngle


            if (distanceToSite > 0) {
                correctionAngle = -aeroDesentMaxCorrectionAngle
                
                if (timeToSite < 5 && timeToSite > 0) {
                    if (Math.abs(speedX) > fineTuneMaxSpeed) {
                        fineTunePercentage = 1
                    } else {
                        fineTunePercentage = Math.abs(speedX) / fineTuneMaxSpeed
                    }
                    correctionAngle = aeroDesentMaxCorrectionAngle * fineTuneMultiplier * fineTunePercentage
                }
            } else {
                correctionAngle = aeroDesentMaxCorrectionAngle
                if (timeToSite < 5 && timeToSite > 0) {
                    if (Math.abs(speedX) > fineTuneMaxSpeed) {
                        fineTunePercentage = 1
                    } else {
                        fineTunePercentage = Math.abs(speedX) / fineTuneMaxSpeed
                    }
                    correctionAngle = -aeroDesentMaxCorrectionAngle * fineTuneMultiplier * fineTunePercentage
                }
            }

            presisionAlignment(Math.PI / 2 + correctionAngle, 0.7)
        }
    }

    function flipStageController() {
        if (!flipStageInitted) {
            initFlipStage()
        }
        presisionAlignment(flipGoalAngle, 0.4)

        if (pitch < 0) {
            throttleControl(throttleUpperLimmit)
        }

        if (pitch < flipGoalAngle) {
            flipCompleted = true
        }

        function initFlipStage() {
            dumpingFuel = false
            rcsActive = false
            toggleAllRaptors()
            flipStageInitted = true
        }
    }

    function horizontalAdjustmentStageController() {
        if (!horizontalAdjustmentStageInitted) {
            initHorizontalAdjustmentStage()
        }

        updateParams()

        steering()
        verticalSpeedAdjustment(horizontalAdjustmentVerticalSpeedLimit, 10, 2)


        if (finalStagePessimisticAltitude * 1.1 > altitude) {
            horizontalAdjustmentStageCompleted = true
        }

        function initHorizontalAdjustmentStage() {
            finActive = false
            finLocked = true

            if (getWorkingEngineCount() < 3) {
                horizontalAdjustmentVerticalSpeedLimit = horizontalAdjustmentVerticalSpeedLimit / 1.5
                horizontalAdjustmentHorizontalSpeedLimit *= 2
            }
            horizontalAdjustmentStageInitted = true
        }

        function updateParams() {
            let targetDifference = landingSiteXpos - downRangeDistance
            if (raptorN1Running && !raptorN2Running && !raptorN3Running) {
                targetDifference -= 12
            } else if (!raptorN1Running && raptorN2Running && raptorN3Running) {
                targetDifference += 4
            } else if (!raptorN1Running && ((raptorN2Running && !raptorN3Running) || (!raptorN2Running && raptorN3Running))) {
                targetDifference += 4
            }


            let finalStagePessimisticAvailableAcc = getTotalMaxThrust() / vehicleMass - gravity
            let finalStagePessimisticDuration = -speedY / finalStagePessimisticAvailableAcc + 1
            finalStagePessimisticAltitude = -speedY * finalStagePessimisticDuration * 0.5 + vehicleHeight * 0.5

            horizontalAdjustmentTimeLeft = (altitude - finalStagePessimisticAltitude - vehicleHeight / 2) / (-speedY)

            horizontalAdjustmentDesiredSpeed = targetDifference / horizontalAdjustmentTimeLeft

            if (horizontalAdjustmentDesiredSpeed > horizontalAdjustmentHorizontalSpeedLimit) {
                horizontalAdjustmentDesiredSpeed = horizontalAdjustmentHorizontalSpeedLimit
            } else if ((horizontalAdjustmentDesiredSpeed < -horizontalAdjustmentHorizontalSpeedLimit)) {
                horizontalAdjustmentDesiredSpeed = -horizontalAdjustmentHorizontalSpeedLimit
            }

            if (speedY > horizontalAdjustmentVerticalSpeedLimit) {
                raptorAutoShutDown_KeepMinTWRBelow1()
            }
        }

        function steering() {
            if (horizontalAdjustmentTimeLeft < 3 && horizontalAdjustmentTimeLeft > -3) {
                horizontalSteering(0, adjustmentMaxAngle, 10, 0.8)
            } else {
                horizontalSteering(horizontalAdjustmentDesiredSpeed, adjustmentMaxAngle, 6, 1)
            }

        }

    }

    function finalDesentStageController() {
        if (!finalDesentStageInitted) {
            initfinalDesentStage()
        }

        paramUpdate()

        steering()

        if (speedY > -5) {
            raptorAutoShutDown_KeepMinTWRBelow1()
        }


        verticalSpeedAdjustment(-distanceToGround / 3 - 0.1, 10, 3)



        checkIfTD()

        function initfinalDesentStage() {
            finalDesentStageInitted = true
        }

        function paramUpdate() {
            distanceToGround = altitude - vehicleHeight * 0.5
        }
        function steering() {
            if (altitude > vehicleHeight * 0.5 + noSteeringHeight) {
                if (raptorN1Running && !raptorN2Running && !raptorN3Running) {
                    horizontalSteering(-0.8, adjustmentMaxAngle / 2, 5, 0.7)
                } else if (!raptorN1Running && raptorN2Running && raptorN3Running) {
                    horizontalSteering(0.8, adjustmentMaxAngle / 2, 5, 0.7)
                } else if (!raptorN1Running && ((raptorN2Running && !raptorN3Running) || (!raptorN2Running && raptorN3Running))) {
                    horizontalSteering(0.72, adjustmentMaxAngle / 2, 5, 0.7)
                } else {
                    horizontalSteering(0, adjustmentMaxAngle / 2, 5, 0.7)
                }

            } else {
                presisionAlignment(0, 0.4)
            }

        }

        function checkIfTD() {
            if (altitude <= vehicleHeight * 0.5 + 0.05) {
                throttleControl(throttleLowwerLimmit)
                toggleAllRaptors()
                dumpingFuel = true
                forceDump = true
                autoLandOn = false
            }
        }
    }
}