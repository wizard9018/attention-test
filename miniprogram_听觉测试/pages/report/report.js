// ==========================================
// 测评报告（单项听觉 / 单项视觉 / 双通道综合）
// 分级评语逻辑移植自 concentration_v1.html 的 gradeSingleChannel /
// AUDITORY_LEVEL_INTERPRETATION，双通道总分分级移植自
// showFinalCompositeReport 的 compositeTotal 判定
// ==========================================
var AUDITORY_MIN_LEVEL = 5;
var AUDITORY_MAX_LEVEL = 12;
var VISUAL_MIN_LEVEL = 5;
var VISUAL_MAX_LEVEL = 10;

var AUDITORY_LEVEL_INTERPRETATION = {
  5: "听觉记忆广度偏弱，机械记忆效率较低，1 小时约能记住 3 个单词以内，背诵过程较为吃力。课堂上听觉信息留存时间短，容易走神。",
  6: "听觉记忆能力较弱，记忆效率偏低，1 小时约能记住 3 个单词左右，背诵较为困难。上课时听觉专注力不足，容易在听讲过程中分心。",
  7: "听觉记忆能力中等偏下，记忆速度较慢，1 小时约能记住 5 个单词。上课时看似在认真听讲，实则容易\"左耳进右耳出\"，信息不易留存。",
  8: "听觉记忆能力中等，记忆效率尚可，1 小时约能记住 10 个单词。能够认真听讲基础内容，课堂吸收情况良好。",
  9: "听觉记忆能力较强，记忆效率较高，1 小时约能记住 15 个单词。无论是基础内容还是提高题目都能保持专注聆听。",
  10: "听觉记忆能力优秀，记忆效率很高，1 小时约能记住 20 个单词。课堂上对任何难度的内容都能保持高度专注。",
  11: "听觉记忆能力优秀，接近同龄上限水平，能够长时间保持高专注度听讲并有效留存信息。",
  12: "听觉记忆能力卓越，达到同龄顶尖水平，课堂听觉信息几乎不会遗漏。"
};

function gradeSingleChannel(level, minLevel, maxLevel) {
  var ratio = (level - minLevel) / (maxLevel - minLevel);
  if (ratio >= 0.85) return { text: "🎉 表现：卓越 (Superior · Top 5%)", cls: "grade-superior" };
  if (ratio >= 0.6) return { text: "🌟 表现：优秀 (Excellent · Top 15%)", cls: "grade-excellent" };
  if (ratio >= 0.3) return { text: "👍 表现：良好 (Good · 常模平均水准)", cls: "grade-good" };
  return { text: "📈 表现：发展中 (Developing · 需专项强化)", cls: "grade-developing" };
}

function gradeComposite(total) {
  if (total >= 96) return { text: "🎉 视听协同综合表现：卓越 (Superior · Top 5%)", cls: "grade-superior" };
  if (total >= 72) return { text: "🌟 视听协同综合表现：优秀 (Excellent · Top 15%)", cls: "grade-excellent" };
  if (total >= 50) return { text: "👍 视听协同综合表现：良好 (Good · 常模平均水准)", cls: "grade-good" };
  return { text: "📈 视听协同综合表现：发展中 (Developing · 需专项强化)", cls: "grade-developing" };
}

Page({
  data: {
    isComposite: false,
    type: "auditory",
    typeLabel: "听觉专注力",
    finalLevel: 0,
    maxLevel: AUDITORY_MAX_LEVEL,
    gradeText: "",
    gradeCls: "",
    interpretation: "",
    historyRows: [],
    hasData: false,
    playerName: "",
    playerSchool: "",
    reportDate: "",
    compositeTotal: 0,
    auditoryLevel: 0,
    visualLevel: 0,
    synced: false
  },

  onLoad: function (query) {
    var app = getApp();
    var aud = app.globalData.auditoryResult;
    var vis = app.globalData.visualResult;
    var info = app.globalData.playerInfo || {};
    var isComposite = !!(aud && vis);
    var type = query.type === "visual" ? "visual" : "auditory";

    var dateStr = new Date().toLocaleDateString("zh-CN");
    this.setData({ playerName: info.name || "考生", playerSchool: info.school || "未填写学校", reportDate: dateStr });

    if (isComposite) {
      this.renderComposite(aud, vis);
      this.syncIfNeeded(aud.finalLevel, vis.finalLevel, aud.finalLevel * vis.finalLevel, { auditory: aud, visual: vis });
      return;
    }

    var result = type === "visual" ? vis : aud;
    if (!result) {
      this.setData({ type: type, typeLabel: type === "visual" ? "视觉专注力" : "听觉专注力", hasData: false });
      return;
    }
    this.renderSingle(type, result);
    var auditoryScore = type === "auditory" ? result.finalLevel : 0;
    var visualScore = type === "visual" ? result.finalLevel : 0;
    var rawKey = type === "auditory" ? "auditory" : "visual";
    var rawDetails = {}; rawDetails[rawKey] = result;
    this.syncIfNeeded(auditoryScore, visualScore, 0, rawDetails);
  },

  renderSingle: function (type, result) {
    var minLevel = type === "visual" ? VISUAL_MIN_LEVEL : AUDITORY_MIN_LEVEL;
    var maxLevel = type === "visual" ? VISUAL_MAX_LEVEL : AUDITORY_MAX_LEVEL;
    var grade = gradeSingleChannel(result.finalLevel, minLevel, maxLevel);

    var historyRows = (result.history || []).map(function (h) {
      if (type === "visual") {
        return {
          label: "第 " + h.level + " 级（" + h.tiles + " 格）",
          detail: "命中 " + h.hits + " / 误选 " + h.extras + " · 准确率 " + h.accuracy + "%",
          passed: h.passed
        };
      }
      return {
        label: "第 " + h.level + " 级 · 第 " + h.attemptNumber + " 次",
        detail: "准确率 " + h.accuracy + "%",
        passed: h.isPass
      };
    });

    this.setData({
      isComposite: false,
      type: type,
      typeLabel: type === "visual" ? "视觉专注力" : "听觉专注力",
      finalLevel: result.finalLevel,
      maxLevel: maxLevel,
      gradeText: grade.text,
      gradeCls: grade.cls,
      interpretation: type === "auditory" ? (AUDITORY_LEVEL_INTERPRETATION[result.finalLevel] || "") : "",
      historyRows: historyRows,
      hasData: true
    });
  },

  renderComposite: function (aud, vis) {
    var total = aud.finalLevel * vis.finalLevel;
    var grade = gradeComposite(total);
    this.setData({
      isComposite: true,
      hasData: true,
      auditoryLevel: aud.finalLevel,
      visualLevel: vis.finalLevel,
      compositeTotal: total,
      gradeText: grade.text,
      gradeCls: grade.cls,
      interpretation: AUDITORY_LEVEL_INTERPRETATION[aud.finalLevel] || ""
    });
  },

  syncIfNeeded: function (auditoryScore, visualScore, totalScore, rawDetails) {
    if (this.data.synced) return;
    this.setData({ synced: true });
    var app = getApp();
    var info = app.globalData.playerInfo || {};
    app.syncRecordToSupabase({
      name: info.name || "考生",
      school: info.school || "未填写学校",
      phone: info.phone || "",
      age: info.age || 9,
      auditoryScore: auditoryScore,
      visualScore: visualScore,
      totalScore: totalScore,
      referrerTeacherId: info.referrerTeacherId || "",
      rawDetails: rawDetails
    });
  },

  goHome: function () {
    wx.reLaunch({ url: "/pages/home/home" });
  }
});
