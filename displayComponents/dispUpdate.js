function updateFlightParamDisp() {
    if (usedTime % 5 == 0) {
        //alttitude
        if (altitude < 1000) {
            document.getElementById("altitudeDisp").textContent = altitude.toFixed(0) + "M";
        } else {
            document.getElementById("altitudeDisp").textContent = (altitude * 0.001).toFixed(1) + "KM";
        }
        //propellent
        document.getElementById("propellantMassDisp").textContent = (propellantMass * 0.001).toFixed(0);
        //speed
        if (trueSpeed < 1000) {
            document.getElementById("speedDisp").textContent = trueSpeed.toFixed(0) + "M/S";
        } else {
            document.getElementById("speedDisp").textContent = (trueSpeed * 0.001).toFixed(1) + "KM/S";
        }
        //twr
        document.getElementById("twrDisp").textContent = twr.toFixed(1);
        //speedX
        document.getElementById("speedX").textContent = Math.ceil(speedX);
        //speedY
        document.getElementById("speedY").textContent = Math.ceil(speedY);
        //g
        document.getElementById("gforece").textContent = (totalAcceleration / gravity).toFixed(1);
        //ToSite
        let disToSite = Math.ceil(downRangeDistance - starBaseXpos)
        if (disToSite < 1000 && disToSite > -1000) {
            document.getElementById("distanceToLandingSite").textContent = disToSite + " m";
        } else {
            document.getElementById("distanceToLandingSite").textContent = (disToSite * 0.001).toFixed(1) + " km";
        }

        //restartButton
        if (landed || crashed || inFightBreakUp || fuelRunOut) {
            document.getElementById("RestartBtn").style.display = "initial"
            document.getElementById("dataRecorderButton").style.display = "initial"
        }
    }
}

function updateButtons() {
    updateRaptorControls()
    updateAutoPilot()
    updateFlightControlsBtn()

    function updateFlightControlsBtn() {
        if (rcsActive) {
            buttonSwitchOn("toggleRcs")
        } else {
            buttonSwitchOff("toggleRcs")
        }
        if (finActive) {
            buttonSwitchOn("toggleFin")
        } else {
            buttonSwitchOff("toggleFin")
        }
        if (dumpingFuel) {
            buttonSwitchOn("toggledumpFuel")
        } else {
            buttonSwitchOff("toggledumpFuel")
        }
    }
    function updateAutoPilot() {
        if (pitchHoldOn) {
            buttonSwitchOn("togglePitchHold")
        } else {
            buttonSwitchOff("togglePitchHold")
        }
        if (progradeOn) {
            buttonSwitchOn("togglePrograde")
        } else {
            buttonSwitchOff("togglePrograde")
        }
        if (autoLandOn) {
            buttonSwitchOn("toggleAutoLand")
        } else {
            buttonSwitchOff("toggleAutoLand")
        }
    }


    function updateRaptorControls() {
        if (raptorN1Running) {
            buttonSwitchOn("raptor1toggle")
        } else {
            buttonSwitchOff("raptor1toggle")
        }

        if (raptorN2Running) {
            buttonSwitchOn("raptor2toggle")
        } else {
            buttonSwitchOff("raptor2toggle")
        }

        if (raptorN3Running) {
            buttonSwitchOn("raptor3toggle")
        } else {
            buttonSwitchOff("raptor3toggle")
        }
    }

}

//check platform
if (typeof window.orientation == 'undefined') {
    //desktop
} else {
    //mobile
    if (checkIsiOS()) {
        document.getElementById("requestTiltPermission").style.display = "initial"
    }

    layoutChangeForMobile()

    function layoutChangeForMobile() {
        document.getElementById("attitudeControl").style.display = "none"

        document.getElementById("engineControl").style.setProperty('bottom', 'calc(45% - 50px)');

        let allBtn = document.getElementsByClassName("engineControlBtn")

        for (n = 0; n < allBtn.length; n++) {
            allBtn[n].style.padding = "5px"
        }
    }
}



function show_hideEngineControl() {
    if (showedEngineControl) {
        document.getElementById("engineControl").style.transform = "translate(-95%, 0)"
        
    } else {
        document.getElementById("engineControl").style.transform = "translate(0, 0)"
    }

    showedEngineControl = toggle(showedEngineControl)
}


let showedEngineControl = true
updateButtons()