moduleLoader.define('toggleButton', ['state'], (state) => {
    
    class ToggleButton {
        constructor(elementId, onCallback, offCallback, initialState = false) {
            this.elementId = elementId;
            this.element = document.getElementById(elementId);
            this.onCallback = onCallback || (() => {});
            this.offCallback = offCallback || (() => {});
            this.isOn = initialState;
            
            this.setupElement();
            this.updateVisualState();
        }

        setupElement() {
            if (this.element) {
                this.element.addEventListener('click', () => this.toggle());
            }
        }

        toggle() {
            this.isOn = !this.isOn;
            
            if (this.isOn) {
                this.onCallback();
            } else {
                this.offCallback();
            }
            
            this.updateVisualState();
            return this.isOn;
        }

        setState(newState) {
            if (this.isOn !== newState) {
                this.toggle();
            }
        }

        updateVisualState() {
            if (!this.element) return;
            
            if (this.isOn) {
                this.element.classList.add('active', 'on');
                this.element.classList.remove('off');
                this.element.style.backgroundColor = '#4CAF50';
                this.element.style.color = 'white';
            } else {
                this.element.classList.add('off');
                this.element.classList.remove('active', 'on');
                this.element.style.backgroundColor = '';
                this.element.style.color = '';
            }
        }

        setEnabled(enabled) {
            if (this.element) {
                this.element.disabled = !enabled;
                this.element.style.opacity = enabled ? '1' : '0.5';
            }
        }

        destroy() {
            if (this.element) {
                this.element.removeEventListener('click', this.toggle);
            }
        }
    }

    class RaptorEngineButton extends ToggleButton {
        constructor(engineNumber, vehicle) {
            const elementId = `raptor${engineNumber}toggle`;
            super(
                elementId,
                () => vehicle.toggleEngine(engineNumber),
                () => vehicle.toggleEngine(engineNumber),
                false
            );
            this.engineNumber = engineNumber;
            this.vehicle = vehicle;
        }

        updateFromEngineStatus(engineStatus, failures) {
            const engineKey = `raptor${this.engineNumber}`;
            const failureKey = `${engineKey}Fail`;
            
            this.isOn = engineStatus[engineKey] || false;
            this.updateVisualState();
            
            if (failures[failureKey]) {
                this.setEnabled(false);
                if (this.element) {
                    this.element.style.backgroundColor = '#f44336';
                    this.element.style.color = 'white';
                }
            } else {
                this.setEnabled(true);
            }
        }
    }

    class SystemToggleButton extends ToggleButton {
        constructor(systemName, vehicle, elementId = null) {
            const id = elementId || `toggle${systemName.charAt(0).toUpperCase() + systemName.slice(1)}`;
            super(
                id,
                () => vehicle.toggleSystem(systemName),
                () => vehicle.toggleSystem(systemName),
                false
            );
            this.systemName = systemName;
            this.vehicle = vehicle;
        }

        updateFromSystemStatus(systemStatus) {
            this.isOn = systemStatus[this.systemName] || false;
            this.updateVisualState();
        }
    }

    class AutoPilotModeButton extends ToggleButton {
        constructor(modeName, autopilot, elementId = null) {
            const id = elementId || `toggle${modeName.charAt(0).toUpperCase() + modeName.slice(1)}`;
            super(
                id,
                () => autopilot.enableMode(modeName),
                () => autopilot.disableMode(modeName),
                false
            );
            this.modeName = modeName;
            this.autopilot = autopilot;
        }

        updateFromAutopilotStatus() {
            this.isOn = this.autopilot.isModeActive(this.modeName);
            this.updateVisualState();
        }
    }

    return {
        ToggleButton,
        RaptorEngineButton,
        SystemToggleButton,
        AutoPilotModeButton
    };
});