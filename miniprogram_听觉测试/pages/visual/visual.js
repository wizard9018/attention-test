// ==========================================
// 视觉空间记忆测试（柯西方块测验范式）
// 逐项移植自 concentration_v1.html 的 GRID_SIZE / VISUAL_LEVELS_CONFIG /
// generateDistinctRowColShape / startVisualStage1~3 / submitVisualRecall
// ==========================================
var GRID_SIZE = 10;
function cellKey(r, c) { return r + "," + c; }

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function generateDistinctRowColShape(count) {
  var rows = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  var cols = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  var n = Math.min(count, GRID_SIZE);
  var shape = [];
  for (var i = 0; i < n; i++) shape.push({ r: rows[i], c: cols[i] });
  return shape;
}

var VISUAL_LEVELS_CONFIG = {
  trial: { count: 2, title: "试答练习 (2 格，不同行列)", benchmarkSec: 15 },
  5: { count: 3, title: "3 格 (不同行列)", benchmarkSec: 30 },
  6: { count: 4, title: "4 格 (不同行列)", benchmarkSec: 30 },
  7: { count: 5, title: "5 格 (不同行列)", benchmarkSec: 50 },
  8: { count: 6, title: "6 格 (不同行列)", benchmarkSec: 50 },
  9: { count: 7, title: "7 格 (不同行列)", benchmarkSec: 60 },
  10: { count: 8, title: "8 格 (不同行列)", benchmarkSec: 60 }
};
var VISUAL_MIN_LEVEL = 5;
var VISUAL_MAX_LEVEL = 10;

function emptyGrid() {
  var g = [];
  for (var i = 0; i < GRID_SIZE * GRID_SIZE; i++) g.push("");
  return g;
}

Page({
  data: {
    stage: "view", // view | math | recall | result | done
    levelTitle: "",
    levelTag: "",
    attemptDesc: "",
    timeLeft: 0,
    gridCells: emptyGrid(),
    mathExp: "",
    mathTimeLeft: 20,
    mathInput: "",
    mathFeedback: "",
    resultUserGrid: emptyGrid(),
    resultAnswerGrid: emptyGrid(),
    selectedCount: 0,
    targetCount: 0,
    bannerClass: "",
    bannerTitle: "",
    bannerSub: "",
    bannerBtnText: ""
  },

  currentLevel: "trial",
  levelFails: 0,
  passedLevels: [],
  history: [],
  pattern: [],
  userSelection: {},
  mathAnswer: 0,
  viewTimer: null,
  mathTimer: null,
  viewStartTime: 0,
  mathStartTime: 0,
  recallStartTime: 0,
  viewDuration: 0,
  mathDuration: 0,
  recallDuration: 0,

  onLoad: function () {
    this.startRound("trial");
  },

  onUnload: function () {
    if (this.viewTimer) clearInterval(this.viewTimer);
    if (this.mathTimer) clearInterval(this.mathTimer);
  },

  startRound: function (lvl) {
    this.currentLevel = lvl;
    this.userSelection = {};
    var cfg = VISUAL_LEVELS_CONFIG[lvl] || VISUAL_LEVELS_CONFIG[5];
    this.pattern = generateDistinctRowColShape(cfg.count);

    var isTrial = lvl === "trial";
    var levelTitle = isTrial ? "试答练习轮 (2 格)" : ("第 " + lvl + " 级测试");
    var levelTag = isTrial ? "试答练习 · 不计分" : cfg.title;
    var attemptDesc = isTrial
      ? "热身试答（做对后进入正式测试）"
      : (this.levelFails === 0 ? "第 1 次作答机会" : (this.levelFails === 1 ? "⚠️ 第 2 次机会（换图）" : "⚠️ 第 3 次机会（换图）"));

    this.setData({ levelTitle: levelTitle, levelTag: levelTag, attemptDesc: attemptDesc });
    this.startViewStage(cfg);
  },

  startViewStage: function (cfg) {
    var self = this;
    var grid = emptyGrid();
    this.pattern.forEach(function (p) {
      grid[p.r * GRID_SIZE + p.c] = "blue";
    });

    this.viewStartTime = Date.now();
    var timeLeft = cfg.benchmarkSec;
    this.setData({ stage: "view", gridCells: grid, timeLeft: timeLeft });

    if (this.viewTimer) clearInterval(this.viewTimer);
    this.viewTimer = setInterval(function () {
      timeLeft--;
      self.setData({ timeLeft: timeLeft });
      if (timeLeft <= 0) {
        clearInterval(self.viewTimer);
        self.viewTimer = null;
        self.viewDuration = cfg.benchmarkSec;
        self.startMathStage();
      }
    }, 1000);
  },

  skipViewStage: function () {
    if (this.viewTimer) { clearInterval(this.viewTimer); this.viewTimer = null; }
    this.viewDuration = Math.round((Date.now() - this.viewStartTime) / 1000);
    this.startMathStage();
  },

  startMathStage: function () {
    if (this.viewTimer) { clearInterval(this.viewTimer); this.viewTimer = null; }
    this.mathStartTime = Date.now();
    this.generateMathProblem();
    this.setData({ stage: "math", mathInput: "", mathFeedback: "", mathTimeLeft: 20 });

    var self = this;
    var timeLeft = 20;
    if (this.mathTimer) clearInterval(this.mathTimer);
    this.mathTimer = setInterval(function () {
      timeLeft--;
      self.setData({ mathTimeLeft: timeLeft });
      if (timeLeft <= 0) {
        self.setData({ mathFeedback: "时间到，更换算式！" });
        setTimeout(function () {
          self.generateMathProblem();
          timeLeft = 20;
          self.setData({ mathTimeLeft: timeLeft, mathInput: "", mathFeedback: "" });
        }, 500);
      }
    }, 1000);
  },

  generateMathProblem: function () {
    var a = Math.floor(Math.random() * 8) + 2;
    var b = Math.floor(Math.random() * 8) + 2;
    var isPlus = Math.random() > 0.45;
    var exp;
    if (!isPlus) {
      if (b > a) { var t = a; a = b; b = t; }
      if (a === b) { if (a < 9) a++; else b--; }
      this.mathAnswer = a - b;
      exp = a + " - " + b + " = ?";
    } else {
      this.mathAnswer = a + b;
      exp = a + " + " + b + " = ?";
    }
    this.setData({ mathExp: exp });
  },

  onMathInput: function (e) {
    this.setData({ mathInput: e.detail.value });
  },

  checkMathAnswer: function () {
    var val = parseInt((this.data.mathInput || "").trim(), 10);
    if (isNaN(val)) {
      this.setData({ mathFeedback: "⚠️ 请输入数字答案" });
      return;
    }
    if (val === this.mathAnswer) {
      if (this.mathTimer) { clearInterval(this.mathTimer); this.mathTimer = null; }
      this.mathDuration = Math.round((Date.now() - this.mathStartTime) / 1000);
      this.setData({ mathFeedback: "✓ 计算正确！进入网格复原..." });
      var self = this;
      setTimeout(function () { self.startRecallStage(); }, 350);
    } else {
      this.setData({ mathFeedback: "❌ 计算有误，请重试！", mathInput: "" });
    }
  },

  startRecallStage: function () {
    this.userSelection = {};
    this.recallStartTime = Date.now();
    this.setData({
      stage: "recall",
      gridCells: emptyGrid(),
      targetCount: this.pattern.length,
      selectedCount: 0
    });
  },

  onCellTap: function (e) {
    if (this.data.stage !== "recall") return;
    var index = e.currentTarget.dataset.index;
    var r = Math.floor(index / GRID_SIZE);
    var c = index % GRID_SIZE;
    var k = cellKey(r, c);
    var grid = this.data.gridCells.slice();

    if (this.userSelection[k]) {
      delete this.userSelection[k];
      grid[index] = "";
    } else {
      this.userSelection[k] = true;
      grid[index] = "green";
    }
    var count = Object.keys(this.userSelection).length;
    this.setData({ gridCells: grid, selectedCount: count });
  },

  submitRecall: function () {
    var selectedKeys = Object.keys(this.userSelection);
    if (selectedKeys.length === 0) {
      wx.showToast({ title: "请至少点选几个色块", icon: "none" });
      return;
    }
    this.recallDuration = Math.round((Date.now() - this.recallStartTime) / 1000);

    var correctSet = {};
    this.pattern.forEach(function (p) { correctSet[cellKey(p.r, p.c)] = true; });

    var hits = 0, misses = 0, extras = 0;
    Object.keys(correctSet).forEach(function (k) {
      if (this.userSelection[k]) hits++; else misses++;
    }, this);
    selectedKeys.forEach(function (k) {
      if (!correctSet[k]) extras++;
    });

    var isFullPass = (hits === this.pattern.length && extras === 0);
    var accuracy = Math.round((hits / Math.max(this.pattern.length, selectedKeys.length)) * 100);

    if (this.currentLevel !== "trial") {
      this.history.push({
        level: this.currentLevel, passed: isFullPass,
        viewTime: this.viewDuration, mathTime: this.mathDuration, recallTime: this.recallDuration,
        accuracy: accuracy, hits: hits, misses: misses, extras: extras, tiles: this.pattern.length
      });
    }

    this.showResult(isFullPass, correctSet, selectedKeys);
  },

  showResult: function (isFullPass, correctSet, selectedKeys) {
    var self = this;
    var userGrid = emptyGrid();
    var answerGrid = emptyGrid();
    selectedKeys.forEach(function (k) {
      var parts = k.split(",");
      userGrid[parseInt(parts[0], 10) * GRID_SIZE + parseInt(parts[1], 10)] = "green";
    });
    Object.keys(correctSet).forEach(function (k) {
      var parts = k.split(",");
      answerGrid[parseInt(parts[0], 10) * GRID_SIZE + parseInt(parts[1], 10)] = "blue";
    });

    var isTrial = this.currentLevel === "trial";

    if (isTrial) {
      if (isFullPass) {
        this.pendingAction = function () { self.startRound(5); };
        this.setData({
          stage: "result", resultUserGrid: userGrid, resultAnswerGrid: answerGrid,
          bannerClass: "pass", bannerTitle: "✓ 试答完全吻合！掌握测试方法",
          bannerSub: "即将进入正式评测（第 5 级起）", bannerBtnText: "🚀 开始正式视觉评测 ➔"
        });
      } else {
        this.pendingAction = function () { self.startRound("trial"); };
        this.setData({
          stage: "result", resultUserGrid: userGrid, resultAnswerGrid: answerGrid,
          bannerClass: "fail", bannerTitle: "⚠️ 试答未达标，请再试一次",
          bannerSub: "输入位置与标准位置不一致", bannerBtnText: "🔄 重新试答 ➔"
        });
      }
      return;
    }

    if (isFullPass) {
      this.passedLevels.push(this.currentLevel);
      this.levelFails = 0;
      if (this.currentLevel < VISUAL_MAX_LEVEL) {
        var nextLevel = this.currentLevel + 1;
        this.pendingAction = function () { self.startRound(nextLevel); };
        this.setData({
          stage: "result", resultUserGrid: userGrid, resultAnswerGrid: answerGrid,
          bannerClass: "pass", bannerTitle: "🎉 第 " + this.currentLevel + " 级完全吻合！",
          bannerSub: "输入位置与标准位置完全一致", bannerBtnText: "晋级第 " + nextLevel + " 级 ➔"
        });
      } else {
        this.pendingAction = function () { self.finish(); };
        this.setData({
          stage: "result", resultUserGrid: userGrid, resultAnswerGrid: answerGrid,
          bannerClass: "pass", bannerTitle: "🏆 满分通关第 10 级！",
          bannerSub: "视觉空间记忆测试完成", bannerBtnText: "查看结果 ➔"
        });
      }
    } else {
      this.levelFails++;
      if (this.levelFails < 3) {
        var thisLevel = this.currentLevel;
        this.pendingAction = function () { self.startRound(thisLevel); };
        this.setData({
          stage: "result", resultUserGrid: userGrid, resultAnswerGrid: answerGrid,
          bannerClass: "fail", bannerTitle: "⚠️ 第 " + this.currentLevel + " 级未完全吻合",
          bannerSub: "还有 " + (3 - this.levelFails) + " 次机会", bannerBtnText: "🔄 换图重试 ➔"
        });
      } else {
        this.pendingAction = function () { self.finish(); };
        this.setData({
          stage: "result", resultUserGrid: userGrid, resultAnswerGrid: answerGrid,
          bannerClass: "fail", bannerTitle: "❌ 第 " + this.currentLevel + " 级三次未吻合，测试结束",
          bannerSub: "视觉空间记忆测试完成", bannerBtnText: "查看结果 ➔"
        });
      }
    }
  },

  onBannerAction: function () {
    if (this.pendingAction) this.pendingAction();
  },

  finish: function () {
    var maxLevel = this.passedLevels.length > 0 ? Math.max.apply(null, this.passedLevels) : 4;
    var app = getApp();
    app.globalData.visualResult = {
      finalLevel: maxLevel,
      passedLevels: this.passedLevels,
      history: this.history
    };
    wx.redirectTo({ url: "/pages/report/report?type=visual" });
  }
});
