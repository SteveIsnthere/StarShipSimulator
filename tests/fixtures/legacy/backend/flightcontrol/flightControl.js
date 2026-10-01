
function controlTranslation() {
    if (translationModeOn) {
        finsActuation(pitchControl / 2)
        rcsControl(pitchControl)
        thrustVectorControl(pitchControl)
    }
}

function finsActuation(goalPercentage) {
    //goalPercentage -50% - 50%
    if (finActive) {
        if (angleOfAttack < 0) {
            frontFinActuation(50 - goalPercentage)
            aftFinActuation(50 + goalPercentage)
        } else {
            frontFinActuation(50 + goalPercentage)
            aftFinActuation(50 - goalPercentage)
        }
    } else if(finLocked){
        frontFinActuation(0)
        aftFinActuation(0)
    }else{
        frontFinActuation(100)
        aftFinActuation(100)
    }

}

function frontFinActuation(goalPercentage) {
    if (((frontFinExtention < (goalPercentage + finAcuationSpeedPerFrame)) && (frontFinExtention > (goalPercentage - finAcuationSpeedPerFrame)))) {
        frontFinExtention = goalPercentage
    } else if (frontFinExtention < goalPercentage) {
        frontFinExtention += finAcuationSpeedPerFrame
    } else {
        frontFinExtention -= finAcuationSpeedPerFrame
    }
}

function aftFinActuation(goalPercentage) {
    if (((aftFinExtention < (goalPercentage + finAcuationSpeedPerFrame)) && (aftFinExtention > (goalPercentage - finAcuationSpeedPerFrame)))) {
        aftFinExtention = goalPercentage
    } else if (aftFinExtention <= goalPercentage) {
        aftFinExtention += finAcuationSpeedPerFrame
    } else {
        aftFinExtention -= finAcuationSpeedPerFrame
    }
}

function rcsControl(goalPercentage) {
    if (rcsActive && rcsRunTimeRemaining > 0) {
        if (goalPercentage > 99) {
            rcsThrust = rcsMaxThrust
            rcsRunTimeRemainingUpdate()
        } else if (goalPercentage < -99) {
            rcsThrust = -rcsMaxThrust
            rcsRunTimeRemainingUpdate()
        } else {
            rcsThrust = 0
        }
    } else {
        rcsThrust = 0
    }
    function rcsRunTimeRemainingUpdate() {
        if (rcsRunTimeRemaining > 0) {
            rcsRunTimeRemaining = (rcsRunTimeRemaining * renderTimeInterval - 1) / renderTimeInterval
        }
    }
}

function thrustVectorControl(goalPercentage) {

    if (((gimbolPosition < (goalPercentage + gimbolSpeedPerFrame)) && (gimbolPosition > (goalPercentage - gimbolSpeedPerFrame)))) {
        gimbolPosition = goalPercentage
    } else if (gimbolPosition < goalPercentage) {
        gimbolPosition += gimbolSpeedPerFrame
    } else {
        gimbolPosition -= gimbolSpeedPerFrame
    }

}

function throttleUpdate() {
    if ((throttleCurrent < (throttle + throttleSpeedPerFrame)) && (throttleCurrent > (throttle - throttleSpeedPerFrame))) {
        throttleCurrent = throttle
    } else if (throttleCurrent < throttle) {
        throttleCurrent += throttleSpeedPerFrame
    } else {
        throttleCurrent -= throttleSpeedPerFrame
    }
}

function throttleControl(goalPercentage) {
    throttle = goalPercentage
    updateYokePosition()
}