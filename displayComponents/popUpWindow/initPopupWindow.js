$("#showFlightControlPage").animatedModal({
  animatedIn: 'slideInDown',
  animatedOut: 'slideOutUp',
  color: '#e7e7e7',
  // Callbacks
  beforeOpen: function () {


  },
  afterOpen: function () {
    app.stop()

  },
  beforeClose: function () {
    app.start()
  },
});


$("#showPlotPopUpPage").animatedModal({
  animatedIn: 'slideInUp',
  animatedOut: 'slideOutDown',
  color: '#ffffff',
  // Callbacks
  beforeOpen: function () {
    plot();
  },
});