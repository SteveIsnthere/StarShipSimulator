//pitchHold
function manualPitchControlOn() {
    if (pitchHoldOn) {
        manualControl_on()
    }
}

function recordHoldingPitch_resumeAuto() {
    if (pitchHoldOn) {
        setGoalasCurrentAttitude()
        manualControl_off()
    }
}

//switches
function toggleRaptor1() {
    if (!raptorN1Running && raptorN1Fail == false && !fuelRunOut) {
        raptorIgnitionPossibleFaliure(1)
        if (raptorN1Fail == false) {
            setTimeout(toggle_On, getRaptorIgnitionTime()/timeAccel)
        }
    } else {
        toggle_Off()
    }

    function toggle_On() {
        raptorN1Running = true
        buttonSwitchOn("raptor1toggle")
    }

    function toggle_Off() {
        raptorN1Running = false
        buttonSwitchOff("raptor1toggle")

        globalThis.raptorShutDownEffect1 = new PIXI.Container();

        globalThis.raptorShutDownEffectEmitter1 = fx.getParticleEmitter('RaptorShutDown');
    
        starShipAndEffects.addChild(raptorShutDownEffect1)

        raptorShutDownEffectEmitter1.init(raptorShutDownEffect1, true, (0.14 + (throttleCurrent * 0.00055)) * drawingProportion);

    }

}


function toggleRaptor2() {
    if (!raptorN2Running && raptorN2Fail == false && !fuelRunOut) {
        raptorIgnitionPossibleFaliure(2)
        if (raptorN2Fail == false) {
            setTimeout(toggle_On, getRaptorIgnitionTime()/timeAccel)
        }
    } else {
        toggle_Off()
    }

    function toggle_On() {
        raptorN2Running = true
        buttonSwitchOn("raptor2toggle")
    }

    function toggle_Off() {
        raptorN2Running = false
        buttonSwitchOff("raptor2toggle")

        globalThis.raptorShutDownEffect2 = new PIXI.Container();

        globalThis.raptorShutDownEffectEmitter2 = fx.getParticleEmitter('RaptorShutDown');
    
        starShipAndEffects.addChild(raptorShutDownEffect2)

        raptorShutDownEffectEmitter2.init(raptorShutDownEffect2, true, (0.14 + (throttleCurrent * 0.00055)) * drawingProportion);

    }
}

function toggleRaptor3() {
    if (!raptorN3Running && raptorN3Fail == false && !fuelRunOut) {
        raptorIgnitionPossibleFaliure(3)
        if (raptorN3Fail == false) {
            setTimeout(toggle_On, getRaptorIgnitionTime()/timeAccel)
        }
    } else {
        toggle_Off()
    }

    function toggle_On() {
        raptorN3Running = true
        buttonSwitchOn("raptor3toggle")
    }

    function toggle_Off() {
        raptorN3Running = false
        buttonSwitchOff("raptor3toggle")

        globalThis.raptorShutDownEffect3 = new PIXI.Container();

        globalThis.raptorShutDownEffectEmitter3 = fx.getParticleEmitter('RaptorShutDown');
    
        starShipAndEffects.addChild(raptorShutDownEffect3)

        raptorShutDownEffectEmitter3.init(raptorShutDownEffect3, true, (0.14 + (throttleCurrent * 0.00055)) * drawingProportion);

    }
}

function toggleAllRaptors() {
    if (raptorN1Running || raptorN2Running || raptorN3Running) {
        if (raptorN1Running == true) {
            toggleRaptor1()
        }
        if (raptorN2Running == true) {
            toggleRaptor2()
        }
        if (raptorN3Running == true) {
            toggleRaptor3()
        }
    } else {
        if (raptorN1Running == false) {
            toggleRaptor1()
        }
        if (raptorN2Running == false) {
            toggleRaptor2()
        }
        if (raptorN3Running == false) {
            toggleRaptor3()
        }
    }
}

function toggleFin() {

    finActive = toggle(finActive)

    if (finActive) {
        buttonSwitchOn("toggleFin")
    } else {
        buttonSwitchOff("toggleFin")
    }

}

function toggleRcs() {

    rcsActive = toggle(rcsActive)

    if (rcsActive) {
        buttonSwitchOn("toggleRcs")
    } else {
        buttonSwitchOff("toggleRcs")
    }

}

function toggleDumpFuel() {

    dumpingFuel = toggle(dumpingFuel)

    if (dumpingFuel) {
        buttonSwitchOn("toggledumpFuel")
    } else {
        buttonSwitchOff("toggledumpFuel")
    }

}

function togglePitchHold() {

    setGoalasCurrentAttitude()

    pitchHoldOn = toggle(pitchHoldOn)

    if (pitchHoldOn) {
        buttonSwitchOn("togglePitchHold")
    } else {
        buttonSwitchOff("togglePitchHold")
    }

}

function toggleAutoLand() {

    autoLandOn = toggle(autoLandOn)

    if (autoLandOn) {
        buttonSwitchOn("toggleAutoLand")
    } else {
        buttonSwitchOff("toggleAutoLand")
        initAutoLand()
    }

}

function toggleBoostBack() {

    autoBoostBackOn = toggle(autoBoostBackOn)

    if (autoBoostBackOn) {
        buttonSwitchOn("toggleBoostBack")
    } else {
        buttonSwitchOff("toggleBoostBack")
        initAutoBoostBack()
    }

}

function toggleautoMaxThrust() {

    autoMaxThrustOn = toggle(autoMaxThrustOn)

    if (autoMaxThrustOn) {
        buttonSwitchOn("toggleautoMaxThrust")
    } else {
        buttonSwitchOff("toggleautoMaxThrust")
    }

}

function toggleautoTakeOff() {

    autoTakeOffOn = toggle(autoTakeOffOn)

    if (autoTakeOffOn) {
        buttonSwitchOn("toggleautoTakeOff")
    } else {
        buttonSwitchOff("toggleautoTakeOff")
    }

}

function toggleTimeAccState() {

    timeAccState = toggle(timeAccState)

    if (timeAccState) {
        buttonSwitchOn("timeAccState")
        document.getElementById("timeAccState").innerHTML = "Speed Things Up"
    } else {
        buttonSwitchOff("timeAccState")
        document.getElementById("timeAccState").innerHTML = "Slow Thing Down"
    }
}

function toggleRandomFaliure() {

    if (randomFaliure) {
        buttonSwitchOff("toggleRandomFaliure")
        raptorIgnitionFaliureRate = 0
    } else {
        buttonSwitchOn("toggleRandomFaliure")
        raptorIgnitionFaliureRate = 0.1
    }

    randomFaliure = toggle(randomFaliure)
}