

function initDrawMethods() {
  globalThis.vehicleVerticalPropotion = 4

  globalThis.renderBoxWidth = window.innerWidth
  globalThis.renderBoxHeight = window.innerHeight

  globalThis.renderBoxPhysicalWidth
  globalThis.renderBoxPhysicalHeight

  globalThis.renderBoxX = downRangeDistance
  globalThis.renderBoxY = altitude

  globalThis.screenAspectRatio = renderBoxWidth / renderBoxHeight

  globalThis.stickyCam = true

  globalThis.drawingSize = getInitSize()

  globalThis.drawingSizeLowwerLimit = 1.95
  globalThis.drawingSizeUpperLimit = 7.5

  globalThis.drawingSizeCurrent = drawingSize

  initDrawingParams(drawingSizeCurrent)

  globalThis.semi_StickyCam_AlignTime_Centerize = 1

  globalThis.semi_StickyCam_AlignTime_MatchSpeed = 1

  globalThis.cam_AccX = 0
  globalThis.cam_AccY = 0

  globalThis.cam_SpeedX = speedX
  globalThis.cam_SpeedY = speedY

  globalThis.cam_PosX = downRangeDistance
  globalThis.cam_PosY = renderBoxPhysicalHeight / 2
}

initDrawMethods()