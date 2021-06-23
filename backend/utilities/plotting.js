const plotStyle = {
    responsive: true,
    displayModeBar: false
}
function plot() {
    let timeNodesCopy = timeNodes
    timeNodesCopy = timeNodesCopy.map(x => x / renderTimeInterval)

    altitudePlot()
    flyPathPlot()
    motionSpeedPlot()
    motionAnglePlot()
    aerodynamicForcePlot()
    accelerationPlot()
    thermalPower_dynamicPressurePlot()
    controlInPutPlot()

    function motionAnglePlot() {

        var pitch = {
            x: timeNodesCopy,
            y: listOfPitchAngle,
            type: 'scatter',
            name: 'pitch'
        };

        var angleOfMotion = {
            x: timeNodesCopy,
            y: listOfAngleOfMotion,
            type: 'scatter',
            name: 'angleOfMotion'
        };

        var angleOfAttack = {
            x: timeNodesCopy,
            y: listOfAngleOfAttack,
            type: 'scatter',
            name: 'angleOfAttack'
        };

        var angleInToTheWind = {
            x: timeNodesCopy,
            y: listOfAngleInToTheWind,
            type: 'scatter',
            name: 'angleInToTheWind'
        };

        var data = [pitch, angleOfMotion, angleOfAttack, angleInToTheWind];

        var layout = {
            title: 'motionAnglePlot'
        }

        Plotly.newPlot('motionAnglePlot', data, layout, plotStyle);
    }

    function motionSpeedPlot() {

        let listOfSpeedYCopy = listOfSpeedY

        var speedx = {
            x: timeNodesCopy,
            y: listOfSpeedX,
            type: 'scatter',
            name: 'speedX'
        };

        var speedy = {
            x: timeNodesCopy,
            y: listOfSpeedYCopy.map(x => Math.abs(x)),
            type: 'scatter',
            name: 'speedY'
        };

        var speed = {
            x: timeNodesCopy,
            y: listOfSpeed,
            type: 'scatter',
            name: 'speed'
        };


        var data = [speedx, speedy, speed];

        var layout = {
            title: 'motionSpeedPlot'
        }

        Plotly.newPlot('motionSpeedPlot', data, layout, plotStyle);
    }


    function aerodynamicForcePlot() {

        var aerodynamicDrag = {
            x: timeNodesCopy,
            y: listOfaerodynamicDrag,
            type: 'scatter',
            name: 'aerodynamicDrag'
        };

        var aerodynamicLift = {
            x: timeNodesCopy,
            y: listOfaerodynamicLift,
            type: 'scatter',
            name: 'aerodynamicLift'
        };



        var data = [aerodynamicDrag, aerodynamicLift];

        var layout = {
            title: 'aerodynamicForcePlot'
        }

        Plotly.newPlot('aerodynamicForcePlot', data, layout, plotStyle);
    }

    function altitudePlot() {

        var altitude = {
            x: timeNodesCopy,
            y: listOfAltitude,
            mode: 'lines',
            line: {
                color: 'rgb(128, 0, 128)',
                width: 2
            },
            type: 'scatter',
            name: 'altitude'
        };



        var data = [altitude];

        var layout = {
            title: 'altitudePlot'
        }

        Plotly.newPlot('altitudePlot', data, layout, plotStyle);
    }

    function flyPathPlot() {
        let listOfDownRangeDistanceCopy = listOfDownRangeDistance

        var flyPath = {
            x: listOfDownRangeDistanceCopy,
            y: listOfAltitude,
            type: 'scatter',
            name: 'flyPath'
        };

        var data = [flyPath];

        var layout = {
            title: 'flyPath',
            y: {
                scaleratio: 1,
            },
        }

        Plotly.newPlot('flyPathPlot', data, layout, plotStyle);
    }

    function accelerationPlot() {

        let listOfAccelerationCopy = listOfAcceleration
        let listOfAccelerationXCopy = listOfAccelerationX
        let listOfAccelerationYCopy = listOfAccelerationY

        var acceleration = {
            x: timeNodesCopy,
            y: listOfAccelerationCopy.map(x => x / gravity),
            type: 'scatter',
            name: 'acceleration'
        };
        var accelerationX = {
            x: timeNodesCopy,
            y: listOfAccelerationXCopy.map(x => x / gravity),
            type: 'scatter',
            name: 'accelerationX'
        };
        var accelerationY = {
            x: timeNodesCopy,
            y: listOfAccelerationYCopy.map(x => x / gravity),
            type: 'scatter',
            name: 'accelerationY'
        };



        var data = [acceleration, accelerationX, accelerationY];

        var layout = {
            title: 'accelerationPlot'
        }

        Plotly.newPlot('accelerationPlot', data, layout, plotStyle);
    }

    function motionSpeedPlot() {

        var speedx = {
            x: timeNodesCopy,
            y: listOfSpeedX,
            type: 'scatter',
            name: 'speedX'
        };

        var speedy = {
            x: timeNodesCopy,
            y: listOfSpeedY,
            type: 'scatter',
            name: 'speedY'
        };

        var speed = {
            x: timeNodesCopy,
            y: listOfSpeed,
            type: 'scatter',
            name: 'speed'
        };


        var data = [speedx, speedy, speed];

        var layout = {
            title: 'motionSpeedPlot'
        }

        Plotly.newPlot('motionSpeedPlot', data, layout, plotStyle);
    }


    function thermalPower_dynamicPressurePlot() {

        var thermalPower = {
            x: timeNodesCopy,
            y: listOfThermalPower,
            type: 'scatter',
            name: 'thermalPower'
        };

        var dynamicPressure = {
            x: timeNodesCopy,
            y: listOfDynamicPressure,
            type: 'scatter',
            name: 'dynamicPressure'
        };



        var data = [thermalPower, dynamicPressure];

        var layout = {
            title: 'thermalPower&dynamicPressurePlot'
        }

        Plotly.newPlot('thermalPower_dynamicPressurePlot', data, layout, plotStyle);
    }

    function controlInPutPlot() {

        var pitchOutPut = {
            x: timeNodesCopy,
            y: listOfPitchControl,
            type: 'scatter',
            name: 'pitchOutPut'
        };
        var throttleOutPut = {
            x: timeNodesCopy,
            y: listOfThrottle,
            type: 'scatter',
            name: 'throttleOutPut'
        };

        var data = [pitchOutPut, throttleOutPut];

        var layout = {
            title: 'controlInPutPlot'
        }

        Plotly.newPlot('controlInPutPlot', data, layout, plotStyle);
    }
}

