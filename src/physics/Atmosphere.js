moduleLoader.define('atmosphere', ['state'], (state) => {
    
    class Atmosphere {
        constructor() {
            this.state = state;
        }

        updateAtmosphere() {
            const altitude = this.state.get('flight.altitude');
            
            if (altitude < 11000) {
                this.calculateTroposphere(altitude);
            } else if (altitude < 20000) {
                this.calculateLowerStratosphere(altitude);
            } else {
                this.calculateUpperStratosphere(altitude);
            }
        }

        calculateTroposphere(altitude) {
            const airTemperature = 15.04 - 0.00649 * altitude;
            const airPressure = 101.29 * Math.pow((airTemperature + 273.1) / 288.08, 5.256);
            const airDensity = this.getDensity(airPressure, airTemperature);

            this.state.set('world.airTemperature', airTemperature);
            this.state.set('world.airPressure', airPressure);
            this.state.set('world.airDensity', airDensity);
        }

        calculateLowerStratosphere(altitude) {
            const airTemperature = -56.46;
            const airPressure = 22.65 * Math.exp(1.73 - 0.000157 * altitude);
            const airDensity = this.getDensity(airPressure, airTemperature);

            this.state.set('world.airTemperature', airTemperature);
            this.state.set('world.airPressure', airPressure);
            this.state.set('world.airDensity', airDensity);
        }

        calculateUpperStratosphere(altitude) {
            const airTemperature = -131.21 + 0.0299 * altitude;
            const airPressure = 2.488 * Math.pow((airTemperature + 273.1) / 216.6, -11.388);
            const airDensity = this.getDensity(airPressure, airTemperature);

            this.state.set('world.airTemperature', airTemperature);
            this.state.set('world.airPressure', airPressure);
            this.state.set('world.airDensity', airDensity);
        }

        getDensity(airPressure, airTemperature) {
            return airPressure / (0.2869 * (airTemperature + 273.1));
        }

        getDynamicPressure() {
            const airDensity = this.state.get('world.airDensity');
            const trueSpeed = this.state.get('flight.trueSpeed');
            const dynamicPressure = airDensity * trueSpeed ** 2 * 0.0005;
            
            this.state.set('flight.dynamicPressure', dynamicPressure);
            return dynamicPressure;
        }

        getReentryHeatPower(vehicleNoseRadius = 4.5) {
            const trueSpeed = this.state.get('flight.trueSpeed');
            const airDensity = this.state.get('world.airDensity');
            
            const reentryHeatPower = 1.83e-7 * Math.pow(trueSpeed, 3) * Math.sqrt(airDensity / vehicleNoseRadius);
            
            this.state.set('flight.thermalPower', reentryHeatPower);
            return reentryHeatPower;
        }

        initialize() {
            this.updateAtmosphere();
        }
    }

    return new Atmosphere();
});