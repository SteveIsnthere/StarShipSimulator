import { Stage } from '@pixi/react';
import './App.css';
import { useGameLoop } from './hooks/useGameLoop';
import { StarShip } from './components/StarShip';
import { FlightControlPanel } from './components/FlightControlPanel';

function App() {
  useGameLoop();

  return (
    <>
      <Stage width={window.innerWidth} height={window.innerHeight} options={{ background: 0xa7bdd9 }}>
        <StarShip />
      </Stage>
      <button id="menuToggle" style={{ display: 'none' }}>
        <span className="material-symbols-outlined">menu</span>
      </button>

      <div id="mainViewButtonsArea">
        <button id="RestartBtn" className="mainPageBtn">
          Restart
        </button>
        <button id="showPlotViewButton" className="mainPageBtn">
          Black Box
        </button>
        <button id="requestTiltPermissionBtn" className="mainPageBtn">
          Enable Tilt Control
        </button>
      </div>

      <div id="FlightParamDisp" className="noSelect">
        <div id="FlightParamDispLR">
          <p>
            <span id="altitudeDisp" style={{ fontSize: '20px' }}></span>
            <span id="altitudeDisp2" style={{ fontSize: '10px' }}></span>
          </p>
          <span>
            <span id="speedDisp" style={{ fontSize: '20px' }}></span>
            <span id="speedDisp2" style={{ fontSize: '10px' }}></span>
          </span>
        </div>

        <div id="MidUpperMenu">
          <div id="FlightParamDispMid">
            <span className="FlightParamDispMidCell">
              DownRange: <span id="distanceToLandingSite"></span>
            </span>
            <span className="FlightParamDispMidCell">
              SpeedX: <span id="speedX"></span>
            </span>
            <span className="FlightParamDispMidCell">
              SpeedY: <span id="speedY"></span>
            </span>
            <span className="FlightParamDispMidCell">
              G: <span id="gforece"></span>
            </span>
            <span className="FlightParamDispMidCell">
              Fuel: <span id="propellantMassDisp"></span>t
            </span>
            <span className="FlightParamDispMidCell">
              TWR: <span id="twrDisp"></span>
            </span>
          </div>
        </div>
      </div>

      <FlightControlPanel />

      <div id="plotView" className="hiddenFullScreenView">
        {/* PlotView component will go here */}
      </div>

      <div id="menuView" className="hiddenFullScreenView">
        {/* MenuView component will go here */}
      </div>

      <div id="guideView" className="hiddenFullScreenView">
        {/* GuideView component will go here */}
      </div>

      <div id="aboutView" className="hiddenFullScreenView">
        {/* AboutView component will go here */}
      </div>
    </>
  );
}

export default App;
