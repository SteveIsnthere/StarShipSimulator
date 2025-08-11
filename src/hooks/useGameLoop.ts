import { useEffect, useRef } from 'react';
import { usePhysics } from './usePhysics';

export const useGameLoop = () => {
  const { updatePhysics } = usePhysics();
  const loopRef = useRef<number>();

  const gameLoop = () => {
    // 1. environmentUpDate() is called inside usePhysics
    updatePhysics();

    // 2. vehicleStatusUpDate() - to be implemented in useVehicleStatus hook
    // 3. FlightParamsUpDate() - mostly covered by usePhysics, will review later
    // 4. controlsUpdate() - to be implemented in useControls hook
    // 5. saveDataPoint() - to be implemented in useDataRecorder hook

    loopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    loopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
      }
    };
  }, []);
};
