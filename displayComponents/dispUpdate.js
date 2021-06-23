function updateFlightParamDisp() {
    if (usedTime % 5 == 0) {
        //alttitude
        if (altitude < 1000) {
            document.getElementById("altitudeDisp").textContent = altitude.toFixed(0) + "M";
        } else {
            document.getElementById("altitudeDisp").textContent = (altitude * 0.001).toFixed(1) + "KM";
        }
        //propellent
        document.getElementById("propellantMassDisp").textContent = (propellantMass * 0.001).toFixed(0);
        //speed
        if (trueSpeed < 1000) {
            document.getElementById("speedDisp").textContent = trueSpeed.toFixed(0) + "M/S";
        } else {
            document.getElementById("speedDisp").textContent = (trueSpeed * 0.001).toFixed(1) + "KM/S";
        }
        //twr
        document.getElementById("twrDisp").textContent = twr.toFixed(1);
        //speedX
        document.getElementById("speedX").textContent = Math.ceil(speedX);
        //speedY
        document.getElementById("speedY").textContent = Math.ceil(speedY);
        //g
        document.getElementById("gforece").textContent = (totalAcceleration / gravity).toFixed(1);
        //ToSite
        let disToSite = Math.ceil(downRangeDistance - starBaseXpos)
        if (disToSite < 1000) {
            document.getElementById("distanceToLandingSite").textContent = disToSite + " m";
        } else {
            document.getElementById("distanceToLandingSite").textContent = (disToSite*0.001).toFixed(1) + " km";
        }

        //restartButton
        if (landed || crashed || inFightBreakUp || fuelRunOut) {
            document.getElementById("RestartBtn").style.display = "initial"
            document.getElementById("dataRecorderButton").style.display = "initial"
        }
    }
}

//check platform
if (typeof window.orientation == 'undefined') {
    //desktop
} else {
    //mobile
    if(checkIsiOS()){
        document.getElementById("requestTiltPermission").style.display = "initial"
    }

    layoutChangeForMobile()

    function layoutChangeForMobile(){
        document.getElementById("attitudeControl").style.display = "none"

        document.getElementById("engineControl").style.setProperty('bottom', 'calc(45% - 50px)');
        
        let allBtn = document.getElementsByClassName("engineControlBtn")

        for(n = 0;n<allBtn.length;n++){
            allBtn[n].style.padding = "5px"
        }
    }
}