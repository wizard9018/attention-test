/* 音节级发音打分（在浏览器里本地算）
 * 流程：录音 → 重采样 16k → 音素识别模型(onnxruntime-web) → 和"标准音素序列"做 CTC 强制对齐
 *       → 每个音素的"像不像"得分(模型在对齐位置认为是这个音素的概率，近音素算一类) → 按音节取平均。
 * 纯计算部分(ctcAlign / scorePhonemes / classOf)不依赖浏览器，可以在 Node 里测。
 */
(function (root) {
  "use strict";
  var BLANK = 0, SR = 16000;
  var ORT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";

  // 近音素：弱读元音、闪音等，说得"差不多"就算对，不扣分
  var LENIENT = {
    "ə": ["ə", "ɐ", "ɪ", "ᵻ", "ɚ"], "ɐ": ["ɐ", "ə", "ɪ", "ᵻ"], "ɪ": ["ɪ", "ᵻ", "ə", "ɐ"], "ᵻ": ["ᵻ", "ɪ", "ə", "ɐ"],
    "ɚ": ["ɚ", "ə", "ɜ"], "ɾ": ["ɾ", "t", "d"], "ɹ": ["ɹ", "r"], "ɡ": ["ɡ", "g"],
    "iː": ["iː", "i"], "uː": ["uː", "u"], "ɑː": ["ɑː", "ɑ"], "ɔː": ["ɔː", "ɔ"], "eː": ["eː", "e"]
  };

  var VOWEL_CHARS = "aeiouæɑɒɔəɛɜɪʊʌɐɚɝᵻɨɵøœʏ";
  function isVowelSym(s) { for (var i = 0; i < s.length; i++) if (VOWEL_CHARS.indexOf(s[i]) >= 0) return true; return false; }

  // 一个期望音素 → 算作"对"的音素 id 列表（只保留模型词表里有的）
  function classOf(sym, vocab) {
    if (sym === "ə" || sym === "ɐ" || sym === "ᵻ") {   // 弱读元音读法很灵活：这个位置读出任何一个元音都算对
      return Object.keys(vocab).filter(isVowelSym).map(function (k) { return vocab[k]; });
    }
    var list = (LENIENT[sym] || [sym]).slice();
    if (/ɹ$/.test(sym) && sym.length > 1) list.push(sym.slice(0, -1), "ɚ");   // ɛɹ、ɑːɹ 这类带 r 的元音，模型可能拆成 元音 + ɹ
    var ids = [];
    list.forEach(function (s) { if (vocab[s] != null && ids.indexOf(vocab[s]) < 0) ids.push(vocab[s]); });
    return ids;
  }

  function logSoftmax(logits, T, V) {
    var out = new Float32Array(T * V);
    for (var t = 0; t < T; t++) {
      var o = t * V, m = -Infinity, s = 0, i;
      for (i = 0; i < V; i++) if (logits[o + i] > m) m = logits[o + i];
      for (i = 0; i < V; i++) s += Math.exp(logits[o + i] - m);
      var ls = m + Math.log(s);
      for (i = 0; i < V; i++) out[o + i] = logits[o + i] - ls;
    }
    return out;
  }

  // CTC 强制对齐(Viterbi)：返回每个目标音素占用的帧下标列表；帧数不够放不下时返回 null
  function ctcAlign(lp, T, V, ids) {
    var N = ids.length, S = 2 * N + 1, NEG = -1e30, s, t;
    if (N === 0 || T < N) return null;
    var ext = new Int32Array(S);
    for (s = 0; s < S; s++) ext[s] = (s % 2 === 0) ? BLANK : ids[(s - 1) / 2];
    var prev = new Float64Array(S).fill(NEG), cur = new Float64Array(S), back = new Uint8Array(T * S);
    prev[0] = lp[BLANK]; prev[1] = lp[ext[1]];
    for (t = 1; t < T; t++) {
      var o = t * V;
      for (s = 0; s < S; s++) {
        var best = prev[s], b = 0;
        if (s >= 1 && prev[s - 1] > best) { best = prev[s - 1]; b = 1; }
        if (s >= 2 && ext[s] !== BLANK && ext[s] !== ext[s - 2] && prev[s - 2] > best) { best = prev[s - 2]; b = 2; }
        cur[s] = best + lp[o + ext[s]]; back[t * S + s] = b;
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    s = (S > 1 && prev[S - 2] > prev[S - 1]) ? S - 2 : S - 1;
    if (prev[s] <= NEG / 2) return null;
    var frames = []; for (var i = 0; i < N; i++) frames.push([]);
    for (t = T - 1; t >= 0; t--) {
      if (s % 2 === 1) frames[(s - 1) / 2].push(t);
      s -= back[t * S + s];
    }
    return frames;
  }

  // logits → 每个音素的得分(0~1)。phStr 例如 "æ k t ɹ ə s"
  function scorePhonemes(logits, T, V, phStr, vocab) {
    var syms = phStr.split(" "), ids = syms.map(function (p) { return vocab[p]; });
    if (ids.some(function (x) { return x == null; })) return null;
    var lp = logSoftmax(logits, T, V), frames = ctcAlign(lp, T, V, ids);
    if (!frames) return syms.map(function (p) { return { p: p, score: 0 }; });
    return syms.map(function (p, i) {
      var cls = classOf(p, vocab), best = 0;
      frames[i].forEach(function (t) {
        var s = 0; cls.forEach(function (k) { s += Math.exp(lp[t * V + k]); });
        if (s > best) best = s;
      });
      return { p: p, score: Math.min(1, best) };
    });
  }

  // 音素得分 → 音节得分。starts 是每个音节第一个音素的下标
  function scoreSyllables(phs, starts) {
    var sy = [];
    for (var i = 0; i < starts.length; i++) {
      var a = starts[i], b = i + 1 < starts.length ? starts[i + 1] : phs.length, part = phs.slice(a, b), sum = 0;
      part.forEach(function (x) { sum += x.score; });
      sy.push({ phonemes: part, score: part.length ? sum / part.length : 0 });
    }
    return sy;
  }

  // ---- 以下只在浏览器里用 ----
  var session = null, vocab = null, loading = null;

  function loadScript(url) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = url; s.onload = res; s.onerror = function () { rej(new Error("脚本加载失败")); };
      document.head.appendChild(s);
    });
  }

  // 取模型文件(带进度)，存进浏览器缓存，下次不用再下
  function fetchWithCache(url, onProgress) {
    var cacheName = "phoneme-model-v1";
    return (window.caches ? caches.open(cacheName) : Promise.resolve(null)).then(function (cache) {
      return (cache ? cache.match(url) : Promise.resolve(null)).then(function (hit) {
        if (hit) return hit.arrayBuffer();
        return fetch(url).then(function (r) {
          if (!r.ok) throw new Error("模型下载失败 " + r.status);
          var total = +r.headers.get("Content-Length") || 0, got = 0, chunks = [], reader = r.body.getReader();
          function pump() {
            return reader.read().then(function (x) {
              if (x.done) return;
              chunks.push(x.value); got += x.value.length;
              if (onProgress) onProgress(got, total);
              return pump();
            });
          }
          return pump().then(function () {
            var blob = new Blob(chunks);
            if (cache) cache.put(url, new Response(blob)).catch(function () {});
            return blob.arrayBuffer();
          });
        });
      });
    });
  }

  function load(base, onProgress) {
    if (loading) return loading;
    loading = Promise.all([
      fetch(base + "vocab.json").then(function (r) { return r.json(); }),
      root.ort ? Promise.resolve() : loadScript(ORT_URL)
    ]).then(function (x) {
      vocab = x[0];
      root.ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 1);
      return fetchWithCache(base + "model_q8.onnx", onProgress);
    }).then(function (buf) {
      return root.ort.InferenceSession.create(buf, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    }).then(function (s) { session = s; return true; }).catch(function (e) { loading = null; throw e; });
    return loading;
  }

  // 录音 → 单声道 16k 的 Float32Array，并去掉头尾的静音(缩短识别时间)
  function toMono16k(audioBuffer) {
    var len = Math.ceil(audioBuffer.duration * SR);
    var ctx = new OfflineAudioContext(1, len, SR), src = ctx.createBufferSource();
    src.buffer = audioBuffer; src.connect(ctx.destination); src.start();
    return ctx.startRendering().then(function (r) { return trimSilence(r.getChannelData(0)); });
  }
  function trimSilence(x) {
    var W = 320, n = Math.floor(x.length / W), e = [], i, j, mx = 0;
    for (i = 0; i < n; i++) { var s = 0; for (j = 0; j < W; j++) s += x[i * W + j] * x[i * W + j]; e.push(Math.sqrt(s / W)); if (e[i] > mx) mx = e[i]; }
    var th = mx * 0.06, a = 0, b = n - 1;
    while (a < n && e[a] < th) a++;
    while (b > a && e[b] < th) b--;
    a = Math.max(0, a - 8); b = Math.min(n - 1, b + 8);   // 前后各留 160ms
    return x.slice(a * W, (b + 1) * W);
  }

  // 打分一个词。wav：16k 单声道 Float32Array；entry：phonemes.json 里这个词的 {p, s}
  function scoreWord(wav, entry) {
    var m = 0, v = 0, i;
    for (i = 0; i < wav.length; i++) m += wav[i]; m /= wav.length;
    for (i = 0; i < wav.length; i++) v += (wav[i] - m) * (wav[i] - m); v = Math.sqrt(v / wav.length + 1e-7);
    var x = new Float32Array(wav.length); for (i = 0; i < wav.length; i++) x[i] = (wav[i] - m) / v;
    var t0 = Date.now();
    return session.run({ input_values: new root.ort.Tensor("float32", x, [1, x.length]) }).then(function (out) {
      var L = out.logits, T = L.dims[1], V = L.dims[2];
      var phs = scorePhonemes(L.data, T, V, entry.p, vocab);
      if (!phs) return null;
      var sy = scoreSyllables(phs, entry.s), sum = 0;
      sy.forEach(function (s) { sum += s.score; });
      return { overall: sum / sy.length, syllables: sy, ms: Date.now() - t0 };
    });
  }

  root.PhonemeScorer = {
    load: load, toMono16k: toMono16k, scoreWord: scoreWord, isReady: function () { return !!session; },
    // 给 Node 测试用的纯计算部分
    _core: { classOf: classOf, logSoftmax: logSoftmax, ctcAlign: ctcAlign, scorePhonemes: scorePhonemes, scoreSyllables: scoreSyllables }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PhonemeScorer;
})(typeof window !== "undefined" ? window : globalThis);
