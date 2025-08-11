import React from 'react';
import { EngineControls } from './EngineControls';
import { AttitudeControls } from './AttitudeControls';

export const FlightControlPanel = () => {
  return (
    <div id="flightControl" className="noSelect">
      <div id="controlsL" className="hideableControls" style={{ display: 'flex' }}>
        <EngineControls />
      </div>
      <div id="controlsR" className="hideableControls" style={{ display: 'flex' }}>
        <AttitudeControls />
      </div>
      <button className="show_hideToggle" style={{ position: 'absolute', bottom: 0, left: 0 }}>
        <span className="material-symbols-outlined">zoom_out</span>
      </button>
      <button className="show_hideToggle" style={{ position: 'absolute', bottom: 0, right: 0 }}>
        <span className="material-symbols-outlined">zoom_in</span>
      </button>
    </div>
  );
};
