// ==========================================
// 字库、黑名单、序列生成器、拼音打分引擎
// 逐字移植自 concentration_v1.html 的 CHAR_CORPUS / SequenceGenerator / ScoringEngine
// ==========================================
var CHAR_CORPUS = [
  ["天","tian1","t","ian",1],["风","feng1","f","eng",1],["山","shan1","sh","an",1],["春","chun1","ch","un",1],
  ["东","dong1","d","ong",1],["车","che1","ch","e",1],["开","kai1","k","ai",1],["金","jin1","j","in",1],
  ["心","xin1","x","in",1],["空","kong1","k","ong",1],["光","guang1","g","uang",1],["高","gao1","g","ao",1],
  ["安","an1","","an",1],["星","xing1","x","ing",1],["声","sheng1","sh","eng",1],["身","shen1","sh","en",1],
  ["江","jiang1","j","iang",1],["歌","ge1","g","e",1],["花","hua1","h","ua",1],["家","jia1","j","ia",1],
  ["音","yin1","","in",1],["森","sen1","s","en",1],["西","xi1","x","i",1],["飞","fei1","f","ei",1],
  ["包","bao1","b","ao",1],["刀","dao1","d","ao",1],["分","fen1","f","en",1],["关","guan1","g","uan",1],

  ["阳","yang2","y","ang",2],["平","ping2","p","ing",2],["明","ming2","m","ing",2],["云","yun2","y","un",2],
  ["红","hong2","h","ong",2],["南","nan2","n","an",2],["石","shi2","sh","i",2],["文","wen2","w","en",2],
  ["白","bai2","b","ai",2],["年","nian2","n","ian",2],["同","tong2","t","ong",2],["学","xue2","x","ue",2],
  ["林","lin2","l","in",2],["行","xing2","x","ing",2],["前","qian2","q","ian",2],["长","chang2","ch","ang",2],
  ["房","fang2","f","ang",2],["门","men2","m","en",2],["黄","huang2","h","uang",2],["球","qiu2","q","iu",2],
  ["鱼","yu2","y","u",2],["茶","cha2","ch","a",2],["禾","he2","h","e",2],["牛","niu2","n","iu",2],

  ["海","hai3","h","ai",3],["水","shui3","sh","ui",3],["草","cao3","c","ao",3],["雨","yu3","y","u",3],
  ["北","bei3","b","ei",3],["眼","yan3","y","an",3],["手","shou3","sh","ou",3],["口","kou3","k","ou",3],
  ["鸟","niao3","n","iao",3],["马","ma3","m","a",3],["果","guo3","g","uo",3],["火","huo3","h","uo",3],
  ["米","mi3","m","i",3],["土","tu3","t","u",3],["点","dian3","d","ian",3],["里","li3","l","i",3],
  ["走","zou3","z","ou",3],["有","you3","y","ou",3],["雪","xue3","x","ue",3],["子","zi3","z","i",3],

  ["木","mu4","m","u",4],["地","di4","d","i",4],["日","ri4","r","i",4],["月","yue4","y","ue",4],
  ["电","dian4","d","ian",4],["气","qi4","q","i",4],["面","mian4","m","ian",4],["画","hua4","h","ua",4],
  ["菜","cai4","c","ai",4],["肉","rou4","r","ou",4],["树","shu4","sh","u",4],["叶","ye4","y","e",4],
  ["物","wu4","w","u",4],["事","shi4","sh","i",4],["道","dao4","d","ao",4],["路","lu4","l","u",4],
  ["夜","ye4","y","e",4],["亮","liang4","l","iang",4],["大","da4","d","a",4],["正","zheng4","zh","eng",4]
];

var WORD_BLACKLIST_LIST = [
  "天气","太阳","明月","红花","白云","春风","大山","青山","河水","雨水","东风","流水","南山","北大","火车",
  "汽车","电车","马车","白马","黄牛","小鸟","飞鸟","青草","红日","白雪","雨雪","冰雪","春雨","秋风","冬雪",
  "天空","阳光","星光","月光","红星","火光","高山","大海","江河","黄河","长江","树木","大树","森林","木头"
];
function inBlacklist(w) { return WORD_BLACKLIST_LIST.indexOf(w) !== -1; }

var AUDITORY_MIN_LEVEL = 5;
var AUDITORY_MAX_LEVEL = 12;

var SequenceGenerator = {
  generate: function (length) {
    for (var attempt = 0; attempt < 120; attempt++) {
      var seq = [];
      var toneCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
      var usedChars = {};
      var usedPinyins = {};
      var success = true;

      for (var i = 0; i < length; i++) {
        var validPool = CHAR_CORPUS.filter(function (item) {
          var ch = item[0], py = item[1], t = item[4];
          if (usedChars[ch] || usedPinyins[py]) return false;
          if (i >= 2 && seq[i - 1].tone === t && seq[i - 2].tone === t) return false;
          if (toneCount[t] >= Math.ceil(length / 4) + 1) return false;
          if (i >= 1 && inBlacklist(seq[i - 1].char + ch)) return false;
          if (i >= 2 && inBlacklist(seq[i - 2].char + seq[i - 1].char + ch)) return false;
          return true;
        });

        if (validPool.length === 0) { success = false; break; }
        var pick = validPool[Math.floor(Math.random() * validPool.length)];
        var token = { char: pick[0], pinyin: pick[1], initial: pick[2], final: pick[3], tone: pick[4] };
        seq.push(token);
        usedChars[token.char] = true;
        usedPinyins[token.pinyin] = true;
        toneCount[token.tone]++;
      }
      if (success && seq.length === length) return seq;
    }
    var fallback = [];
    var seen = {};
    while (fallback.length < length) {
      var rand = CHAR_CORPUS[Math.floor(Math.random() * CHAR_CORPUS.length)];
      if (!seen[rand[0]]) {
        seen[rand[0]] = true;
        fallback.push({ char: rand[0], pinyin: rand[1], initial: rand[2], final: rand[3], tone: rand[4] });
      }
    }
    return fallback;
  }
};

var TONE_ACCENT_MAP = {
  'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
  'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
  'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
  'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
  'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
  'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v'
};

function normalizeFuzzyPinyin(pinyinStr) {
  if (!pinyinStr) return "";
  var raw = String(pinyinStr).toLowerCase();
  for (var mark in TONE_ACCENT_MAP) {
    if (raw.indexOf(mark) !== -1) raw = raw.split(mark).join(TONE_ACCENT_MAP[mark]);
  }
  var s = raw.replace(/[^a-z]/g, "");
  if (s.indexOf("zh") === 0) s = "z" + s.slice(2);
  else if (s.indexOf("ch") === 0) s = "c" + s.slice(2);
  else if (s.indexOf("sh") === 0) s = "s" + s.slice(2);
  if (s.indexOf("n") === 0 || s.indexOf("r") === 0) s = "l" + s.slice(1);
  s = s.replace(/ang$/, "an").replace(/eng$/, "en").replace(/ing$/, "in").replace(/ong$/, "on").replace(/ung$/, "un");
  if (s === "yue" || s === "yve" || s === "ve" || s === "ue") s = "ye";
  return s;
}

function formatPinyinWithToneMark(numPinyin) {
  if (!numPinyin) return "";
  var m = numPinyin.match(/^([a-z]+)([1-4])?$/i);
  if (!m) return numPinyin;
  var py = m[1].toLowerCase();
  var tone = m[2] ? parseInt(m[2], 10) : 0;
  if (!tone) return py;
  var vowelMap = {
    'a': ['ā', 'á', 'ǎ', 'à'], 'o': ['ō', 'ó', 'ǒ', 'ò'], 'e': ['ē', 'é', 'ě', 'è'],
    'i': ['ī', 'í', 'ǐ', 'ì'], 'u': ['ū', 'ú', 'ǔ', 'ù'], 'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
  };
  var targetVowel = "";
  if (py.indexOf("a") !== -1) targetVowel = "a";
  else if (py.indexOf("o") !== -1) targetVowel = "o";
  else if (py.indexOf("e") !== -1) targetVowel = "e";
  else if (py.indexOf("ui") !== -1) targetVowel = "i";
  else if (py.indexOf("iu") !== -1) targetVowel = "u";
  else {
    for (var i = py.length - 1; i >= 0; i--) {
      if (vowelMap[py[i]]) { targetVowel = py[i]; break; }
    }
  }
  if (targetVowel && vowelMap[targetVowel]) {
    return py.replace(targetVowel, vowelMap[targetVowel][tone - 1]);
  }
  return py;
}

var DIACRITIC_MAP = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['v', 1], 'ǘ': ['v', 2], 'ǚ': ['v', 3], 'ǜ': ['v', 4], 'ü': ['v', 1], 'v': ['v', 1]
};

var ScoringEngine = {
  getCharDistance: function (targetToken, actualToken) {
    if (!actualToken) return 1.0;
    var targetNorm = normalizeFuzzyPinyin(targetToken.pinyin);
    var actualNorm = normalizeFuzzyPinyin(actualToken.pinyin);
    if (targetNorm === actualNorm) return 0;
    var lenA = targetNorm.length, lenB = actualNorm.length;
    if (Math.abs(lenA - lenB) <= 1 && Math.min(lenA, lenB) >= 2) {
      var diff = 0, maxLen = Math.max(lenA, lenB);
      for (var i = 0; i < maxLen; i++) {
        if (targetNorm[i] !== actualNorm[i]) diff++;
      }
      if (diff <= 1) return 0.2;
    }
    return 1.0;
  },

  tokenizeText: function (text) {
    if (!text) return [];
    var tokens = [];
    var trimmed = text.trim();
    var parts = trimmed.split(/[\s,，·\-_/]+/);
    parts.forEach(function (part) {
      if (!part) return;
      var tone = 1, plain = "", p = part.toLowerCase();
      for (var k = 0; k < p.length; k++) {
        var c = p[k];
        if (DIACRITIC_MAP[c]) { plain += DIACRITIC_MAP[c][0]; tone = DIACRITIC_MAP[c][1]; }
        else if (/[a-z]/.test(c)) { plain += c; }
        else if (/[1-4]/.test(c)) { tone = parseInt(c, 10); }
      }
      if (!plain) return;
      var numPy = plain + tone;
      tokens.push({ char: "", pinyin: numPy, pinyinMark: formatPinyinWithToneMark(numPy), tone: tone });
    });
    return tokens;
  },

  evaluate: function (targetSeq, actualTokens) {
    var m = targetSeq.length, n = actualTokens.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [];
      for (var j = 0; j <= n; j++) {
        if (i === 0) dp[i][j] = j;
        else if (j === 0) dp[i][j] = i;
        else dp[i][j] = 0;
      }
    }
    for (var i2 = 1; i2 <= m; i2++) {
      for (var j2 = 1; j2 <= n; j2++) {
        var cost = this.getCharDistance(targetSeq[i2 - 1], actualTokens[j2 - 1]);
        dp[i2][j2] = Math.min(dp[i2 - 1][j2] + 1, dp[i2][j2 - 1] + 1, dp[i2 - 1][j2 - 1] + cost);
      }
    }
    var totalCost = dp[m][n];
    var accuracy = Math.round(Math.max(0, 1 - (totalCost / m)) * 100);
    var threshold = (m <= 8) ? 0.35 : 0.85;
    var isPass = totalCost <= threshold;

    var details = [];
    for (var k = 0; k < m; k++) {
      var t = targetSeq[k];
      var a = (k < actualTokens.length) ? actualTokens[k] : null;
      var dist = a ? this.getCharDistance(t, a) : 1.0;
      var status = "wrong";
      if (dist === 0) status = "hit";
      else if (dist <= 0.25) status = "fuzzy";
      else if (!a) status = "miss";
      details.push({ target: t, actual: a, status: status, cost: dist });
    }
    return { isPass: isPass, accuracy: accuracy, totalCost: totalCost, details: details };
  }
};

// ==========================================
// 页面逻辑
// ==========================================
Page({
  data: {
    stage: "playing",
    levelTitle: "",
    levelTag: "",
    attemptDesc: "",
    cueDots: [],
    playingText: "",
    sequenceLen: 0,
    inputValue: "",
    previewChips: [],
    filledCount: 0,
    isRecording: false,
    hasMyRecording: false,
    targetChips: [],
    actualChips: [],
    bannerClass: "",
    bannerTitle: "",
    bannerSub: "",
    bannerBtnText: ""
  },

  currentLevel: "trial", // "trial" | 5..12
  levelFails: 0,
  passedLevels: [],
  history: [],
  currentSequence: [],
  audioCtx: null,
  recorderManager: null,
  myRecordAudioCtx: null,
  myRecordingPath: null,

  onLoad: function () {
    this.audioCtx = wx.createInnerAudioContext();
    this.initRecorder();
    this.startLevel();
  },

  onUnload: function () {
    if (this.audioCtx) this.audioCtx.destroy();
    if (this.myRecordAudioCtx) this.myRecordAudioCtx.destroy();
  },

  initRecorder: function () {
    var self = this;
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStop(function (res) {
      self.myRecordingPath = res.tempFilePath;
      self.setData({ isRecording: false, hasMyRecording: true });
    });
    this.recorderManager.onError(function (err) {
      console.warn("Recorder note:", err);
      self.setData({ isRecording: false });
      wx.showToast({ title: "录音失败，可直接输入拼音完成测试", icon: "none" });
    });
  },

  toggleMyRecording: function () {
    if (this.data.isRecording) {
      this.recorderManager.stop();
      return;
    }
    this.recorderManager.start({ duration: 60000, format: "mp3" });
    this.setData({ isRecording: true });
  },

  playMyRecording: function () {
    if (!this.myRecordingPath) return;
    if (!this.myRecordAudioCtx) this.myRecordAudioCtx = wx.createInnerAudioContext();
    this.myRecordAudioCtx.src = this.myRecordingPath;
    this.myRecordAudioCtx.play();
  },

  startLevel: function () {
    var isTrial = this.currentLevel === "trial";
    var charCount = isTrial ? 3 : this.currentLevel;
    this.currentSequence = SequenceGenerator.generate(charCount);

    var levelTitle = isTrial ? "试答练习轮 (3 字)" : ("第 " + this.currentLevel + " 级测试");
    var levelTag = isTrial ? "试答练习 · 不计分" : (this.currentLevel + " 个无关联汉字");
    var attemptDesc = isTrial
      ? "热身试答（做对后进入正式测试）"
      : (this.levelFails === 0 ? "第 1 次作答机会" : (this.levelFails === 1 ? "⚠️ 第 2 次机会（换题）" : "⚠️ 第 3 次机会（换题）"));

    this.setData({
      stage: "playing",
      levelTitle: levelTitle,
      levelTag: levelTag,
      attemptDesc: attemptDesc,
      sequenceLen: this.currentSequence.length,
      cueDots: this.currentSequence.map(function () { return ""; }),
      playingText: "🔊 即将开始朗读...",
      inputValue: ""
    });

    var self = this;
    setTimeout(function () { self.playSequence(); }, 400);
  },

  replayCurrent: function () {
    this.setData({ stage: "playing" });
    var self = this;
    setTimeout(function () { self.playSequence(); }, 200);
  },

  playSequence: function () {
    var self = this;
    var seq = this.currentSequence;
    var idx = 0;

    function playNext() {
      if (idx >= seq.length) {
        var dots = seq.map(function () { return "done"; });
        self.setData({ cueDots: dots, playingText: "✅ 播报完毕！准备输入拼音..." });
        setTimeout(function () { self.startInputStage(); }, 400);
        return;
      }
      var dots = seq.map(function (_, i) {
        if (i < idx) return "done";
        if (i === idx) return "playing";
        return "";
      });
      self.setData({
        cueDots: dots,
        playingText: "🔊 正在朗读第 " + (idx + 1) + " 个字 / 共 " + seq.length + " 个字"
      });

      var char = seq[idx].char;
      var started = false;
      var advanced = false;

      function cleanup() {
        self.audioCtx.offPlay(onPlay);
        self.audioCtx.offEnded(onEnded);
        self.audioCtx.offError(onError);
      }
      function advance() {
        if (advanced) return; // 防止 ended+error 重复触发导致多跳一个字
        advanced = true;
        cleanup();
        idx++;
        setTimeout(playNext, 350);
      }
      function onPlay() {
        started = true;
      }
      function onEnded() {
        advance();
      }
      function onError() {
        // 切换 src 时偶尔会在真正开始播放前触发一次误报的 error，
        // 这种情况下重试当前这个字，而不是当成播放完毕直接跳到下一个
        if (!started) {
          cleanup();
          setTimeout(function () { playNext(); }, 200);
          return;
        }
        advance();
      }

      self.audioCtx.onPlay(onPlay);
      self.audioCtx.onEnded(onEnded);
      self.audioCtx.onError(onError);
      self.audioCtx.src = "/assets/audio/" + char + ".mp3";
      self.audioCtx.play();
    }
    playNext();
  },

  startInputStage: function () {
    this.myRecordingPath = null;
    this.setData({
      stage: "input",
      inputValue: "",
      isRecording: false,
      hasMyRecording: false
    });
    this.updatePreviewChips("");
  },

  onInputChange: function (e) {
    var value = e.detail.value;
    this.setData({ inputValue: value });
    this.updatePreviewChips(value);
  },

  updatePreviewChips: function (raw) {
    var tokens = ScoringEngine.tokenizeText(raw);
    var targetCount = this.currentSequence.length;
    var chips = [];
    for (var i = 0; i < targetCount; i++) {
      if (i < tokens.length) {
        var t = tokens[i];
        chips.push({ idx: i + 1, py: t.pinyinMark || formatPinyinWithToneMark(t.pinyin), filled: true });
      } else {
        chips.push({ idx: i + 1, py: "__", filled: false });
      }
    }
    this.setData({ previewChips: chips, filledCount: Math.min(tokens.length, targetCount) });
  },

  submitAnswer: function () {
    var raw = (this.data.inputValue || "").trim();
    if (!raw) {
      wx.showToast({ title: "请先输入拼音", icon: "none" });
      return;
    }
    var tokens = ScoringEngine.tokenizeText(raw);
    var evalResult = ScoringEngine.evaluate(this.currentSequence, tokens);

    if (this.currentLevel !== "trial") {
      this.history.push({
        level: this.currentLevel,
        attemptNumber: this.levelFails + 1,
        accuracy: evalResult.accuracy,
        isPass: evalResult.isPass
      });
    }

    this.renderResult(evalResult);
  },

  renderResult: function (evalResult) {
    var self = this;
    var targetChips = this.currentSequence.map(function (t) {
      return { py: t.pinyinMark || formatPinyinWithToneMark(t.pinyin), tone: t.tone };
    });
    var actualChips = evalResult.details.map(function (d) {
      var py = d.actual ? (d.actual.pinyinMark || formatPinyinWithToneMark(d.actual.pinyin)) : "—";
      var toneLabel = d.actual ? (d.actual.tone + "声") : "漏音";
      return { py: py, tone: toneLabel, status: d.status };
    });

    var isTrial = this.currentLevel === "trial";

    if (isTrial) {
      if (evalResult.isPass) {
        this.pendingAction = function () {
          self.currentLevel = AUDITORY_MIN_LEVEL;
          self.levelFails = 0;
          self.startLevel();
        };
        this.setData({
          stage: "result", targetChips: targetChips, actualChips: actualChips,
          bannerClass: "pass", bannerTitle: "✓ 试答达标！掌握测试方法",
          bannerSub: "准确率 " + evalResult.accuracy + "% · 即将进入正式评测（第 5 级起）",
          bannerBtnText: "🚀 开始正式测评 ➔"
        });
      } else {
        this.pendingAction = function () { self.startLevel(); };
        this.setData({
          stage: "result", targetChips: targetChips, actualChips: actualChips,
          bannerClass: "fail", bannerTitle: "⚠️ 试答未达标，请再试一次",
          bannerSub: "准确率 " + evalResult.accuracy + "%",
          bannerBtnText: "🔄 重新试答 ➔"
        });
      }
      return;
    }

    if (evalResult.isPass) {
      this.passedLevels.push(this.currentLevel);
      this.levelFails = 0;
      if (this.currentLevel < AUDITORY_MAX_LEVEL) {
        var nextLevel = this.currentLevel + 1;
        this.pendingAction = function () { self.currentLevel = nextLevel; self.startLevel(); };
        this.setData({
          stage: "result", targetChips: targetChips, actualChips: actualChips,
          bannerClass: "pass", bannerTitle: "🎉 第 " + this.currentLevel + " 级达标！",
          bannerSub: "准确率 " + evalResult.accuracy + "%",
          bannerBtnText: "晋级第 " + nextLevel + " 级 ➔"
        });
      } else {
        this.pendingAction = function () { self.finish(); };
        this.setData({
          stage: "result", targetChips: targetChips, actualChips: actualChips,
          bannerClass: "pass", bannerTitle: "🏆 满分通关第 12 级！",
          bannerSub: "准确率 " + evalResult.accuracy + "%",
          bannerBtnText: "查看结果 ➔"
        });
      }
    } else {
      this.levelFails++;
      if (this.levelFails < 3) {
        this.pendingAction = function () { self.startLevel(); };
        this.setData({
          stage: "result", targetChips: targetChips, actualChips: actualChips,
          bannerClass: "fail", bannerTitle: "⚠️ 第 " + this.currentLevel + " 级未达标",
          bannerSub: "准确率 " + evalResult.accuracy + "%（还有 " + (3 - this.levelFails) + " 次机会）",
          bannerBtnText: "🔄 换题重试 ➔"
        });
      } else {
        this.pendingAction = function () { self.finish(); };
        this.setData({
          stage: "result", targetChips: targetChips, actualChips: actualChips,
          bannerClass: "fail", bannerTitle: "❌ 第 " + this.currentLevel + " 级三次未达标",
          bannerSub: "已到达能力上限，即将生成结果",
          bannerBtnText: "查看结果 ➔"
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
    app.globalData.auditoryResult = {
      finalLevel: maxLevel,
      passedLevels: this.passedLevels,
      history: this.history
    };
    wx.redirectTo({ url: "/pages/report/report?type=auditory" });
  }
});
