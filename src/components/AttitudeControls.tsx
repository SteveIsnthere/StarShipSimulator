import React from 'react';
import { useGameStore } from '../store/useGameStore';

export const AttitudeControls = () => {
  const {
    pitchControl,
    setPitchControl,
    togglePitchHold,
    toggleAutoLand,
    toggleBoostBack,
    toggleautoTakeOff,
    toggleFin,
    toggleRcs,
    toggleDumpFuel,
  } = useGameStore((state) => ({
    pitchControl: state.pitchControl,
    setPitchControl: (pitchControl: number) =>
      useGameStore.setState({ pitchControl }),
    togglePitchHold: () =>
      useGameStore.setState((state) => ({ pitchHoldOn: !state.pitchHoldOn })),
    toggleAutoLand: () =>
      useGameStore.setState((state) => ({ autoLandOn: !state.autoLandOn })),
    toggleBoostBack: () =>
      useGameStore.setState((state) => ({ autoBoostBackOn: !state.autoBoostBackOn })),
      toggleautoTakeOff: () => useGameStore.setState((state) => ({ autoTakeOffOn: !state.autoTakeOffOn })),
    toggleFin: () =>
      useGameStore.setState((state) => ({ finActive: !state.finActive })),
    toggleRcs: () =>
      useGameStore.setState((state) => ({ rcsActive: !state.rcsActive })),
    toggleDumpFuel: () =>
      useGameStore.setState((state) => ({ dumpingFuel: !state.dumpingFuel })),
  }));

  return (
    <>
      <div id="controlsRContent" className="hideableControlsContent">
        <span className="label">Flight Yoke</span>
        <div id="attitudeControl" style={{ textAlign: 'center' }}>
          <input
            type="range"
            className="slider"
            id="pitchControl"
            value={pitchControl}
            onChange={(e) => setPitchControl(Number(e.target.value))}
          />
        </div>
        <span className="label">Auto Pilot Modes</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <button className="controlBtn" id="toggleautoTakeOff" onClick={toggleautoTakeOff}>
            Lift-Off
          </button>
          <button className="controlBtn" id="toggleBoostBack" onClick={toggleBoostBack}>
            Boost-Back
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <button className="controlBtn" id="togglePitchHold" onClick={togglePitchHold}>
            Att-Hold
          </button>
          <button className="controlBtn" id="toggleAutoLand" onClick={toggleAutoLand}>
            Auto-Land
          </button>
        </div>
        <span className="label">Utilities</span>
        <div id="controlToggles" style={{ display: 'flex', flexWrap: 'wrap' }}>
          <button className="controlBtn" id="toggleFin" onClick={toggleFin}>
            Fins
          </button>
          <button className="controlBtn" id="toggleRcs" onClick={toggleRcs}>
            RCS
          </button>
          <button className="controlBtn" id="toggledumpFuel" onClick={toggleDumpFuel}>
            DumpFuel
          </button>
        </div>
      </div>
    </>
  );
};
