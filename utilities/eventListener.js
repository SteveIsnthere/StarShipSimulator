document.body.onresize = windowResize

document.addEventListener('keydown', function (event) {
    if (!showedMenuView) {
        attitudeCommand(event)
        throttleCommand(event)
        togglePitchHoldByKey(event)
        toggleAllRaptorsByKey(event)
        toggleSingleRaptorByKey(event)
        toggleFinByKey(event)
        toggleRcsByKey(event)
        toggleBoostBackbyKey(event)

        drawingSizeAdjustment(event)
    }


    function attitudeCommand(event) {
        if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
            manualControl_on()
            pitchControl = -100
            updateYokePosition()
        }
        if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
            manualControl_on()
            pitchControl = 100
            updateYokePosition()
        }
    }
    function throttleCommand(event) {

        if (event.key === 'Shift' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {

            throttle += 10

            updateYokePosition()
        }
        if (event.key === 'Control' || event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {

            throttle -= 10

            updateYokePosition()

        }
        if (event.key === 'z' || event.key === 'Z') {

            throttle = throttleUpperLimmit

            updateYokePosition()
        }
        if (event.key === 'x' || event.key === 'X') {

            throttle = throttleLowwerLimmit

            updateYokePosition()

        }
    }

    function togglePitchHoldByKey(event) {
        if (event.key === 't' || event.key === 'T') {
            togglePitchHold()
        }
    }

    function toggleAllRaptorsByKey(event) {
        if (event.key === ' ') {
            toggleAllRaptors()
        }
    }

    function toggleSingleRaptorByKey(event) {
        if (event.key === '1') {
            toggleRaptor1()
        } else if (event.key === '2') {
            toggleRaptor2()
        } else if (event.key === '3') {
            toggleRaptor3()
        }
    }

    function toggleFinByKey(event) {
        if (event.key === 'f' || event.key === 'F') {
            toggleFin()
        }
    }

    function toggleRcsByKey(event) {
        if (event.key === 'r' || event.key === 'R') {
            toggleRcs()
        }
    }

    function toggleBoostBackbyKey(event) {
        if (event.key === 'Backspace') {
            toggleBoostBack()
        }
    }

    function drawingSizeAdjustment(event) {
        if (event.key === '=') {
            zoomIn()
        } else if (event.key === '-') {
            zoomOut()
        }
    }
});

document.addEventListener('keyup', function (event) {
    if (!showedMenuView) {
        attitudeCommandRelease(event)
    }
    function attitudeCommandRelease(event) {
        if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft' || event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
            pitchControl = 0
            updateYokePosition()
            setGoalasCurrentAttitude()
            manualControl_off()
        }
    }
});


let tiltControlOn = true
let tiltControlInited = false
document.getElementById("startGame").onclick = function (e) {
    if (!tiltControlInited) {
        e.preventDefault();
        // Request permission for iOS 13+ devices//
        if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
            DeviceMotionEvent.requestPermission();
        }
        window.addEventListener("deviceorientation", controlByTilt);

        document.getElementById("requestTiltPermissionBtn").style.display = "none"

        tiltControlInited = true
    }

};



