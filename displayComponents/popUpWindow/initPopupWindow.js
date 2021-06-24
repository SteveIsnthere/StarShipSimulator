

$("#showPlotPopUpPage").animatedModal({
  animatedIn: 'slideInUp',
  animatedOut: 'slideOutDown',
  color: '#ffffff',
  // Callbacks
  beforeOpen: function () {
    plot();
  },
});