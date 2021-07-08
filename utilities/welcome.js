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
        landed = false
        propellantMass = 350000
      }
    }
  }
}

function initDemoAutoLand() {
  globalThis.demoAutoLandOn = true
  globalThis.demoAutoLanddistanceToGround
}

initDemoAutoLand()


altitude = renderBoxPhysicalHeight
speedY = -renderBoxPhysicalHeight/4

propellantMass = 12000
finLocked = true

toggleAllRaptors()