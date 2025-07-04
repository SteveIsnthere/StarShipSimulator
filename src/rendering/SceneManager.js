moduleLoader.define('sceneManager', ['state'], (state) => {
    
    class SceneManager {
        constructor() {
            this.state = state;
            this.app = null;
            this.viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
                scale: 1.0,
                offsetX: 0,
                offsetY: 0
            };
            this.gameObjects = new Map();
            this.layers = {
                background: new PIXI.Container(),
                ground: new PIXI.Container(),
                effects: new PIXI.Container(),
                vehicle: new PIXI.Container(),
                ui: new PIXI.Container()
            };
            this.camera = {
                x: 0,
                y: 0,
                zoom: 1.0,
                targetX: 0,
                targetY: 0,
                targetZoom: 1.0,
                smoothing: 0.1
            };
        }

        initialize(canvasElement) {
            this.app = new PIXI.Application({
                view: canvasElement,
                width: this.viewport.width,
                height: this.viewport.height,
                resolution: window.devicePixelRatio,
                autoResize: true,
                antialias: true,
                transparent: false,
                backgroundColor: 0xa7bdd9
            });

            this.app.renderer.view.style.position = "absolute";
            this.app.renderer.view.style.display = "block";
            this.app.renderer.autoDensity = true;

            this.setupLayers();
            this.setupEventListeners();

            return this.app;
        }

        setupLayers() {
            Object.values(this.layers).forEach(layer => {
                this.app.stage.addChild(layer);
            });

            this.layers.background.zIndex = 0;
            this.layers.ground.zIndex = 1;
            this.layers.effects.zIndex = 2;
            this.layers.vehicle.zIndex = 3;
            this.layers.ui.zIndex = 4;

            this.app.stage.sortableChildren = true;
        }

        setupEventListeners() {
            window.addEventListener('resize', () => this.handleResize());
            
            this.app.ticker.add(() => this.update());
        }

        handleResize() {
            this.viewport.width = window.innerWidth;
            this.viewport.height = window.innerHeight;
            
            this.app.renderer.resize(this.viewport.width, this.viewport.height);
            
            this.updateCameraProjection();
        }

        addGameObject(id, gameObject, layerName = 'vehicle') {
            if (this.layers[layerName]) {
                this.gameObjects.set(id, gameObject);
                this.layers[layerName].addChild(gameObject);
                return true;
            }
            return false;
        }

        removeGameObject(id) {
            const gameObject = this.gameObjects.get(id);
            if (gameObject) {
                gameObject.parent.removeChild(gameObject);
                this.gameObjects.delete(id);
                return true;
            }
            return false;
        }

        getGameObject(id) {
            return this.gameObjects.get(id);
        }

        setCameraTarget(x, y, zoom = null) {
            this.camera.targetX = x;
            this.camera.targetY = y;
            if (zoom !== null) {
                this.camera.targetZoom = Math.max(0.1, Math.min(5.0, zoom));
            }
        }

        updateCamera() {
            const smoothing = this.camera.smoothing;
            
            this.camera.x += (this.camera.targetX - this.camera.x) * smoothing;
            this.camera.y += (this.camera.targetY - this.camera.y) * smoothing;
            this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * smoothing;

            this.updateCameraProjection();
        }

        updateCameraProjection() {
            const centerX = this.viewport.width / 2;
            const centerY = this.viewport.height / 2;

            Object.values(this.layers).forEach(layer => {
                if (layer !== this.layers.ui) {
                    layer.scale.set(this.camera.zoom);
                    layer.position.set(
                        centerX - this.camera.x * this.camera.zoom,
                        centerY - this.camera.y * this.camera.zoom
                    );
                }
            });
        }

        worldToScreen(worldX, worldY) {
            const centerX = this.viewport.width / 2;
            const centerY = this.viewport.height / 2;
            
            return {
                x: centerX + (worldX - this.camera.x) * this.camera.zoom,
                y: centerY + (worldY - this.camera.y) * this.camera.zoom
            };
        }

        screenToWorld(screenX, screenY) {
            const centerX = this.viewport.width / 2;
            const centerY = this.viewport.height / 2;
            
            return {
                x: this.camera.x + (screenX - centerX) / this.camera.zoom,
                y: this.camera.y + (screenY - centerY) / this.camera.zoom
            };
        }

        updateBackgroundColor() {
            const altitude = this.state.get('flight.altitude');
            const skyStartDarkenHeight = 20000;
            const skyCompletelyDarkenHeight = 80000;
            
            let skyDarkenFraction;
            if (altitude < skyStartDarkenHeight) {
                skyDarkenFraction = 0;
            } else if (altitude > skyCompletelyDarkenHeight) {
                skyDarkenFraction = 0.6;
            } else {
                skyDarkenFraction = 0.6 * (altitude - skyStartDarkenHeight) / 
                                  (skyCompletelyDarkenHeight - skyStartDarkenHeight);
            }

            const baseColor = 0xa7bdd9;
            const baseR = (baseColor >> 16) & 0xFF;
            const baseG = (baseColor >> 8) & 0xFF;
            const baseB = baseColor & 0xFF;

            const darkenedR = Math.floor(baseR * (1 - skyDarkenFraction));
            const darkenedG = Math.floor(baseG * (1 - skyDarkenFraction));
            const darkenedB = Math.floor(baseB * (1 - skyDarkenFraction));

            const newColor = (darkenedR << 16) | (darkenedG << 8) | darkenedB;
            this.app.renderer.backgroundColor = newColor;
        }

        followVehicle() {
            const altitude = this.state.get('flight.altitude');
            const downRange = this.state.get('flight.downRangeDistance');
            
            const vehicleScreenX = downRange;
            const vehicleScreenY = -altitude;
            
            this.setCameraTarget(vehicleScreenX, vehicleScreenY);
        }

        setZoom(zoomLevel) {
            this.setCameraTarget(this.camera.targetX, this.camera.targetY, zoomLevel);
        }

        adjustZoom(delta) {
            const newZoom = this.camera.targetZoom + delta;
            this.setZoom(newZoom);
        }

        getViewportBounds() {
            const topLeft = this.screenToWorld(0, 0);
            const bottomRight = this.screenToWorld(this.viewport.width, this.viewport.height);
            
            return {
                left: topLeft.x,
                top: topLeft.y,
                right: bottomRight.x,
                bottom: bottomRight.y,
                width: bottomRight.x - topLeft.x,
                height: bottomRight.y - topLeft.y
            };
        }

        isInViewport(x, y, margin = 100) {
            const bounds = this.getViewportBounds();
            return x >= bounds.left - margin && x <= bounds.right + margin &&
                   y >= bounds.top - margin && y <= bounds.bottom + margin;
        }

        update() {
            this.updateCamera();
            this.updateBackgroundColor();
            this.followVehicle();

            this.gameObjects.forEach((gameObject, id) => {
                if (gameObject.update && typeof gameObject.update === 'function') {
                    gameObject.update();
                }
            });
        }

        getLayer(layerName) {
            return this.layers[layerName];
        }

        clearLayer(layerName) {
            if (this.layers[layerName]) {
                this.layers[layerName].removeChildren();
            }
        }

        destroy() {
            this.gameObjects.clear();
            Object.values(this.layers).forEach(layer => {
                layer.destroy({ children: true });
            });
            
            if (this.app) {
                this.app.destroy(true);
            }
        }

        getStats() {
            return {
                gameObjectCount: this.gameObjects.size,
                viewport: { ...this.viewport },
                camera: { ...this.camera },
                bounds: this.getViewportBounds()
            };
        }
    }

    return new SceneManager();
});