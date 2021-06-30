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
            document.getElementById("showPlotViewButton").style.display = "initial"
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


function show_hidecontrolsL() {
    if (showedcontrolsL) {
        document.getElementById("controlsLContent").style.transform = "translateX(-100%)"
    } else {
        document.getElementById("controlsLContent").style.transform = "translateX(0%)"
    }

    showedcontrolsL = toggle(showedcontrolsL)
}

function show_hidecontrolsR() {
    if (showedcontrolsR) {
        document.getElementById("controlsRContent").style.transform = "translateX(100%)"

    } else {
        document.getElementById("controlsRContent").style.transform = "translateX(0%)"

    }

    showedcontrolsR = toggle(showedcontrolsR)
}

function show_hidePlotView() {
    if (showedPlotView) {
        document.getElementById("plotView").style.transform = "translate(0, 100%)"
    } else {
        document.getElementById("plotView").style.transform = "translate(0, 0)"
        plot()
    }

    showedPlotView = toggle(showedPlotView)
}

function show_hideMenuView() {
    if (showedMenuView) {
        document.getElementById("menuView").style.transform = "translate(0, 100%)"
    } else {
        document.getElementById("menuView").style.transform = "translate(0, 0)"
    }

    showedMenuView = toggle(showedMenuView)
}

function dynamicLayoutUpdate() {
    if (window.innerWidth < 450) {
document.getElementById("controlsL").style.transform = "translate(0, -115px)"
document.getElementById("controlsR").style.transform = "translate(0, 82px)"
    } else if (window.innerWidth < 790) {
        show_hidecontrolsL()
    }else{
        show_hidecontrolsR()
        show_hidecontrolsL()
    }
}

let onIosPwa = false

let showedcontrolsL = false
let showedcontrolsR = false
let showedPlotView = false
let showedMenuView = false

//check platform
if (typeof window.orientation == 'undefined') {
    document.getElementById("toggleTiltControl").style.display = "none"
    //desktop
} else {
    //mobile
    buttonSwitchOn("toggleTiltControl")
    if (checkIsiOS()) {
        document.getElementById("requestTiltPermissionBtn").style.display = "initial"
        
        if (isIOSPWA()) {
            onIosPwa = true
        }
    }

    layoutChangeForMobile()

    function layoutChangeForMobile() {

    }
}
dynamicLayoutUpdate()
updateButtons()
