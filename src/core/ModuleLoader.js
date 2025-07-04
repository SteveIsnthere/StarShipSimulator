class ModuleLoader {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.loaded = new Set();
        this.loading = new Set();
        this.initialized = new Set();
    }

    static getInstance() {
        if (!ModuleLoader.instance) {
            ModuleLoader.instance = new ModuleLoader();
        }
        return ModuleLoader.instance;
    }

    define(name, dependencies = [], factory) {
        if (this.modules.has(name)) {
            console.warn(`Module ${name} already defined`);
            return;
        }

        this.modules.set(name, {
            name,
            dependencies,
            factory,
            exports: null,
            loaded: false
        });

        this.dependencies.set(name, dependencies);
    }

    async load(name) {
        if (this.loaded.has(name)) {
            return this.modules.get(name).exports;
        }

        if (this.loading.has(name)) {
            await new Promise(resolve => {
                const checkLoaded = () => {
                    if (this.loaded.has(name)) {
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 10);
                    }
                };
                checkLoaded();
            });
            return this.modules.get(name).exports;
        }

        this.loading.add(name);

        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module ${name} not defined`);
        }

        const dependencies = [];
        for (const dep of module.dependencies) {
            if (dep === 'state') {
                dependencies.push(StateManager.getInstance());
            } else {
                dependencies.push(await this.load(dep));
            }
        }

        try {
            module.exports = module.factory(...dependencies);
            module.loaded = true;
            this.loaded.add(name);
            this.loading.delete(name);
            
            return module.exports;
        } catch (error) {
            this.loading.delete(name);
            throw new Error(`Failed to load module ${name}: ${error.message}`);
        }
    }

    async loadAll(names) {
        const promises = names.map(name => this.load(name));
        return Promise.all(promises);
    }

    get(name) {
        const module = this.modules.get(name);
        if (!module || !module.loaded) {
            throw new Error(`Module ${name} not loaded`);
        }
        return module.exports;
    }

    has(name) {
        return this.modules.has(name) && this.loaded.has(name);
    }

    async initialize(name, ...args) {
        if (this.initialized.has(name)) {
            return;
        }

        const module = await this.load(name);
        if (module && typeof module.initialize === 'function') {
            await module.initialize(...args);
        }

        this.initialized.add(name);
    }

    async initializeAll(names, ...args) {
        for (const name of names) {
            await this.initialize(name, ...args);
        }
    }

    getLoadOrder(targetModules) {
        const visited = new Set();
        const visiting = new Set();
        const order = [];

        const visit = (name) => {
            if (visited.has(name)) return;
            if (visiting.has(name)) {
                throw new Error(`Circular dependency detected involving ${name}`);
            }

            visiting.add(name);
            const deps = this.dependencies.get(name) || [];
            
            for (const dep of deps) {
                if (dep !== 'state' && this.dependencies.has(dep)) {
                    visit(dep);
                }
            }

            visiting.delete(name);
            visited.add(name);
            order.push(name);
        };

        for (const module of targetModules) {
            visit(module);
        }

        return order;
    }

    reset() {
        this.modules.clear();
        this.dependencies.clear();
        this.loaded.clear();
        this.loading.clear();
        this.initialized.clear();
    }
}

window.ModuleLoader = ModuleLoader;

const moduleLoader = ModuleLoader.getInstance();
window.moduleLoader = moduleLoader;