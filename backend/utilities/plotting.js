const plotStyle = {
    responsive: true,
    displayModeBar: false
}

let plotBGcolor = "rgba(255, 255, 255, 0.785)"
let paperBGcolor = "rgba(246, 246, 246, 0.74)"

function plot() {
    let timeNodesCopy = timeNodes
    timeNodesCopy = timeNodesCopy.map(x => x / frameRate)

    altitudePlot()
    flyPathPlot()
    motionSpeedPlot()
    motionAnglePlot()
    aerodynamicForcePlot()
    accelerationPlot()
    thermalPower_dynamicPressurePlot()
    propellentPlot()
    controlInPutPlot()

    function motionAnglePlot() {

        var pitch = {
            x: timeNodesCopy,
            y: listOfPitchAngle,
            type: 'scatter',
            name: 'Pitch'
        };

        var angleOfMotion = {
            x: timeNodesCopy,
            y: listOfAngleOfMotion,
            type: 'scatter',
            name: 'AngleOfMotion'
        };

        var angleOfAttack = {
            x: timeNodesCopy,
            y: listOfAngleOfAttack,
            type: 'scatter',
            name: 'AngleOfAttack'
        };

        var angleInToTheWind = {
            x: timeNodesCopy,
            y: listOfAngleInToTheWind,
            type: 'scatter',
            name: 'AngleInToTheWind'
        };

        var data = [pitch, angleOfMotion, angleOfAttack, angleInToTheWind];

        var layout = {
            title: 'Angle in Radian',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('motionAnglePlot', data, layout, plotStyle);
    }




    function aerodynamicForcePlot() {

        var aerodynamicDrag = {
            x: timeNodesCopy,
            y: listOfaerodynamicDrag,
            type: 'scatter',
            name: 'Drag(N)'
        };

        var aerodynamicLift = {
            x: timeNodesCopy,
            y: listOfaerodynamicLift,
            type: 'scatter',
            name: 'Lift(N)'
        };



        var data = [aerodynamicDrag, aerodynamicLift];

        var layout = {
            title: 'AerodynamicForce',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('aerodynamicForcePlot', data, layout, plotStyle);
    }

    function propellentPlot() {
        let listOfpropellentRemainingCopy = listOfpropellentRemaining
        listOfpropellentRemainingCopy = listOfpropellentRemainingCopy.map(x => x / 1000)

        var propellentRemaining = {
            x: timeNodesCopy,
            y: listOfpropellentRemainingCopy,
            fill: 'tonexty',
            type: 'scatter',
            mode: 'none'
        };


        var data = [propellentRemaining];

        var layout = {
            title: 'Propellent in tons',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('propellentRemainingPlot', data, layout, plotStyle);
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
            name: 'Altitude(M)'
        };



        var data = [altitude];

        var layout = {
            title: 'Altitude',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('altitudePlot', data, layout, plotStyle);
    }

    function flyPathPlot() {
        let listOfDownRangeDistanceCopy = listOfDownRangeDistance

        var flyPath = {
            x: listOfDownRangeDistanceCopy.map(x => getDownRangeDistance(x)),
            y: listOfAltitude,
            type: 'scatter',
            name: 'FlyPath'
        };

        var data = [flyPath];

        var layout = {
            title: 'FlyPath',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor,

            xaxis: {
                nticks: 10,
                title: "Downrange Distance(M)"
            },
            yaxis: {
                scaleanchor: "x",
                title: "Altitude(M)"
            },
        }

        Plotly.newPlot('flyPathPlot', data, layout, plotStyle);

        function getDownRangeDistance(downRangeDistance) {
            return downRangeDistance - starBaseXpos
        }
    }

    function accelerationPlot() {

        var acceleration = {
            x: timeNodesCopy,
            y: listOfAcceleration,
            type: 'scatter',
            name: 'Acc(G)'
        };
        var accelerationX = {
            x: timeNodesCopy,
            y: listOfAccelerationX,
            type: 'scatter',
            name: 'AccX(G)'
        };
        var accelerationY = {
            x: timeNodesCopy,
            y: listOfAccelerationY,
            type: 'scatter',
            name: 'AccY(G)'
        };



        var data = [acceleration, accelerationX, accelerationY];

        var layout = {
            title: 'Acceleration',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('accelerationPlot', data, layout, plotStyle);
    }

    function motionSpeedPlot() {

        var speedx = {
            x: timeNodesCopy,
            y: listOfSpeedX,
            type: 'scatter',
            name: 'SpeedX'
        };

        var speedy = {
            x: timeNodesCopy,
            y: listOfSpeedY,
            type: 'scatter',
            name: 'SpeedY'
        };

        var speed = {
            x: timeNodesCopy,
            y: listOfSpeed,
            type: 'scatter',
            name: 'Speed'
        };


        var data = [speedx, speedy, speed];

        var layout = {
            title: 'Speed in M/S',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('motionSpeedPlot', data, layout, plotStyle);
    }


    function thermalPower_dynamicPressurePlot() {

        var thermalPower = {
            x: timeNodesCopy,
            y: listOfThermalPower,
            type: 'scatter',
            name: 'Heating(KW)'
        };

        var dynamicPressure = {
            x: timeNodesCopy,
            y: listOfDynamicPressure,
            type: 'scatter',
            name: 'DynamicPressure(PSI)'
        };

        var data = [thermalPower, dynamicPressure];

        var layout = {
            title: 'Heating&DynamicPressure',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('thermalPower_dynamicPressurePlot', data, layout, plotStyle);
    }

    function controlInPutPlot() {

        var pitchOutPut = {
            x: timeNodesCopy,
            y: listOfPitchControl,
            type: 'scatter',
            name: 'PitchInPut(%)'
        };
        var throttleOutPut = {
            x: timeNodesCopy,
            y: listOfThrottle,
            type: 'scatter',
            name: 'ThrottleInPut(%)'
        };

        var data = [pitchOutPut, throttleOutPut];

        var layout = {
            title: 'ControlInPut',
            plot_bgcolor: plotBGcolor,
            paper_bgcolor: paperBGcolor
        }

        Plotly.newPlot('controlInPutPlot', data, layout, plotStyle);
    }
}

