function toggle(bool) {
    return !bool
}

function updateYokePosition() {
    document.getElementById("pitchControl").value = pitchControl
    document.getElementById("throttleControl").value = throttle
}

function setGoalasCurrentAttitude() {
    holdingPitch = pitch
}

function manualControl_on() {
    manualControlOn = true
}

function manualControl_off() {
    manualControlOn = false
}

function buttonSwitchOn(id) {
    document.getElementById(id).style.color = '#006600'
    document.getElementById(id).style.borderColor = '#6495ED'
}

function buttonSwitchOff(id) {
    document.getElementById(id).style.color = 'black'
    document.getElementById(id).style.borderColor = 'grey'
}

function updateScreenSize() {
    sWidth = window.innerWidth
    sHeight = window.innerHeight
}

function updateSwitches() {
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

    if (pitchHoldOn) {
        buttonSwitchOn("togglePitchHold")
    } else {
        buttonSwitchOff("togglePitchHold")
    }

    if (rcsActive) {
        buttonSwitchOn("toggleRcs")
    } else {
        buttonSwitchOff("toggleRcs")
    }
    if (FinActive) {
        buttonSwitchOn("toggleFin")
    } else {
        buttonSwitchOff("toggleFin")
    }
}

function restart() {
    document.getElementById("RestartBtn").style.display = "none"
    document.getElementById("dataRecorderButton").style.display = "none"

    initBackEnd()

    updateButtons()

    resetRenderer()

    initDrawMethods()

    resetControls()

    function resetRenderer() {
        app.renderer.backgroundColor = rendererBackgroundColor;
    }

    function resetControls() {
        pitchControl = 0
        throttle = 100
        updateYokePosition()
    }
}

function controlByTilt(event) {
    let tiltAngle

    if (window.orientation === 90) {
        tiltAngle = event.beta
    } else if (window.orientation === -90) {
        tiltAngle = -event.beta
    } else if (window.orientation === 0) {
        tiltAngle = event.gamma
    } else {
        tiltAngle = -event.gamma
    }

    let inputAngle = tiltAngle * 1.5

    if (inputAngle >= 100) {
        pitchControl = 100
    } else if (inputAngle <= -100) {
        pitchControl = -100
    } else {
        pitchControl = inputAngle
    }
    updateYokePosition()

}

function checkIsiOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}


function zoomIn() {
    if (drawingSize * 0.85 < drawingSizeUpperLimit) {
        drawingSize *= 1.15
    }
}

function zoomOut() {
    if (drawingSize * 0.85 > drawingSizeLowwerLimit) {
        drawingSize *= 0.85
    }
}

function isLandscape() {
    return (window.orientation === 90 || window.orientation === -90);
}