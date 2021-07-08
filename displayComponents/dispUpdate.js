function updateFlightParamDisp() {
    if (updatedFrameCount % 5 == 0) {
        //alttitude
        if (altitude < 1000) {
            document.getElementById("altitudeDisp").textContent = altitude.toFixed(0);
            document.getElementById("altitudeDisp2").textContent = "M";
        } else {
            document.getElementById("altitudeDisp").textContent = (altitude * 0.001).toFixed(1);
            document.getElementById("altitudeDisp2").textContent = "KM";
        }

        //speed
        if (trueSpeed < 1000) {
            document.getElementById("speedDisp").textContent = trueSpeed.toFixed(0);
            document.getElementById("speedDisp2").textContent = "M/S";
        } else {
            document.getElementById("speedDisp").textContent = (trueSpeed * 0.001).toFixed(1);
            document.getElementById("speedDisp2").textContent = "KM/S";
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
            if (onTheGround) {
                document.getElementById("gforece").textContent = 1;
            }else{
                document.getElementById("gforece").textContent = perceivedG.toFixed(1);
            }
            //ToSite
            let disToSite = Math.ceil(downRangeDistance - starBaseXpos)
            if (disToSite < 1000 && disToSite > -1000) {
                document.getElementById("distanceToLandingSite").textContent = disToSite + "m";
            } else {
                document.getElementById("distanceToLandingSite").textContent = (disToSite * 0.001).toFixed(1) + "km";
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
    updateTimeAccControl()

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
        if (autoTakeOffOn) {
            buttonSwitchOn("toggleautoTakeOff")
        } else {
            buttonSwitchOff("toggleautoTakeOff")
        }
        if (autoMaxThrustOn) {
            buttonSwitchOn("toggleautoMaxThrust")
        } else {
            buttonSwitchOff("toggleautoMaxThrust")
        }
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

    function updateTimeAccControl() {
        if (timeAccState) {
            buttonSwitchOn("timeAccState")
        } else {
            buttonSwitchOff("timeAccState")
        }
        document.getElementById("timeAccControl").value = timeAccel
        document.getElementById("timeAccRateDisp").textContent = timeAccel
    }

    if (randomFaliure) {
        buttonSwitchOn("toggleRandomFaliure")
    } else {
        buttonSwitchOff("toggleRandomFaliure")
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
        app.start()
    } else {
        document.getElementById("plotView").style.transform = "translate(0, 0)"
        plot()
        setTimeout(function () { app.stop() }, 200);
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
        app.start()
    } else {
        document.getElementById("menuView").style.transform = "translate(0, 0)"
        setTimeout(function () { app.stop() }, 200);
    }

    showedMenuView = toggle(showedMenuView)
}

function show_hideGuideView() {
    if (showedGuideView) {
        document.getElementById("guideView").style.transform = "translate(0, 100%)"
        app.start()
    } else {
        document.getElementById("guideView").style.transform = "translate(0, 0)"
        setTimeout(function () { app.stop() }, 200);
    }

    showedGuideView = toggle(showedGuideView)
}

function show_hideAboutView() {
    if (showedAboutView) {
        document.getElementById("aboutView").style.transform = "translate(0, 100%)"
        app.start()
    } else {
        document.getElementById("aboutView").style.transform = "translate(0, 0)"
        setTimeout(function () { app.stop() }, 200);
    }

    showedAboutView = toggle(showedAboutView)
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
let showedGuideView = false
let showedAboutView = false
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

setTimeout(function(){
    document.getElementById("helpBtn").style.display = "none"
}, 15000);
