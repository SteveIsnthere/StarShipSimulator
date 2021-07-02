function updateFlightParamDisp() {
    if (usedTime % 5 == 0) {
        //alttitude
        if (altitude < 1000) {
            document.getElementById("altitudeDisp").textContent = altitude.toFixed(0) + "M";
        } else {
            document.getElementById("altitudeDisp").textContent = (altitude * 0.001).toFixed(1) + "KM";
        }

        //speed
        if (trueSpeed < 1000) {
            document.getElementById("speedDisp").textContent = trueSpeed.toFixed(0) + "M/S";
        } else {
            document.getElementById("speedDisp").textContent = (trueSpeed * 0.001).toFixed(1) + "KM/S";
        }

        if (showedFlightParamDispMid) {
            //propellent
            document.getElementById("propellantMassDisp").textContent = (propellantMass * 0.001).toFixed(0);
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
        if (autoBoostBackOn) {
            buttonSwitchOn("toggleBoostBack")
        } else {
            buttonSwitchOff("toggleBoostBack")
        }
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

    if (timeAccState) {
        buttonSwitchOn("timeAccState")
    } else {
        buttonSwitchOff("timeAccState")
    }

}


function show_hidecontrolsL() {
    if (showedcontrolsL) {
        document.getElementById("controlsL").style.transform = "translateX(-100%)"
        document.getElementById("controlsLContent").style.boxShadow = "3px 3px 7px 0 rgba(0, 0, 0, 0.2), -4px -4px 9px 0 rgba(255, 255, 255, 0.55)"
    } else {
        document.getElementById("controlsL").style.transform = "translateX(0%)"
        document.getElementById("controlsLContent").style.boxShadow = "none"
    }

    showedcontrolsL = toggle(showedcontrolsL)
}

function show_controlsL() {
    document.getElementById("controlsL").style.transform = "translateX(0%)"
    document.getElementById("controlsLContent").style.boxShadow = "none"
    showedcontrolsL = toggle(showedcontrolsL)
}

function show_hidecontrolsR() {
    if (showedcontrolsR) {
        document.getElementById("controlsR").style.transform = "translateX(100%)"
        document.getElementById("controlsRContent").style.boxShadow = "3px 3px 7px 0 rgba(0, 0, 0, 0.2), -4px -4px 9px 0 rgba(255, 255, 255, 0.55)"
    } else {
        document.getElementById("controlsR").style.transform = "translateX(0%)"
        document.getElementById("controlsRContent").style.boxShadow = "none"
    }

    showedcontrolsR = toggle(showedcontrolsR)
}

function show_controlsR() {
    document.getElementById("controlsR").style.transform = "translateX(0%)"
    document.getElementById("controlsRContent").style.boxShadow = "none"
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

function show_hideFlightParamDispMid() {
    if (showedFlightParamDispMid) {
        document.getElementById("FlightParamDispMid").style.transform = "translate(0, -100%)"
        document.getElementById("menuToggle").style.boxShadow = "3px 3px 7px 0 rgba(0, 0, 0, 0.2), -4px -4px 9px 0 rgba(255, 255, 255, 0.55)"
    } else {
        document.getElementById("FlightParamDispMid").style.transform = "translate(0, 0)"
        document.getElementById("menuToggle").style.boxShadow = "none"
    }

    showedFlightParamDispMid = toggle(showedFlightParamDispMid)
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

    } else if (window.innerWidth < 790) {
        show_hidecontrolsL()
    } else {
        show_hidecontrolsR()
        show_hidecontrolsL()
    }
}

let onIosPwa = false

let showedcontrolsL = false
let showedcontrolsR = false
let showedPlotView = false
let showedMenuView = false
let showedFlightParamDispMid = false

let timeAccState = true //positive

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
