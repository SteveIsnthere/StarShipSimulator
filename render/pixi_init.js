
const rendererBackgroundColor = "0xa7bdd9"

const app = new PIXI.Application({
    view: mainView,
    width: renderBoxWidth,
    height: renderBoxHeight,
    antialias: true,
    transparent: false,
});
app.renderer.backgroundColor = rendererBackgroundColor;
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoDensity = true;

const fx = new revolt.FX()



PIXI.loader
    .add('fx_settings', 'render/particleEffect/assets/default-bundle.json')
    .add('fx_spritesheet', 'render/particleEffect/assets/revoltfx-spritesheet.json')
    .add('example_spritesheet', 'render/particleEffect/assets/revoltfx-spritesheet.png')
    .add("starShipBody", "render/assets/images/Starship.webp")
    .add("pig", "render/assets/images/pig.webp")
    .add("starhopper", "render/assets/images/starhopper.webp")
    .add("starBaseBackGround", "render/assets/images/starBaseBackGround.webp")
    .add("starBaseBackGround2", "render/assets/images/starBaseBackGround2.webp")
    .add("lunchpad_Light1", "render/assets/images/lunchpad_Light1.webp")
    .add("lunchpad_Light2", "render/assets/images/lunchpad_Light2.webp")
    .add("tree1", "render/assets/images/tree1.webp")
    .add("tree2", "render/assets/images/tree2.webp")
    .load(setupSprites)
    .load(setupStarBase)
    .load(setupStarShip)
    .load(setupStarShipEffects)
    .load(setupGroundObjects)
    .load(setupEffects)
    .load(finalSetupAndRun);


function setupSprites() {
    globalThis.starShipBody = new PIXI.Sprite(PIXI.loader.resources.starShipBody.texture);
    globalThis.pig = new PIXI.Sprite(PIXI.loader.resources.pig.texture);
    globalThis.starhopper = new PIXI.Sprite(PIXI.loader.resources.starhopper.texture);
    globalThis.starBaseBackGround = new PIXI.Sprite(PIXI.loader.resources.starBaseBackGround.texture);
    globalThis.starBaseBackGround2 = new PIXI.Sprite(PIXI.loader.resources.starBaseBackGround2.texture);
    globalThis.lunchpad_Light1 = new PIXI.Sprite(PIXI.loader.resources.lunchpad_Light1.texture);
    globalThis.lunchpad_Light2 = new PIXI.Sprite(PIXI.loader.resources.lunchpad_Light2.texture);
    globalThis.tree1 = new PIXI.Sprite(PIXI.loader.resources.tree1.texture);
    globalThis.tree2 = new PIXI.Sprite(PIXI.loader.resources.tree2.texture);
    fx.initBundle(PIXI.loader.resources.fx_settings.data);
}

function setupStarShip() {
    globalThis.starShipAndEffects = new PIXI.Container();
    globalThis.starShip = new PIXI.Container();

    //engine plume
    //1
    globalThis.raptor1Plume = new PIXI.Container();
    raptor1Plume.alpha = 0.9;

    globalThis.raptor1PlumeEmitter = fx.getParticleEmitter('raptortrail');

    starShip.addChild(raptor1Plume)

    //2
    globalThis.raptor2Plume = new PIXI.Container();
    raptor2Plume.alpha = 0.9;

    globalThis.raptor2PlumeEmitter = fx.getParticleEmitter('raptortrail');

    starShip.addChild(raptor2Plume)

    //3
    globalThis.raptor3Plume = new PIXI.Container();
    raptor3Plume.alpha = 0.9;

    globalThis.raptor3PlumeEmitter = fx.getParticleEmitter('raptortrail');

    starShip.addChild(raptor3Plume)

    //starShipBody
    starShipBody.anchor.set(0.5);
    starShipBody.x = 0;
    starShipBody.y = 0;
    starShip.addChild(starShipBody);

    //Fins
    globalThis.frontFin = new PIXI.Graphics();
    starShip.addChild(frontFin)

    globalThis.aftFin = new PIXI.Graphics();
    starShip.addChild(aftFin)

    //coldGasPlume
    globalThis.coldGasPlume = new PIXI.Container();

    globalThis.coldGasPlumeEmitter = fx.getParticleEmitter('coldgas');

    starShip.addChild(coldGasPlume)

    //fueldump
    globalThis.fueldump = new PIXI.Container();
    fueldump.rotation = Math.PI / 2;

    globalThis.fueldumpEmitter = fx.getParticleEmitter('fueldump');

    starShip.addChild(fueldump)

    starShipAndEffects.addChild(starShip);

    //Add the starShip to the stage
    app.stage.addChild(starShipAndEffects);
}

function setupGroundObjects(){
    //pig
    pig.anchor.set(0.5, 1);
    app.stage.addChild(pig);

    //tree1
    tree1.anchor.set(0.5, 1);
    app.stage.addChild(tree1);

    //tree2
    tree2.anchor.set(0.5, 1);
    app.stage.addChild(tree2);
}

function setupStarBase() {

    starBaseBackGround.anchor.set(0.5, 1);
    app.stage.addChild(starBaseBackGround);

    starBaseBackGround2.anchor.set(0.5, 1);
    app.stage.addChild(starBaseBackGround2);


    lunchpad_Light1.anchor.set(0.5, 1);
    app.stage.addChild(lunchpad_Light1);

    lunchpad_Light2.anchor.set(0.5, 1);
    app.stage.addChild(lunchpad_Light2);

    starhopper.anchor.set(0.5, 1);
    app.stage.addChild(starhopper);


    //spaceEffect
    globalThis.spaceEffect = new PIXI.Container();

    globalThis.spaceEffectEmitter = fx.getParticleEmitter('fairy-dust');
    

    app.stage.addChild(spaceEffect)
}

function setupStarShipEffects() {

    //aeroheat

    //0
    globalThis.aeroheat0 = new PIXI.Container();

    globalThis.aeroheat0Emitter = fx.getParticleEmitter('aeroheat');

    starShipAndEffects.addChild(aeroheat0)

    //1
    globalThis.aeroheat1 = new PIXI.Container();

    globalThis.aeroheat1Emitter = fx.getParticleEmitter('aeroheat');

    starShipAndEffects.addChild(aeroheat1)


    //2
    globalThis.aeroheat2 = new PIXI.Container();

    globalThis.aeroheat2Emitter = fx.getParticleEmitter('aeroheat');

    starShipAndEffects.addChild(aeroheat2)

    //3
    globalThis.aeroheat3 = new PIXI.Container();

    globalThis.aeroheat3Emitter = fx.getParticleEmitter('aeroheat');

    starShipAndEffects.addChild(aeroheat3)


    //4
    globalThis.aeroheat4 = new PIXI.Container();

    globalThis.aeroheat4Emitter = fx.getParticleEmitter('aeroheat');

    starShipAndEffects.addChild(aeroheat4)

    //heatboom
    globalThis.heatboom = new PIXI.Container();
    heatboom.x = 0;
    heatboom.y = 0;

    globalThis.heatboomEmitter = fx.getParticleEmitter('heatboom');

    starShipAndEffects.addChild(heatboom)

    //
    //end of aeroheat
    //

    //sonicboom
    globalThis.sonicboom = new PIXI.Container();
    sonicboom.x = 0;
    sonicboom.y = 0;

    globalThis.sonicboomEmitter = fx.getParticleEmitter('sonicboom');

    starShipAndEffects.addChild(sonicboom)



    //aeroTrail
    globalThis.aeroTrail = new PIXI.Container();

    globalThis.aeroTrailEmitter = fx.getParticleEmitter('aerotrail');


    starShipAndEffects.addChild(aeroTrail)

    //groundSmoke
    globalThis.groundSmoke = new PIXI.Container();

    globalThis.groundSmokeEmitter = fx.getParticleEmitter('GroundSmoke');

    app.stage.addChild(groundSmoke)

    //crash
    globalThis.showedCrashEffect = false

    globalThis.crash = new PIXI.Container();
    crash.x = 0;
    crash.y = 0;

    globalThis.crashEmitter = fx.getParticleEmitter('top-big-explosion');

    starShipAndEffects.addChild(crash)

    globalThis.crashsmoke = new PIXI.Container();

    globalThis.crashsmokeEmitter = fx.getParticleEmitter('crashsmoke');

    starShipAndEffects.addChild(crashsmoke)

    //breakup
    globalThis.showedinFightBreakUpEffect = false

    globalThis.breakup = new PIXI.Container();
    breakup.x = 0;
    breakup.y = 0;

    globalThis.breakupEmitter = fx.getParticleEmitter('top-big-explosion');

    starShipAndEffects.addChild(breakup)

    globalThis.breakupsmoke = new PIXI.Container();

    globalThis.breakupsmokeEmitter = fx.getParticleEmitter('breakupsmoke');

    starShipAndEffects.addChild(breakupsmoke)

}

function setupEffects() {
    

    //fireExtinguisher
    globalThis.fireExtinguisher = new PIXI.Container();

    globalThis.fireExtinguisherEmitter = fx.getParticleEmitter('fireExtinguisher');


    app.stage.addChild(fireExtinguisher)

    //clouds
    globalThis.clouds = new PIXI.Container();

    globalThis.cloudsEmitter = fx.getParticleEmitter('single-cloud');
    clouds.x = getObjectDrawingPosX(starBaseBackGround2Xpos)
    clouds.y = getObjectDrawingPosY(25)
    cloudsEmitter.init(clouds, true, 1);

    app.stage.addChild(clouds)
}

