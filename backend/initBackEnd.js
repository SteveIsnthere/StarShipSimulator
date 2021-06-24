function initBackEnd() {
    initWorld()
    initVehicleParams()
    initVehicleStatus()
    initFlightParams()
    initAutoPilotParams()
    initDataRecorder()
}

function initWorld() {
    globalThis.frameRate = 60
    globalThis.timeAccel = 1
    globalThis.renderTimeInterval = frameRate / timeAccel //usually equals to how many frames' been rendered per min


    globalThis.planetRadius = 6400000
    globalThis.planetCirconference = 2 * planetRadius * Math.PI
    globalThis.planetMass = 5.972e+24
    globalThis.planetTimeToRotate = 24 * (60 * 60)
    globalThis.planetLineaVelocity = planetCirconference / planetTimeToRotate

    globalThis.gravitationalConstant = 6.674e-11

    globalThis.airDensity //kg/m^3
    globalThis.airPressure //k-pa
    globalThis.gravity = 9.807

    globalThis.speedOfSound = 343 //m/s

    globalThis.environmentTime = 0

    globalThis.wind = 0
    globalThis.gust = 0

    globalThis.starBaseXpos = planetCirconference/2
}

function initFlightParams() {
    globalThis.usedTime = 0 // 1/60s

    globalThis.altitude = 000 + vehicleHeight / 2 //m
    globalThis.downRangeDistance = starBaseXpos
    globalThis.downRangeDistanceNextFrame = downRangeDistance

    globalThis.distanceToPlanetCenter = planetRadius + altitude
    globalThis.orbitalVelocityAtCurrentAltitude = Math.sqrt(gravitationalConstant * planetMass / distanceToPlanetCenter)

    globalThis.trueSpeed = 0
    globalThis.speedX = 0
    globalThis.speedY = 0
    globalThis.machSpeed = 0

    globalThis.orbitGravityAccCompensation = gravity * Math.abs(speedX) / orbitalVelocityAtCurrentAltitude

    globalThis.thrust = 0 //N
    globalThis.thrustAcceleration = 0
    globalThis.offAxisThrustDifferenceAcceleration = 0

    globalThis.twr = 0

    globalThis.accelerationX = 0
    globalThis.accelerationY = -gravity
    globalThis.totalAcceleration = Math.sqrt(accelerationX ** 2 + accelerationY ** 2)

    globalThis.thrustVectorForce = 0
    globalThis.thrustVectorAcceleration = 0

    globalThis.rcsThrust = 0 //N
    globalThis.rcsThrustAngularAcceleration = 0 //N

    globalThis.angularDragAcceleration = 0

    globalThis.pitch = getRad(0) //rad
    globalThis.pitchRateOfChange = 0
    globalThis.pitchRecord = [Infinity, Infinity]

    globalThis.angularVelocity = 0
    globalThis.angularAcceleration = 0 // rad/s^2

    globalThis.angleOfMotion = 0 //rad
    globalThis.angleOfAttack = 0 //rad
    globalThis.angleInToTheWind = 0 //rad

    globalThis.crossSectionalArea = 100 //m^2
    globalThis.aerodynamicDrag = 0 //N
    globalThis.aerodynamicLift = 0 //N
    globalThis.aerodynamicDragAcceleration = 0

    globalThis.thermalPower = 0 //KW
    globalThis.dynamicPressure = 0 //psi
}

function initVehicleParams() {

    initSize_Weight()
    initEngine()
    initControlSurface()
    initVehicleLimit()
    initControlInput()

    function initSize_Weight() {
        globalThis.vehicleHeight = 50
        globalThis.vehicleDiameter = 9

        globalThis.vehicleMaxArea = vehicleDiameter * vehicleHeight
        globalThis.vehicleMinArea = Math.PI * (vehicleDiameter / 2) ** 2

        globalThis.vehicleInFlightMaxArea = vehicleMaxArea

        globalThis.vehicleDryMass = 120000 //kg
        globalThis.propellantMass = 100000
        globalThis.vehicleMass = vehicleDryMass + propellantMass

        globalThis.dumpRate = 3500
        globalThis.dumpLimit = 12000

        globalThis.vehicleMomentOfInertia = vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + vehicleMass * vehicleHeight ** 2 / 12

        globalThis.intergalOfRCubedTimesDx = 97656
    }

    function initEngine() {

        globalThis.raptorIgnitionTimeMean = 600
        globalThis.raptorIgnitionFaliureRate = 0.05

        globalThis.throttle = 100 //100%
        globalThis.throttleCurrent = 100 //100%
        globalThis.throttleSpeed = 60 //100%
        globalThis.throttleSpeedPerFrame = throttleSpeed / renderTimeInterval //100%
        globalThis.throttleUpperLimmit = 100
        globalThis.throttleLowwerLimmit = 40

        globalThis.raptorOffsetFromCenter = 1
        globalThis.raptorN1offAxis = -raptorOffsetFromCenter
        globalThis.raptorN2offAxis = raptorOffsetFromCenter / 2
        globalThis.raptorN3offAxis = raptorOffsetFromCenter / 2

        globalThis.raptorN1offAxisForceFraction = -raptorN1offAxis / Math.sqrt(raptorN1offAxis ** 2 + (vehicleHeight / 2) ** 2)
        globalThis.raptorN2offAxisForceFraction = -raptorN2offAxis / Math.sqrt(raptorN2offAxis ** 2 + (vehicleHeight / 2) ** 2)
        globalThis.raptorN3offAxisForceFraction = -raptorN3offAxis / Math.sqrt(raptorN3offAxis ** 2 + (vehicleHeight / 2) ** 2)

        globalThis.engineDistanceFromCenterOfMass = 21.8

        configThrottleControl()

        globalThis.gimbolPosition = 0 //%
        globalThis.gimbolSpeed = 600 //%
        globalThis.gimbolSpeedPerFrame = gimbolSpeed / renderTimeInterval //%
        globalThis.gimbolAngleLimit = getRad(15)

        globalThis.gimbolPointingDirection = 0

        globalThis.maxThrustPerRaptor = 2200 * 1000 //kN
        globalThis.maxFuelFlowPerRaptor = 650 // kg/s

        function configThrottleControl() {
            var throttleControl = document.getElementById("throttleControl");
            throttleControl.setAttribute("min", throttleLowwerLimmit);
            throttleControl.setAttribute("max", throttleUpperLimmit);
            throttleControl.setAttribute("value", throttle);
        }
    }

    function initControlSurface() {
        globalThis.rcsMaxThrust = 800000 //N
        globalThis.rcsThrustDistanceFromCenterOfMass = 20
        globalThis.rcsRunTimeRemaining = 25 //s

        globalThis.finAcuationMaxAngle = 1.03
        globalThis.frontFinExtention = 0 //0%
        globalThis.aftFinExtention = 0

        globalThis.finAcuationSpeed = 120 // perc per second
        globalThis.finAcuationSpeedPerFrame = finAcuationSpeed / renderTimeInterval // perc per frame

        globalThis.frontFinSurfaceAera = 24.2
        globalThis.frontFinDistanceFromCenterOfMass = 23.3
        globalThis.aftFinSurfaceAera = 45.8
        globalThis.aftFinDistanceFromCenterOfMass = 12.6
        globalThis.totalFinSurfaceAera = frontFinSurfaceAera + aftFinSurfaceAera

        globalThis.frontFinEffectiveAreaFraction = frontFinSurfaceAera * Math.sin(finAcuationMaxAngle * frontFinExtention * 0.01)
        globalThis.aftFinEffectiveAreaFraction = aftFinSurfaceAera * Math.sin(finAcuationMaxAngle * aftFinExtention * 0.01)

        globalThis.frontFinDrag = 0
        globalThis.aftFinDrag = 0
        globalThis.frontFinDragAngularAcceleration = 0
        globalThis.aftFinDragAngularAcceleration = 0

        globalThis.finDragCoefficient = 2
    }

    function initVehicleLimit() {
        globalThis.gLimit = 35
        globalThis.heatLimit = 55
        globalThis.dynamicPressureLimit = 50
        globalThis.touchDownPitchLimit = 0.09
        globalThis.touchDownSpeedLimit = 10
    }

    function initControlInput() {
        globalThis.translationModeOn = true
        globalThis.pitchControl = 0 //100% - -100%

        configPitchControl()

        function configPitchControl() {
            var pitchControl = document.getElementById("pitchControl");
            pitchControl.setAttribute("min", -100);
            pitchControl.setAttribute("max", 100);
            pitchControl.setAttribute("value", pitchControl);
        }
    }
}

function initVehicleStatus() {

    globalThis.onTheGround = false
    globalThis.landed = false

    globalThis.raptorN1Running = false
    globalThis.raptorN2Running = false
    globalThis.raptorN3Running = false

    globalThis.rcsActive = false

    globalThis.finActive = false
    globalThis.finLocked = false

    globalThis.gearDown = false

    globalThis.dumpingFuel = false
    globalThis.forceDump = false



    initWarning()
    initFailure()

    function initWarning() {
        globalThis.coldGasLow = false
        globalThis.fuelLow = false

        globalThis.heatDamagedWarning = false
        globalThis.overPressureWarning = false
        globalThis.overGloadWarning = false
    }

    function initFailure() {
        globalThis.crashed = false
        globalThis.inFightBreakUp = false

        globalThis.coldGasRunOut = false
        globalThis.fuelRunOut = false

        globalThis.raptorN1Fail = false
        globalThis.raptorN2Fail = false
        globalThis.raptorN3Fail = false

        globalThis.heatDamaged = false
        globalThis.overPressure = false
        globalThis.overGload = false

        globalThis.flippedOver = false
        globalThis.crashed = false
    }
}

function initDataRecorder() {
    globalThis.recordTimeInterval = 5

    //timeNodes
    globalThis.timeNodes = []

    //motionAnglePlot
    globalThis.listOfPitchAngle = []
    globalThis.listOfAngleOfMotion = []
    globalThis.listOfAngleOfAttack = []
    globalThis.listOfAngleInToTheWind = []

    //motionSpeedPlot
    globalThis.listOfSpeedX = []
    globalThis.listOfSpeedY = []
    globalThis.listOfSpeed = []

    //aerodynamicForcePlot
    globalThis.listOfaerodynamicDrag = []
    globalThis.listOfaerodynamicLift = []

    //altitudePlot
    globalThis.listOfAltitude = []
    globalThis.listOfDownRangeDistance = []

    //thermalPower&dynamicPressurePlot
    globalThis.listOfThermalPower = []
    globalThis.listOfDynamicPressure = []

    //accelerationPlot
    globalThis.listOfAcceleration = []
    globalThis.listOfAccelerationX = []
    globalThis.listOfAccelerationY = []

    //controlOutPutPlot
    globalThis.listOfPitchControl = []
    globalThis.listOfThrottle = []
}

function initAutoPilotParams() {
    globalThis.manualControlOn = false
    globalThis.holdingPitch = pitch

    globalThis.controlInPutTimeConstant = 1 / frameRate * renderTimeInterval
    initPresisionAlignment()
    initPitchHold()
    initAutoLand()

    function initPresisionAlignment() {

    }

    function initPitchHold() {
        globalThis.pitchHoldOn = false

    }


    function initAutoLand() {
        globalThis.autoLandOn = false
        globalThis.initVehicleConfigCompleted = false
        globalThis.landingSiteXpos = starBaseXpos

        globalThis.autoLandFinalStageEngineCount = 1
        globalThis.finalStagePessimisticAvailableThrust = autoLandFinalStageEngineCount * maxThrustPerRaptor

        globalThis.dualRaptorMode = false
        globalThis.trialRaptorMode = false

        globalThis.finalStagePessimisticAvailableThrustDualRaptorMode = finalStagePessimisticAvailableThrust * 2
        globalThis.finalStagePessimisticAvailableThrustTrialRaptorMode = finalStagePessimisticAvailableThrust * 3

        globalThis.flipStageEngineCount = 1
        globalThis.flipStagePessimisticAvailableThrust = flipStageEngineCount * maxThrustPerRaptor * throttleLowwerLimmit * 0.01

        //aeroDesent
        globalThis.aeroDesentMaxCorrectionAngle = getRad(3)

        globalThis.fineTunePercentage //max 1

        globalThis.fineTuneMultiplier = 2

        globalThis.fineTuneMaxSpeed = 5

        //bellyFlop
        globalThis.bellyFlopTriggerAltitude = 0

        globalThis.flipStageInitted = false

        globalThis.flipCompleted = false

        globalThis.flipGoalAngle = getRad(10)

        globalThis.flipEnducedXposChange = 100

        //horizontalAdjustment
        globalThis.horizontalAdjustmentStageCompleted = false

        globalThis.horizontalAdjustmentStageInitted = false

        globalThis.adjustmentMaxAngle = getRad(20)

        globalThis.horizontalAdjustmentDurationEstimateSingleEngine = 5.5

        globalThis.horizontalAdjustmentDurationEstimate = horizontalAdjustmentDurationEstimateSingleEngine

        globalThis.horizontalAdjustmentDurationEstimateDualRaptorMode = horizontalAdjustmentDurationEstimate * 1.5
        globalThis.horizontalAdjustmentDurationEstimateTrialRaptorMode = horizontalAdjustmentDurationEstimate * 2

        globalThis.horizontalAdjustmentTimeLeft

        globalThis.horizontalAdjustmentHorizontalSpeedLimit = 5

        globalThis.horizontalAdjustmentVerticalSpeedLimit = -30

        globalThis.horizontalAdjustmentDesiredSpeed

        globalThis.effectiveVerticalMaxThrust

        //finalDesent
        globalThis.finalStagePessimisticAltitude

        globalThis.finalDesentStageInitted = false

        globalThis.distanceToGround

        globalThis.finalDesentStageCompleted = false

        globalThis.noSteeringHeight = 5
    }
}
initBackEnd()