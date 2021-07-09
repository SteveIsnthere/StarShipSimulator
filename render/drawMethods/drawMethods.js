function initDrawingParams(size) {
    globalThis.drawingProportion = size

    globalThis.starShipDrawingHeight = drawingProportion * vehicleHeight
    globalThis.starShipDrawingWidth = drawingProportion * vehicleDiameter

    //fin
    globalThis.starShipFinThickness = starShipDrawingHeight * 12 / 818

    globalThis.starShipFrontFinDrawingStartingPos = starShipDrawingHeight * 299 / 818
    globalThis.starShipFrontFinDrawingLenghth = starShipDrawingHeight * 136 / 818
    globalThis.starShipFrontFinDrawingWidth = starShipDrawingHeight * 0.057
    globalThis.starShipFrontFinDrawingShortestSideLenghth = starShipFrontFinDrawingLenghth * 23 / 56

    globalThis.starShipAftFinDrawingStartingPos = starShipDrawingHeight * 159 / 818
    globalThis.starShipAftFinDrawingLenghth = starShipDrawingHeight * 247 / 818
    globalThis.starShipAftFinDrawingWidth = starShipDrawingHeight * 0.087
    globalThis.starShipAftFinDrawingShortestSideLenghth = starShipAftFinDrawingLenghth * 51 / 100

    //engine
    globalThis.starShipRaptorsYPos = (engineDistanceFromCenterOfMass) * drawingProportion

    globalThis.starShipRaptor1XPos = raptorN1offAxis * drawingProportion
    globalThis.starShipRaptor2XPos = raptorN2offAxis * drawingProportion
    globalThis.starShipRaptor3XPos = raptorN3offAxis * drawingProportion

    //
    screenAspectRatio = renderBoxWidth / renderBoxHeight

    renderBoxPhysicalHeight = vehicleHeight * vehicleVerticalPropotion
    renderBoxPhysicalWidth = renderBoxPhysicalHeight * screenAspectRatio

    initObjectsSize()

    function initObjectsSize() {
        globalThis.pigDrawingHeight = drawingProportion * pigHeight
        globalThis.pigDrawingWidth = drawingProportion * pigWidth

        globalThis.starhopperDrawingHeight = drawingProportion * starhopperHeight
        globalThis.starhopperDrawingWidth = drawingProportion * starhopperWidth

        globalThis.starBaseBackGroundDrawingHeight = drawingProportion * starBaseBackGroundHeight
        globalThis.starBaseBackGroundDrawingWidth = drawingProportion * starBaseBackGroundWidth

        globalThis.starBaseBackGround2DrawingHeight = drawingProportion * starBaseBackGround2Height
        globalThis.starBaseBackGround2DrawingWidth = drawingProportion * starBaseBackGround2Width

        globalThis.lunchpad_Light1DrawingHeight = drawingProportion * lunchpad_Light1Height
        globalThis.lunchpad_Light1DrawingWidth = drawingProportion * lunchpad_Light1Width

        globalThis.lunchpad_Light2DrawingHeight = drawingProportion * lunchpad_Light2Height
        globalThis.lunchpad_Light2DrawingWidth = drawingProportion * lunchpad_Light2Width

        globalThis.tree1DrawingHeight = drawingProportion * tree1Height
        globalThis.tree1DrawingWidth = drawingProportion * tree1Width

        globalThis.tree2DrawingHeight = drawingProportion * tree2Height
        globalThis.tree2DrawingWidth = drawingProportion * tree2Width
    }
}

function getInitSize() {
    let vehicleDrawingHeight = renderBoxHeight / vehicleVerticalPropotion

    let miniumVehicleDrawingHeight = 100
    let MaxVehicleDrawingHeight = 220
    if (vehicleDrawingHeight < miniumVehicleDrawingHeight) {
        vehicleVerticalPropotion = vehicleVerticalPropotion * vehicleDrawingHeight / miniumVehicleDrawingHeight
        vehicleDrawingHeight = miniumVehicleDrawingHeight
    }

    if (vehicleDrawingHeight > MaxVehicleDrawingHeight) {
        vehicleVerticalPropotion = vehicleVerticalPropotion * vehicleDrawingHeight / MaxVehicleDrawingHeight
        vehicleDrawingHeight = MaxVehicleDrawingHeight
    }

    return vehicleDrawingHeight / vehicleHeight

}


function updateDrawingSize() {
    if ((drawingSizeCurrent < drawingSize * 1.01) && (drawingSizeCurrent > drawingSize * 0.99)) {
        return
    } else if (drawingSizeCurrent < drawingSize) {
        drawingSizeCurrent *= 1.006
        vehicleVerticalPropotion /= 1.006
        initDrawingParams(drawingSizeCurrent)
    } else {
        drawingSizeCurrent *= 0.994
        vehicleVerticalPropotion /= 0.994
        initDrawingParams(drawingSizeCurrent)
    }
}


function updateRenderBoxPosition() {
    updateGroundObjectXPos()
    if (stickyCam) {
        updateSemi_StickyCam_Pos()
    } else {
        update_GroundCam_Pos()
    }
    
    if (altitude <= renderBoxPhysicalHeight * 0.5) {
        stickyCam = false
    } else {
        if (altitude <= renderBoxPhysicalHeight && speedY < 0) {
            stickyCam = false
        } else {
            stickyCam = true
        }
    }

    function updateSemi_StickyCam_Pos() {

        cam_AccX = camCenterizeAcc(cam_PosX, downRangeDistance, renderBoxPhysicalWidth * 0.25, renderBoxPhysicalWidth / 2, semi_StickyCam_AlignTime_Centerize) + camMatchSpeedAcc(cam_SpeedX, speedX, semi_StickyCam_AlignTime_MatchSpeed)
        cam_AccY = camCenterizeAcc(cam_PosY, altitude, renderBoxPhysicalHeight * 0.25, renderBoxPhysicalHeight / 2, semi_StickyCam_AlignTime_Centerize) + camMatchSpeedAcc(cam_SpeedY, speedY, semi_StickyCam_AlignTime_MatchSpeed)
        
        update_Pos()

        function update_Pos() {
            cam_SpeedX += cam_AccX / renderTimeInterval
            cam_SpeedY += cam_AccY / renderTimeInterval

            cam_PosX += cam_SpeedX / renderTimeInterval
            cam_PosY += cam_SpeedY / renderTimeInterval

            if (cam_PosY < renderBoxPhysicalHeight * 0.5) {
                cam_PosY = renderBoxPhysicalHeight * 0.5
            }

        }

    }

    function update_GroundCam_Pos() {
        
        cam_AccX = camCenterizeAcc(cam_PosX, downRangeDistance, renderBoxPhysicalWidth * 0.25, renderBoxPhysicalWidth / 2, semi_StickyCam_AlignTime_Centerize) + camMatchSpeedAcc(cam_SpeedX, speedX, semi_StickyCam_AlignTime_MatchSpeed*2)
        
        cam_SpeedX += cam_AccX / renderTimeInterval

        cam_PosX += cam_SpeedX / renderTimeInterval

        cam_SpeedY = 0 

        if (cam_PosY != renderBoxPhysicalHeight * 0.5) {
            
            cam_PosY = renderBoxPhysicalHeight * 0.5
        }

    }

    function updateGroundObjectXPos() {

        if (!inDrawingBox(pigXpos,pigWidth)) {
            if (speedX>0) {
                pigXpos = cam_PosX + renderBoxPhysicalWidth*0.5 + pigWidth*0.5
            }else{
                pigXpos = cam_PosX - renderBoxPhysicalWidth*0.5 - pigWidth*0.5
            }
        }

        if (!inDrawingBox(tree1Xpos,tree1Width)) {
            if (speedX>0) {
                tree1Xpos = cam_PosX + renderBoxPhysicalWidth*0.5 + tree1Width*0.5
            }else{
                tree1Xpos = cam_PosX - renderBoxPhysicalWidth*0.5 - tree1Width*0.5
            }
        }

        if (!inDrawingBox(tree2Xpos,tree2Width)) {
            if (speedX>0) {
                tree2Xpos = cam_PosX + renderBoxPhysicalWidth*0.5 + tree2Width*0.5
            }else{
                tree2Xpos = cam_PosX - renderBoxPhysicalWidth*0.5 - tree2Width*0.5
            }
        }
    }

}

function camCenterizeAcc(currentPos, targetPos, posDifferenceThreshold, posDifferenceMax, timeNeededToAlign) {

    let posDifference = targetPos - currentPos

    let goalAcc

    if (Math.abs(posDifference) < posDifferenceThreshold) {

        goalAcc = posDifference / timeNeededToAlign
    } else if (Math.abs(posDifference) < posDifferenceMax) {
        goalAcc = posDifference / timeNeededToAlign * ((posDifferenceMax - posDifferenceThreshold) / (posDifferenceMax - Math.abs(posDifference)))
    } else {
        goalAcc = 0
        fixedMode()
    }
    return goalAcc


    function fixedMode() {
        cam_PosX = downRangeDistance
        cam_PosY = altitude
    }
}

function camMatchSpeedAcc(currentSpeed, targetSpeed, timeNeededToAlign) {
    let speedDifference = targetSpeed - currentSpeed

    let goalAcc = speedDifference / timeNeededToAlign

    return goalAcc
}

function windowResize() {
    renderBoxWidth = window.innerWidth
    renderBoxHeight = window.innerHeight

    drawingSize = getInitSize()
    drawingSizeCurrent = drawingSize

    initDrawingParams(drawingSizeCurrent)

    app.renderer.resize(renderBoxWidth, renderBoxHeight);
}


function getObjectDrawingPosX(posX) {
    return (posX - cam_PosX) * drawingSizeCurrent + renderBoxWidth * 0.5
}

function getObjectDrawingPosY(posY) {
    return (cam_PosY - posY) * drawingSizeCurrent + renderBoxHeight * 0.5
}

function inDrawingBox(x,width){
    return (cam_PosX+renderBoxPhysicalWidth*0.5+width*0.5>x)&&(cam_PosX-renderBoxPhysicalWidth*0.5-width*0.5<x)
}