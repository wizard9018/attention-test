// ==========================================
// 测评报告（单项听觉 / 单项视觉 / 双通道综合）
// 分级评语、常模对比、训练处方、认知诊断逐项移植自 concentration_v1.html
// 的 gradeSingleChannel / AUDITORY_LEVEL_INTERPRETATION / getAgeNorm /
// renderTrainingPrescriptions / renderCognitiveDiagnosis
// ==========================================
var LEVELS = require("../../utils/constants.js");
var AUDITORY_MIN_LEVEL = LEVELS.AUDITORY_MIN_LEVEL;
var AUDITORY_MAX_LEVEL = LEVELS.AUDITORY_MAX_LEVEL;
var VISUAL_MIN_LEVEL = LEVELS.VISUAL_MIN_LEVEL;
var VISUAL_MAX_LEVEL = LEVELS.VISUAL_MAX_LEVEL;

var AUDITORY_AGE_NORMS = { 5:4, 6:4, 7:5, 8:5, 9:6, 10:6, 11:7, 12:7, 13:8, 14:8, 15:8, 16:9, 17:9, 18:9 };
var VISUAL_AGE_NORMS = { 5:4, 6:5, 7:5, 8:6, 9:6, 10:7, 11:7, 12:8, 13:8, 14:8, 15:9, 16:9, 17:9, 18:10 };
function getAgeNorm(table, age) {
  var clamped = Math.max(5, Math.min(18, age));
  return table[clamped];
}
function ageNormText(label, userLevel, avgLevel) {
  var diff = userLevel - avgLevel;
  var cmp = diff > 0 ? ("高于同龄平均 " + diff + " 级") : diff < 0 ? ("低于同龄平均 " + Math.abs(diff) + " 级") : "与同龄平均持平";
  return label + "：您 " + userLevel + " 级 · 同龄平均 " + avgLevel + " 级（" + cmp + "）";
}

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

function cognitiveDiagnosis(sAud, sVis) {
  var normAud = sAud / 12;
  var normVis = sVis / 10;
  var diff = normAud - normVis;
  if (Math.abs(diff) <= 0.12) {
    return "【双通道均衡协同型】考生的听觉序列记忆与视觉空间加工能力高度匹配，大脑双侧感知加工通路协同良好。在日常课堂听讲与板书记录时能流畅无缝切换，在复合信息处理时具有极强的认知稳定性和持久抗干扰能力。";
  }
  if (diff > 0.12) {
    return "【听觉感知优势型】考生的听觉记忆跨度显著优于视觉空间记忆，对声音、语调、语言复述具有很强的敏感度与记忆粘性，但对复杂空间图形或版面排布的复原相对容易出现偏差。学习建议：采用\"出声诵读\"、\"自我复述\"法强化记忆，在理科几何或图表学习中多辅以语言口诀辅助建立空间表象。";
  }
  return "【视觉空间优势型】考生的视觉空间模式识别与工作记忆显著优于听觉序列复述，在看图、几何感知、板书捕捉方面具备敏锐直觉，但纯口播听讲时容易出现听觉疲劳或漏听。学习建议：在听讲时配合做思维导图或关键词勾画（以视带听），避免长时间处于纯声音无视觉载体的单调信息流中。";
}

function avgOf(list, key, fallback) {
  if (!list || !list.length) return fallback;
  var sum = 0;
  list.forEach(function (item) { sum += (item[key] || 0); });
  return sum / list.length;
}

function cognitiveDimensions(aud, vis, total) {
  var audAcc = avgOf(aud.history, "accuracy", 80);
  var visAcc = avgOf(vis.history, "accuracy", 80);
  var avgMathTime = avgOf(vis.history, "mathTime", 8);

  var d1 = Math.min(100, Math.max(30, Math.round(((aud.finalLevel - 4) / 8) * 100)));
  var d2 = Math.min(100, Math.max(35, Math.round(audAcc)));
  var d3 = Math.min(100, Math.max(30, Math.round(((vis.finalLevel - 4) / 6) * 100)));
  var d4 = Math.min(100, Math.max(35, Math.round(visAcc)));
  var d5 = Math.min(100, Math.max(40, Math.round(100 - avgMathTime * 4)));
  var d6 = Math.min(100, Math.max(30, Math.round((total / 120) * 100)));

  return [
    { label: "听觉记忆跨度", value: d1 },
    { label: "听辨辨析精度", value: d2 },
    { label: "视空工作记忆", value: d3 },
    { label: "空间重构精度", value: d4 },
    { label: "抗干扰稳定性", value: d5 },
    { label: "双通道协同效能", value: d6 }
  ];
}

function trainingPrescriptions(sAud, sVis, mode) {
  var list = [];
  if (mode === "dual" || mode === "auditory") {
    list.push(sAud <= 6
      ? "【听觉记忆跨度强化】建议每日进行 5 分钟『数字倒背』或『无关联词倒背』训练，由 4 词起步逐步递增至 8 词，建立听觉缓冲区的容量扩展。"
      : "【听觉进阶挑战】听觉记忆跨度良好，建议开展『背景噪音抗干扰复述』，在微弱环境音背景下练习听取核心指令，锻炼高阶听觉注意选择性。");
  }
  if (mode === "dual" || mode === "visual") {
    list.push(sVis <= 6
      ? "【空间定桩与工作记忆训练】采用 3×3 至 5×5 的『舒尔特方格』及空间位置记忆积木进行视觉广度扩充，学会利用对称性或图形特征线索建立视觉记忆桩。"
      : "【视空结构深度迁移】视觉空间建构能力扎实，可在日常学习中多接触复杂几何折叠、三视图还原等高阶空间智力游戏，进一步激发空间推理潜能。");
  }
  if (mode === "dual") {
    list.push("【双通道联合编码】提倡多模态协同记忆法（眼看、耳听、口读、手写四位一体），彻底打通左右脑感觉通道的快速通路。");
  }
  return list;
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
    ageNormRows: [],
    diagnosisText: "",
    trainingRows: [],
    dimensionRows: [],
    showContinueBtn: false,
    continueBtnText: "",
    continueUrl: "",
    synced: false
  },

  onLoad: function (query) {
    var app = getApp();
    var aud = app.globalData.auditoryResult;
    var vis = app.globalData.visualResult;
    var age = 9;
    var isComposite = !!(aud && vis);
    var type = query.type === "visual" ? "visual" : "auditory";

    var dateStr = new Date().toLocaleDateString("zh-CN");
    this.setData({ playerName: app.globalData.visitorId, reportDate: dateStr });

    if (isComposite) {
      this.renderComposite(aud, vis, age);
      this.syncIfNeeded(aud.finalLevel, vis.finalLevel, aud.finalLevel * vis.finalLevel, { auditory: aud, visual: vis });
      return;
    }

    var result = type === "visual" ? vis : aud;
    if (!result) {
      this.setData({ type: type, typeLabel: type === "visual" ? "视觉专注力" : "听觉专注力", hasData: false });
      return;
    }
    this.renderSingle(type, result, age);

    var testMode = app.globalData.testMode;
    if (testMode === "dual") {
      // 双通道模式下只完成了一项，先展示这一项的结果，暂不同步数据库，
      // 等两项都做完在 composite 分支一次性同步，避免生成两条重复记录
      var otherIsAuditory = type === "visual";
      this.setData({
        showContinueBtn: true,
        continueBtnText: otherIsAuditory ? "🎧 继续挑战听觉专注力测试" : "👁️ 继续挑战视觉专注力测试",
        continueUrl: otherIsAuditory ? "/pages/auditory/auditory" : "/pages/visual/visual"
      });
      return;
    }

    var auditoryScore = type === "auditory" ? result.finalLevel : 0;
    var visualScore = type === "visual" ? result.finalLevel : 0;
    var rawKey = type === "auditory" ? "auditory" : "visual";
    var rawDetails = {}; rawDetails[rawKey] = result;
    this.syncIfNeeded(auditoryScore, visualScore, 0, rawDetails);
  },

  goContinue: function () {
    wx.redirectTo({ url: this.data.continueUrl });
  },

  renderSingle: function (type, result, age) {
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

    var ageNormRows = type === "visual"
      ? [ageNormText("视觉空间记忆容量", result.finalLevel, getAgeNorm(VISUAL_AGE_NORMS, age))]
      : [ageNormText("听觉记忆跨度", result.finalLevel, getAgeNorm(AUDITORY_AGE_NORMS, age))];

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
      ageNormRows: ageNormRows,
      trainingRows: trainingPrescriptions(type === "auditory" ? result.finalLevel : 0, type === "visual" ? result.finalLevel : 0, type),
      hasData: true
    });
  },

  renderComposite: function (aud, vis, age) {
    var total = aud.finalLevel * vis.finalLevel;
    var grade = gradeComposite(total);
    var ageNormRows = [
      ageNormText("听觉记忆跨度", aud.finalLevel, getAgeNorm(AUDITORY_AGE_NORMS, age)),
      ageNormText("视觉空间记忆容量", vis.finalLevel, getAgeNorm(VISUAL_AGE_NORMS, age))
    ];
    this.setData({
      isComposite: true,
      hasData: true,
      auditoryLevel: aud.finalLevel,
      visualLevel: vis.finalLevel,
      compositeTotal: total,
      gradeText: grade.text,
      gradeCls: grade.cls,
      interpretation: AUDITORY_LEVEL_INTERPRETATION[aud.finalLevel] || "",
      ageNormRows: ageNormRows,
      diagnosisText: cognitiveDiagnosis(aud.finalLevel, vis.finalLevel),
      trainingRows: trainingPrescriptions(aud.finalLevel, vis.finalLevel, "dual"),
      dimensionRows: cognitiveDimensions(aud, vis, total)
    });
  },

  syncIfNeeded: function (auditoryScore, visualScore, totalScore, rawDetails) {
    if (this.data.synced) return;
    this.setData({ synced: true });
    var app = getApp();
    app.syncRecordToSupabase({
      name: app.globalData.visitorId,
      school: "",
      phone: "",
      age: 9,
      auditoryScore: auditoryScore,
      visualScore: visualScore,
      totalScore: totalScore,
      referrerTeacherId: app.globalData.referrerTeacherId || "",
      rawDetails: rawDetails
    });
  },

  goHome: function () {
    wx.reLaunch({ url: "/pages/home/home" });
  }
});
