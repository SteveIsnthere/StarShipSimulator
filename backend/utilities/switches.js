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
        if(raptorN1Fail == false){
            setTimeout(toggle_On, getRaptorIgnitionTime())
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
    }

}


function toggleRaptor2() {
    if (!raptorN2Running && raptorN2Fail == false && !fuelRunOut) {
        raptorIgnitionPossibleFaliure(2)
        if(raptorN2Fail == false){
            setTimeout(toggle_On, getRaptorIgnitionTime())
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
    }
}

function toggleRaptor3() {
    if (!raptorN3Running && raptorN3Fail == false && !fuelRunOut) {
        raptorIgnitionPossibleFaliure(3)
        if(raptorN3Fail == false){
            setTimeout(toggle_On, getRaptorIgnitionTime())
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
    }
}

function toggleAllRaptors() {
    if (raptorN1Running || raptorN2Running || raptorN3Running) {
        raptorN1Running = false
        raptorN2Running = false
        raptorN3Running = false

        buttonSwitchOff("raptor1toggle")
        buttonSwitchOff("raptor2toggle")
        buttonSwitchOff("raptor3toggle")
    }else{
        if(raptorN1Running == false){
            toggleRaptor1()
        }
        if(raptorN2Running == false){
            toggleRaptor2()
        }
        if(raptorN3Running == false){
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
    }

}

