function demoAutoLand() {
  if (demoAutoLandOn) {
    finalDesentStageController()
  }
  function finalDesentStageController() {

    paramUpdate()

    steering()

    if (speedY > -20) {
      raptorAutoShutDown_KeepMinTWRBelow1()
    }

    verticalSpeedAdjustment(-demoAutoLanddistanceToGround / 3 - 0.1, 10, 3)

    checkIfTD()



    function paramUpdate() {
      demoAutoLanddistanceToGround = altitude - vehicleHeight * 0.5
    }
    function steering() {
      if (altitude > vehicleHeight * 0.5 + noSteeringHeight) {
        if (raptorN1Running && !raptorN2Running && !raptorN3Running) {
          horizontalSteering(-0.8, adjustmentMaxAngle / 2, 5, 0.7)
        } else if (!raptorN1Running && raptorN2Running && raptorN3Running) {
          horizontalSteering(0.8, adjustmentMaxAngle / 2, 5, 0.7)
        } else if (!raptorN1Running && ((raptorN2Running && !raptorN3Running) || (!raptorN2Running && raptorN3Running))) {
          horizontalSteering(0.72, adjustmentMaxAngle / 2, 5, 0.7)
        } else {
          horizontalSteering(0, adjustmentMaxAngle / 2, 5, 0.7)
        }

      } else {
        presisionAlignment(0, 0.4)
      }

    }

    function checkIfTD() {
      if (altitude <= vehicleHeight * 0.5 + 0.05) {
        toggleAllRaptors()
        demoAutoLandOn = false
        finLocked = false
        propellantMass = 350000

        pitchControl = 0
        document.getElementById("pitchControl").value = pitchControl

        throttle = 100
        document.getElementById("throttleControl").value = throttle
      }
    }
  }
}

function initDemoAutoLand() {
  globalThis.demoAutoLandOn = true
  globalThis.demoAutoLanddistanceToGround
}
globalThis.firstTimeLanded = true
initDemoAutoLand()

app.stop()



function startRunningGame() {
  altitude = renderBoxPhysicalHeight-1
  speedY = -renderBoxPhysicalHeight / 4

  propellantMass = 12000
  finLocked = true

  document.getElementById("welcomeView").style.transform = "translate(0, -100%)"

  app.start()

  toggleAllRaptors()
}