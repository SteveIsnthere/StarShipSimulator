function finalSetupAndRun() {



    app.ticker.add((delta) => {
        // rotate the starShip!
        // use delta to create frame-independent transform

        updateBackEnd()

        updateFlightParamDisp()

        updateSize()

        updateDrawingSize()

        updateRenderBoxPosition()

        drawStarBase()

        drawGroundObjects()

        drawStarShip()

        drawStarShipEffects()

        drawWorldEffects()

        fx.update(delta);

        function drawGroundObjects() {
            drawPig()
            drawTree1()
            drawTree2()

            function drawPig() {
                pig.x = getObjectDrawingPosX(pigXpos)
                pig.y = getObjectDrawingPosY(0)

                pig.width = pigDrawingWidth;
                pig.height = pigDrawingHeight;
            }

            function drawTree1() {
                tree1.x = getObjectDrawingPosX(tree1Xpos)
                tree1.y = getObjectDrawingPosY(0)

                tree1.width = tree1DrawingWidth;
                tree1.height = tree1DrawingHeight;
            }

            function drawTree2() {
                tree2.x = getObjectDrawingPosX(tree2Xpos)
                tree2.y = getObjectDrawingPosY(0)

                tree2.width = tree2DrawingWidth;
                tree2.height = tree2DrawingHeight;
            }
        }

        function drawStarBase() {
            drawStarhopper()
            drawStarBaseBackGrounds()
            drawlunchpad_Lights()


            function drawStarhopper() {
                starhopper.x = getObjectDrawingPosX(starhopperXpos)
                starhopper.y = getObjectDrawingPosY(0)

                starhopper.width = starhopperDrawingWidth;
                starhopper.height = starhopperDrawingHeight;
            }

            function drawStarBaseBackGrounds() {
                starBaseBackGround.x = getObjectDrawingPosX(starBaseBackGroundXpos)
                starBaseBackGround.y = getObjectDrawingPosY(0)

                starBaseBackGround.width = starBaseBackGroundDrawingWidth;
                starBaseBackGround.height = starBaseBackGroundDrawingHeight;

                starBaseBackGround2.x = getObjectDrawingPosX(starBaseBackGround2Xpos)
                starBaseBackGround2.y = getObjectDrawingPosY(0)

                starBaseBackGround2.width = starBaseBackGround2DrawingWidth;
                starBaseBackGround2.height = starBaseBackGround2DrawingHeight;
            }

            function drawlunchpad_Lights() {
                lunchpad_Light1.x = getObjectDrawingPosX(lunchpad_Light1Xpos)
                lunchpad_Light1.y = getObjectDrawingPosY(0)

                lunchpad_Light1.width = lunchpad_Light1DrawingWidth;
                lunchpad_Light1.height = lunchpad_Light1DrawingHeight;

                lunchpad_Light2.x = getObjectDrawingPosX(lunchpad_Light2Xpos)
                lunchpad_Light2.y = getObjectDrawingPosY(0)

                lunchpad_Light2.width = lunchpad_Light2DrawingWidth;
                lunchpad_Light2.height = lunchpad_Light2DrawingHeight;
            }

        }

        function updateSize() {
            if (onIosPwa) {
                if (usedTime % 5 == 0) {
                    if (renderBoxWidth != window.innerWidth || renderBoxHeight != window.innerHeight) {
                        windowResize()
                    }
                }
            }

        }

        function drawStarShipEffects() {
            drawAeroTrail()
            drawAeroheat()
            drawGroundSmoke()
            drawSonicBoom()
            drawBreakUp()
            drawCrash()


            function drawAeroTrail() {
                if (dynamicPressure > 0.2) {
                    aeroTrailEmitter.paused = false;
                    aeroTrail.x = (-starShipAftFinDrawingWidth + starShipFinThickness) * (1 - aftFinEffectiveAreaFraction) - starShipFinThickness;
                    aeroTrail.y = starShipAftFinDrawingStartingPos + starShipAftFinDrawingLenghth;
                    aeroTrail.rotation = -angleOfAttack
                    if (dynamicPressure < 2) {
                        aeroTrailEmitter.init(aeroTrail, true, drawingProportion * 0.1 * dynamicPressure * 0.5);
                    } else {
                        aeroTrailEmitter.init(aeroTrail, true, drawingProportion * 0.1 * 1);
                    }
                } else {
                    aeroTrailEmitter.paused = true;
                }
            }

            function drawGroundSmoke() {
                let scale
                scale = (1 - altitude / 200) * drawingProportion / 4.2
                if (scale < 0.1 || thrust <= 0 || pitch < -Math.PI * 0.15 || pitch > Math.PI * 0.15) {
                    groundSmokeEmitter.paused = true;
                } else {
                    groundSmokeEmitter.paused = false;
                    groundSmoke.x = getObjectDrawingPosX(downRangeDistance)
                    groundSmoke.y = getObjectDrawingPosY(0)
                    groundSmokeEmitter.init(groundSmoke, true, scale);

                }
            }

            function drawSonicBoom() {
                if (dynamicPressure < 25) {
                    sonicboomEmitter.paused = true;
                } else {
                    let scale
                    if (dynamicPressure < 50) {
                        scale = drawingProportion * 0.04 * (dynamicPressure - 25) * 0.1
                    } else {
                        scale = 1
                    }

                    sonicboomEmitter.paused = false;
                    sonicboom.rotation = -angleOfAttack
                    sonicboomEmitter.init(sonicboom, true, scale);
                }
            }

            function drawAeroheat() {
                if (thermalPower < 5) {
                    aeroheat0Emitter.paused = true;
                    aeroheat1Emitter.paused = true;
                    aeroheat2Emitter.paused = true;
                    aeroheat3Emitter.paused = true;
                    aeroheat4Emitter.paused = true;
                    heatboomEmitter.paused = true;
                } else {
                    let scale
                    if (thermalPower * 0.01 * 2.85 < 1) {
                        scale = drawingProportion * 0.1 * thermalPower * 0.0285 * 1.5
                    } else {
                        scale = drawingProportion * 0.1 * 1.5
                    }

                    aeroheat0Emitter.paused = false;
                    aeroheat0.x = 0;
                    aeroheat0.y = 0.4 * starShipDrawingHeight;
                    aeroheat0.rotation = -angleOfAttack
                    aeroheat0Emitter.init(aeroheat0, true, scale);

                    aeroheat1Emitter.paused = false;
                    aeroheat1.x = 0;
                    aeroheat1.y = 0.2 * starShipDrawingHeight;
                    aeroheat1.rotation = -angleOfAttack
                    aeroheat1Emitter.init(aeroheat1, true, scale);

                    aeroheat2Emitter.paused = false;
                    aeroheat2.x = 0;
                    aeroheat2.y = 0;
                    aeroheat2.rotation = -angleOfAttack
                    aeroheat2Emitter.init(aeroheat2, true, scale);

                    aeroheat3Emitter.paused = false;
                    aeroheat3.x = 0;
                    aeroheat3.y = -0.2 * starShipDrawingHeight;
                    aeroheat3.rotation = -angleOfAttack
                    aeroheat3Emitter.init(aeroheat3, true, scale);

                    aeroheat4Emitter.paused = false;
                    aeroheat4.x = 0;
                    aeroheat4.y = -0.4 * starShipDrawingHeight;
                    aeroheat4.rotation = -angleOfAttack
                    aeroheat4Emitter.init(aeroheat4, true, scale);

                    heatboomEmitter.paused = false;
                    heatboom.rotation = -angleOfAttack
                    heatboomEmitter.init(heatboom, true, scale + 0.7 * drawingProportion * 0.1);

                }

            }

            function drawCrash() {
                if (crashed) {
                    if (!showedCrashEffect) {
                        globalThis.crash = new PIXI.Container();

                        globalThis.crashEmitter = fx.getParticleEmitter('top-big-explosion');

                        starShipAndEffects.addChild(crash)

                        crashEmitter.paused = false;
                        crash.x = 0;
                        crash.y = 0
                        crashEmitter.init(crash, true, drawingProportion * 0.1);

                        showedCrashEffect = true
                    } else {
                        starShipBody.alpha = 0
                        frontFin.clear();
                        aftFin.clear();

                        breakupsmokeEmitter.paused = true;
                        crashsmokeEmitter.paused = false;
                        crashsmoke.x = 0
                        crashsmoke.y = 0.5 * starShipDrawingHeight
                        crashsmokeEmitter.init(crashsmoke, true, drawingProportion * 0.1);
                    }
                } else {
                    crashsmokeEmitter.paused = true;
                }
            }

            function drawBreakUp() {
                if (inFightBreakUp) {
                    if (!showedinFightBreakUpEffect) {
                        globalThis.breakup = new PIXI.Container();

                        globalThis.breakupEmitter = fx.getParticleEmitter('top-big-explosion');

                        starShipAndEffects.addChild(breakup)

                        breakupEmitter.paused = false;
                        breakup.x = 0;
                        breakup.y = 0
                        breakupEmitter.init(breakup, true, drawingProportion * 0.1);

                        showedinFightBreakUpEffect = true
                    } else {
                        starShipBody.alpha = 0
                        frontFin.clear();
                        aftFin.clear();
                        aeroTrailEmitter.paused = true;
                        aeroheat0Emitter.paused = true;
                        aeroheat1Emitter.paused = true;
                        aeroheat2Emitter.paused = true;
                        aeroheat3Emitter.paused = true;
                        aeroheat4Emitter.paused = true;

                        breakupsmokeEmitter.paused = false;
                        breakupsmoke.rotation = -angleOfAttack
                        breakupsmoke.x = 0
                        breakupsmoke.y = 0
                        breakupsmokeEmitter.init(breakupsmoke, true, drawingProportion * 0.1);
                    }
                } else {
                    breakupsmokeEmitter.paused = true;
                }
            }
        }

        function drawWorldEffects() {
            //space
            if (altitude > 100000) {
                spaceEffectEmitter.paused = false;
                spaceEffect.x = renderBoxWidth * 0.5
                spaceEffect.y = renderBoxHeight * 0.5
                spaceEffectEmitter.init(spaceEffect, true, 1);
            } else {
                spaceEffectEmitter.paused = true;
            }

            //cloud
            clouds.x = getObjectDrawingPosX(starBaseBackGround2Xpos)
            clouds.y = getObjectDrawingPosY(25)

            //fireExtinguisher
            if (landed) {
                fireExtinguisherEmitter.paused = false;
                fireExtinguisher.x = getObjectDrawingPosX(lunchpad_Light1Xpos)
                fireExtinguisher.y = getObjectDrawingPosY(2)
                fireExtinguisherEmitter.init(fireExtinguisher, true, drawingProportion * 0.1 * 1);
            } else {
                fireExtinguisherEmitter.paused = true;
            }

        }

        function drawStarShip() {

            updateDrawingPosition()

            drawStarShipBody()
            drawPluming()
            drawColdGas()
            drawFrontFin()
            drawAftFin()
            drawFuelDump()

            function updateDrawingPosition() {
                starShipAndEffects.rotation = pitch;

                starShipAndEffects.x = getObjectDrawingPosX(downRangeDistance)
                starShipAndEffects.y = getObjectDrawingPosY(altitude)
            }

            function drawStarShipBody() {
                starShipBody.alpha = 1
                starShipBody.width = starShipDrawingWidth;
                starShipBody.height = starShipDrawingHeight;
            }

            function drawFrontFin() {
                frontFin.clear();
                frontFin.beginFill(202022);
                frontFin.moveTo(0, -starShipFrontFinDrawingStartingPos);
                frontFin.lineTo(-starShipFinThickness, -starShipFrontFinDrawingStartingPos);
                frontFin.lineTo((-starShipFrontFinDrawingWidth + starShipFinThickness) * (1 - frontFinEffectiveAreaFraction) - starShipFinThickness, -starShipFrontFinDrawingStartingPos + starShipFrontFinDrawingShortestSideLenghth);
                frontFin.lineTo((-starShipFrontFinDrawingWidth + starShipFinThickness) * (1 - frontFinEffectiveAreaFraction) - starShipFinThickness, -starShipFrontFinDrawingStartingPos + starShipFrontFinDrawingShortestSideLenghth);
                frontFin.lineTo((-starShipFrontFinDrawingWidth + starShipFinThickness) * (1 - frontFinEffectiveAreaFraction) - starShipFinThickness, -starShipFrontFinDrawingStartingPos + starShipFrontFinDrawingLenghth);
                frontFin.lineTo(-starShipFinThickness, -starShipFrontFinDrawingStartingPos + starShipFrontFinDrawingLenghth);
                frontFin.lineTo(0, -starShipFrontFinDrawingStartingPos + starShipFrontFinDrawingLenghth);
                frontFin.closePath();
            }

            function drawAftFin() {
                aftFin.clear();
                aftFin.beginFill(202022);
                aftFin.moveTo(0, starShipAftFinDrawingStartingPos);
                aftFin.lineTo(-starShipFinThickness, starShipAftFinDrawingStartingPos);
                aftFin.lineTo((-starShipAftFinDrawingWidth + starShipFinThickness) * (1 - aftFinEffectiveAreaFraction) - starShipFinThickness, starShipAftFinDrawingStartingPos + starShipAftFinDrawingShortestSideLenghth);
                aftFin.lineTo((-starShipAftFinDrawingWidth + starShipFinThickness) * (1 - aftFinEffectiveAreaFraction) - starShipFinThickness, starShipAftFinDrawingStartingPos + starShipAftFinDrawingShortestSideLenghth);
                aftFin.lineTo((-starShipAftFinDrawingWidth + starShipFinThickness) * (1 - aftFinEffectiveAreaFraction) - starShipFinThickness, starShipAftFinDrawingStartingPos + starShipAftFinDrawingLenghth);
                aftFin.lineTo(-starShipFinThickness, starShipAftFinDrawingStartingPos + starShipAftFinDrawingLenghth);
                aftFin.lineTo(0, starShipAftFinDrawingStartingPos + starShipAftFinDrawingLenghth);
                aftFin.closePath();
            }

            function drawPluming() {

                let drawingSize = (0.14 + (throttleCurrent * 0.00055)) * drawingProportion


                if (raptorN1Running) {
                    raptor1PlumeEmitter.paused = false;
                    raptor1Plume.rotation = -gimbolPosition * gimbolAngleLimit * 0.01
                    raptor1Plume.x = starShipRaptor1XPos;
                    raptor1Plume.y = starShipRaptorsYPos;
                    raptor1PlumeEmitter.init(raptor1Plume, true, drawingSize);
                } else {
                    raptor1PlumeEmitter.paused = true;
                }

                if (raptorN2Running) {
                    raptor2PlumeEmitter.paused = false;
                    raptor2Plume.rotation = -gimbolPosition * gimbolAngleLimit * 0.01
                    raptor2Plume.x = starShipRaptor2XPos;
                    raptor2Plume.y = starShipRaptorsYPos;
                    raptor2PlumeEmitter.init(raptor2Plume, true, drawingSize);
                } else {
                    raptor2PlumeEmitter.paused = true;
                }

                if (raptorN3Running) {
                    raptor3PlumeEmitter.paused = false;
                    raptor3Plume.rotation = -gimbolPosition * gimbolAngleLimit * 0.01
                    raptor3Plume.x = starShipRaptor3XPos;
                    raptor3Plume.y = starShipRaptorsYPos;
                    raptor3PlumeEmitter.init(raptor3Plume, true, drawingSize);
                } else {
                    raptor3PlumeEmitter.paused = true;
                }

            }


            function drawColdGas() {
                if (rcsThrust > 0) {
                    coldGasPlumeEmitter.paused = false;
                    coldGasPlume.x = 0
                    coldGasPlume.y = -starShipDrawingHeight / 2 * 0.75;
                    coldGasPlume.rotation = Math.PI / 1.8
                    coldGasPlumeEmitter.init(coldGasPlume, true, drawingProportion * 0.1 * 1);

                } else if (rcsThrust < 0) {
                    coldGasPlumeEmitter.paused = false;
                    coldGasPlume.x = -starShipDrawingWidth / 2;
                    coldGasPlume.y = starShipDrawingHeight / 2 * 0.8;
                    coldGasPlume.rotation = Math.PI / 2.2
                    coldGasPlumeEmitter.init(coldGasPlume, true, drawingProportion * 0.1 * 1);
                } else {
                    coldGasPlumeEmitter.paused = true;
                }
            }

            function drawFuelDump() {
                if (dumpingFuel) {
                    fueldumpEmitter.paused = false;
                    fueldump.x = -starShipDrawingWidth / 2;
                    fueldump.y = 0.1 * starShipDrawingHeight;
                    fueldumpEmitter.init(fueldump, true, drawingProportion * 0.1 * 1);

                } else {
                    fueldumpEmitter.paused = true;
                }
            }
        }

    });
}