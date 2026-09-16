var SUPABASE_URL = "https://knhpwhdgzwhdpnbsrbty.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaHB3aGRnendoZHBuYnNyYnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzM5MzIsImV4cCI6MjEwNDc0OTkzMn0.Nsd_fxNquX-_hTLyKwteHuezgp2HI4-rNWiMC-XTohI";

App({
  globalData: {
    playerInfo: null,     // { name, school, phone, age, referrerTeacherId }
    testMode: "dual",     // "dual" | "auditory" | "visual"
    auditoryResult: null, // { finalLevel, passedLevels, history }
    visualResult: null    // { finalLevel, passedLevels, history }
  },

  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,

  // 同步一条测评记录到 Supabase，逻辑跟 concentration_v1.html 的
  // syncRecordToSupabase 一致：未测的通道传 0（数据库列是 NOT NULL，
  // 真实得分最低是 5 级，0 只会出现在"未测"场景）
  syncRecordToSupabase: function (opts) {
    var payload = {
      record_id: "rec_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      player_name: opts.name,
      player_school: opts.school,
      player_phone: opts.phone,
      player_age: opts.age,
      auditory_score: opts.auditoryScore || 0,
      visual_score: opts.visualScore || 0,
      total_score: opts.totalScore || 0,
      referrer_teacher_id: opts.referrerTeacherId || null,
      test_date: new Date().toISOString().slice(0, 10),
      raw_details: opts.rawDetails || {}
    };
    wx.request({
      url: SUPABASE_URL + "/rest/v1/attention_test_records",
      method: "POST",
      header: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "return=minimal"
      },
      data: payload,
      fail: function (err) { console.warn("Supabase sync note:", err); }
    });
  },

  onLaunch: function () {}
});
