import React from 'react';
import { useGameStore } from '../store/useGameStore';

export const EngineControls = () => {
  const { throttle, setThrottle, toggleRaptor1, toggleRaptor2, toggleRaptor3, toggleAllRaptors, toggleautoMaxThrust } = useGameStore(
    (state) => ({
      throttle: state.throttle,
      setThrottle: (throttle: number) => useGameStore.setState({ throttle }),
      toggleRaptor1: () => useGameStore.setState((state) => ({ raptorN1Running: !state.raptorN1Running })),
      toggleRaptor2: () => useGameStore.setState((state) => ({ raptorN2Running: !state.raptorN2Running })),
      toggleRaptor3: () => useGameStore.setState((state) => ({ raptorN3Running: !state.raptorN3Running })),
      toggleAllRaptors: () => useGameStore.setState((state) => ({ raptorN1Running: !state.raptorN1Running, raptorN2Running: !state.raptorN2Running, raptorN3Running: !state.raptorN3Running })),
      toggleautoMaxThrust: () => useGameStore.setState((state) => ({ autoMaxThrustOn: !state.autoMaxThrustOn })),
    })
  );

  return (
    <>
      <span className="label">Engine Controls</span>
      <div id="controlsLContent" className="hideableControlsContent">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gridGap: '1px', padding: '2px' }}>
          <button id="raptor1toggle" className="controlBtn" onClick={toggleRaptor1}>
            R1
          </button>
          <button id="raptor2toggle" className="controlBtn" onClick={toggleRaptor2}>
            R2
          </button>
          <button id="raptor3toggle" className="controlBtn" onClick={toggleRaptor3}>
            R3
          </button>

          <button id="allraptorstoggle" className="controlBtn" onClick={toggleAllRaptors} style={{ gridColumnStart: 1, gridColumnEnd: 4 }}>
            Toggle-All
          </button>
          <input
            type="range"
            className="slider"
            id="throttleControl"
            style={{ gridColumnStart: 1, gridColumnEnd: 4 }}
            value={throttle}
            onChange={(e) => setThrottle(Number(e.target.value))}
          />
          <br />
          <button className="controlBtn" id="toggleautoMaxThrust" style={{ gridColumnStart: 1, gridColumnEnd: 4 }} onClick={toggleautoMaxThrust}>
            Thrust Safe Guard
          </button>
        </div>
      </div>
    </>
  );
};
