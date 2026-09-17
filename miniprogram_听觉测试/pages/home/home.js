Page({
  onLoad: function (query) {
    var app = getApp();
    app.globalData.referrerTeacherId = (query && query.ref) || "";
  },

  startWith: function (mode, firstPageUrl) {
    var app = getApp();
    app.globalData.playerInfo = null;
    app.globalData.testMode = mode;
    app.globalData.auditoryResult = null;
    app.globalData.visualResult = null;
    wx.navigateTo({ url: firstPageUrl });
  },

  startDual: function () { this.startWith("dual", "/pages/auditory/auditory"); },
  startAuditory: function () { this.startWith("auditory", "/pages/auditory/auditory"); },
  startVisual: function () { this.startWith("visual", "/pages/visual/visual"); }
});
