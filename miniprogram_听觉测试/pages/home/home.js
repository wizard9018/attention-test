Page({
  data: {
    name: "",
    school: "",
    phone: "",
    age: "",
    referrerTeacherId: "",
    errorText: ""
  },

  onFieldInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var data = {};
    data[field] = e.detail.value;
    this.setData(data);
  },

  validate: function () {
    var d = this.data;
    var age = parseInt(d.age, 10);
    if (!d.name.trim() || !d.school.trim() || !d.phone.trim() || !age || age < 5 || age > 18) {
      this.setData({ errorText: "请填写姓名、学校、手机号/微信号，并输入 5~18 之间的年龄" });
      return null;
    }
    var referrer = (d.referrerTeacherId || "").trim();
    if (referrer && !/^\d{5}$/.test(referrer)) {
      this.setData({ errorText: "推荐码需为5位数字，不填则留空" });
      return null;
    }
    this.setData({ errorText: "" });
    return {
      name: d.name.trim(),
      school: d.school.trim(),
      phone: d.phone.trim(),
      age: age,
      referrerTeacherId: referrer || ""
    };
  },

  startWith: function (mode, firstPageUrl) {
    var info = this.validate();
    if (!info) return;
    var app = getApp();
    app.globalData.playerInfo = info;
    app.globalData.testMode = mode;
    app.globalData.auditoryResult = null;
    app.globalData.visualResult = null;
    wx.navigateTo({ url: firstPageUrl });
  },

  startDual: function () { this.startWith("dual", "/pages/auditory/auditory"); },
  startAuditory: function () { this.startWith("auditory", "/pages/auditory/auditory"); },
  startVisual: function () { this.startWith("visual", "/pages/visual/visual"); }
});
