import { useGameStore } from '../store/useGameStore';

export const usePhysics = () => {
  const getRad = (angle: number) => {
    return (angle / 180) * Math.PI;
  };

  const getAngle = (rad: number) => {
    return (rad / Math.PI) * 180;
  };

  const updateAtmosphere = () => {
    const { altitude } = useGameStore.getState();
    let airTemperature: number;
    let airPressure: number;
    let airDensity: number;

    if (altitude < 11000) {
      tropo();
    } else {
      lowerStrato();
    }

    function lowerStrato() {
      airTemperature = -56.46;
      airPressure = 22.65 * Math.exp(1.73 - 0.000157 * altitude);
      airDensity = getDensity();
    }
    function tropo() {
      airTemperature = 15.04 - 0.00649 * altitude;
      airPressure = 101.29 * ((airTemperature + 273.1) / 288.08) ** 5.256;
      airDensity = getDensity();
    }
    function getDensity() {
      return airPressure / (0.2869 * (airTemperature + 273.1));
    }

    useGameStore.setState({ airPressure, airDensity });
  };

  const getReentryHeatPower = (vehicleNoseRadius: number) => {
    const { trueSpeed, airDensity } = useGameStore.getState();
    if (airDensity === undefined) return 0;
    return (
      1.83e-7 * trueSpeed ** 3 * Math.sqrt(airDensity / vehicleNoseRadius)
    );
  };

  const getDynamicPressure = () => {
    const { trueSpeed, airDensity } = useGameStore.getState();
    if (airDensity === undefined) return 0;
    return airDensity * trueSpeed ** 2 * 0.0005;
  };

  const getCrossSectionalArea = () => {
    const { angleInToTheWind, vehicleInFlightMaxArea, vehicleMinArea } =
      useGameStore.getState();
    return (
      Math.abs(Math.sin(angleInToTheWind) * vehicleInFlightMaxArea) +
      (Math.abs(Math.cos(angleInToTheWind) * vehicleMinArea) / 2.1)
    );
  };

  const getDrag = (cross_sectionArea: number, dragCoefficient: number) => {
    const { airDensity, trueSpeed } = useGameStore.getState();
    if (airDensity === undefined) return 0;
    return 0.5 * airDensity * trueSpeed ** 2 * dragCoefficient * cross_sectionArea;
  };

  const getLift = (wingArea: number) => {
    const { airDensity, trueSpeed, angleInToTheWind } = useGameStore.getState();
    if (airDensity === undefined) return 0;

    const getLiftCoefficient = () => {
      let liftCoefficient;
      const angleITW = Math.abs(angleInToTheWind);

      if (angleITW >= 1.48) {
        liftCoefficient = -1.1 * angleITW + 1.728;
      } else if (angleITW >= 0.52) {
        liftCoefficient = -1 / 9.6 * angleITW + 0.254;
      } else if (angleITW >= 0.47) {
        liftCoefficient = -8 * angleITW + 4.36;
      } else if (angleITW >= 0.35) {
        liftCoefficient = 5 / 6 * angleITW + 0.2083;
      } else {
        liftCoefficient = (5 / 3.5) * angleITW;
      }

      return liftCoefficient;
    };

    const liftCoefficient = getLiftCoefficient();
    return liftCoefficient * airDensity * trueSpeed ** 2 * wingArea * 0.5;
  };

  const getBodyDragCoefficient = () => {
    const { machSpeed } = useGameStore.getState();
    if (machSpeed >= 10) {
      return 2.5;
    }
    return machSpeed * 0.1347 + 1.153;
  };

  const getAcceleration = (force: number, mass: number) => {
    return force / mass;
  };

  const getAngularAcceleration = (
    force: number,
    distanceToCenterOfMass: number,
    momentOfInertia: number
  ) => {
    const torque = force * distanceToCenterOfMass;
    return torque / momentOfInertia;
  };

  // ... and so on for all the other physics functions

  const updatePhysics = () => {
    updateAtmosphere();
    const dynamicPressure = getDynamicPressure();
    const crossSectionalArea = getCrossSectionalArea();
    const drag = getDrag(crossSectionalArea, getBodyDragCoefficient());
    const lift = getLift(0); // Assuming wingArea is 0 for now

    useGameStore.setState({ dynamicPressure, crossSectionalArea, aerodynamicDrag: drag, aerodynamicLift: lift });
  };

  return { updatePhysics };
};
