# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StarShipSimulator is a web-based SpaceX Starship flight simulator built with pure JavaScript, PIXI.js for rendering, and HTML5. The project simulates realistic physics, flight dynamics, and autopilot systems for the Starship rocket. It's a Progressive Web App (PWA) that can be installed and run offline.

## Development Commands

This is a client-side web application with no build process or package manager. Development is done by:

- **Local Development**: Open `index.html` directly in a web browser or serve via a local HTTP server
- **Testing**: Manual testing through the web interface - no automated test suite exists
- **Serving locally**: `python -m http.server 8000` or any static file server

## Architecture

### Core Components

**Backend Logic** (`backend/`):
- `initBackEnd.js`: Initializes all simulation parameters, vehicle properties, and autopilot systems
- `physics.js`: Handles atmospheric models, drag calculations, and thermal dynamics
- `updateBackEnd.js`: Main simulation loop and physics updates
- `flightcontrol/`: Flight control systems including autopilot modes and low-level functions

**Rendering System** (`render/`):
- Built on PIXI.js v5.1.3
- `pixi_init.js`: Initializes PIXI application and loads assets
- `pixi_setup.js`: Sets up sprites and rendering components
- `drawMethods/`: Rendering methods for vehicle, effects, and environment
- `particleEffect/`: RevoltFX particle system for engine effects

**UI Components** (`displayComponents/`):
- `dispUpdate.js`: Updates flight parameter displays and UI elements
- CSS files for styling and component appearance

**Utilities** (`utilities/`):
- `eventListener.js`: Keyboard and touch input handling
- `tools.js`: Mathematical and utility functions
- `welcome.js`: Welcome screen functionality

### Key Global Variables

The simulator uses extensive global variables defined in `initBackEnd.js`:
- Vehicle parameters: mass, dimensions, engine specifications
- Flight state: position, velocity, attitude, acceleration
- Environmental: atmosphere, gravity, wind
- Autopilot: various flight modes and control parameters

### Autopilot Modes

Implemented in `backend/flightcontrol/autoPilotModes.js`:
- **Lift-Off**: Automated takeoff sequence
- **Boost-Back**: Return-to-launch-site trajectory
- **Auto-Land**: Complete landing sequence with belly-flop maneuver
- **Att-Hold**: Attitude hold mode

### Input Handling

Supports both keyboard and touch controls:
- Keyboard shortcuts match Kerbal Space Program conventions
- Touch controls via sliders and buttons
- Device tilt control for mobile devices

## File Structure Notes

- No package.json - this is a vanilla JavaScript project
- All dependencies loaded via CDN (PIXI.js, Plotly.js)
- Assets stored in `render/assets/images/`
- Progressive Web App configuration in `manifest.json`
- Service worker for offline functionality in `serviceworker.js`

## Development Tips

- The main simulation loop runs at 60 FPS through requestAnimationFrame
- Physics calculations use realistic orbital mechanics and atmospheric models
- All physical constants and vehicle parameters are configurable in `initBackEnd.js`
- The coordinate system uses meters for distance and radians for angles
- Time acceleration is supported for faster simulation playback