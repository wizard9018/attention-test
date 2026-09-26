-- 听觉专注训练：学生账号 + 学习进度
-- 在 Supabase 控制台 -> SQL Editor 里运行一次即可

create table if not exists training_students (
  referral_code text not null,       -- 5位推荐码/工号
  student_no text not null,          -- 001-999
  password text not null default '123456',
  student_name text,                 -- 管理员手动给这个学生编号填的姓名
  created_at timestamptz not null default now(),
  primary key (referral_code, student_no)
);

create table if not exists training_progress (
  referral_code text not null,
  student_no text not null,
  difficulty text not null,          -- 'junior' | 'senior'
  group_index int not null default 0,     -- 当前学到第几组(0起)
  cursor_index int not null default 0,    -- 组内学到第几个词(0起)
  words_per_session int not null default 3,
  updated_at timestamptz not null default now(),
  primary key (referral_code, student_no, difficulty)
);

-- 学生跟读录音：给管理员回听 + 反馈用。录音本身很短，直接存成 base64 文本，
-- 不用另外建 Storage bucket（那个要在控制台手动建，省一步）。
create table if not exists training_recordings (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  student_no text not null,
  difficulty text not null,
  unit_index int not null,
  gender text not null default 'male',       -- 当时用的朗读音色，回放标准音要用
  words jsonb not null,                       -- [{id,word,meaning}, ...] 这一批学的词
  audio_base64 text not null,                 -- 录音内容(webm)，前端转 data URL 播放
  admin_feedback text,
  admin_status text,                          -- 'pass' | 'retry'，管理员批改这一组的结果
  admin_feedback_audio text,                  -- 老师的语音反馈(webm base64)
  created_at timestamptz not null default now()
);

-- 每完成一遍听力(pass1)就记一条，用来在 header 里显示"今天学了几组"，
-- 并且可以点回去任何一组重听/重录（不影响 training_progress 里的真实进度）。
create table if not exists training_batches (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  student_no text not null,
  difficulty text not null,
  unit_index int not null,
  cursor_start int not null,
  words jsonb not null,               -- [{id,word,meaning}, ...] 这一批的词
  gender text not null default 'male',
  created_at timestamptz not null default now()
);

-- 学生每次登录到退出/关闭页面算一段使用记录，ended_at 由前端每20秒心跳更新一次，
-- 近似记录"用到几点"（不是精确到关闭那一刻）。
create table if not exists training_usage_sessions (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  student_no text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz not null default now()
);

-- 每个推荐码账号的总时长额度，默认9999小时，总管理员(admin/admin123)可以增加
create table if not exists training_quota (
  referral_code text primary key,
  total_minutes int not null default 599940, -- 9999小时
  updated_at timestamptz not null default now()
);

-- 主页"申请管理员账号"提交的申请，总管理员在听觉训练管理里查看
create table if not exists admin_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  referral_code text not null,       -- 手机号后5位，也就是申请人的管理员账号
  note text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table admin_applications enable row level security;
drop policy if exists "anon all admin_applications" on admin_applications;
create policy "anon all admin_applications" on admin_applications
  for all using (true) with check (true);

alter table training_students enable row level security;
alter table training_progress enable row level security;
alter table training_recordings enable row level security;
alter table training_batches enable row level security;
alter table training_usage_sessions enable row level security;
alter table training_quota enable row level security;

-- 和现有 attention_test_records 一样，用 anon key 从网页直接读写，靠前端逻辑控权限
-- （CREATE POLICY 不支持 IF NOT EXISTS，先 DROP 一下保证可以重复执行）
drop policy if exists "anon all training_students" on training_students;
create policy "anon all training_students" on training_students
  for all using (true) with check (true);
drop policy if exists "anon all training_progress" on training_progress;
create policy "anon all training_progress" on training_progress
  for all using (true) with check (true);
drop policy if exists "anon all training_recordings" on training_recordings;
create policy "anon all training_recordings" on training_recordings
  for all using (true) with check (true);
drop policy if exists "anon all training_batches" on training_batches;
create policy "anon all training_batches" on training_batches
  for all using (true) with check (true);
drop policy if exists "anon all training_usage_sessions" on training_usage_sessions;
create policy "anon all training_usage_sessions" on training_usage_sessions
  for all using (true) with check (true);
drop policy if exists "anon all training_quota" on training_quota;
create policy "anon all training_quota" on training_quota
  for all using (true) with check (true);

-- 音频管理：总管理员对每个单词每个读音标记"有问题"（word_id 是词表里的 id，如 k0001 / h0001）
-- sound: zh_male | en_male | zh_female | en_female；sound = 'note' 的那一行只存这个词的备注
create table if not exists audio_flags (
  word_id text not null,
  sound text not null,
  bad boolean not null default false,
  note text,
  updated_at timestamptz not null default now(),
  primary key (word_id, sound)
);
alter table audio_flags enable row level security;
drop policy if exists "anon all audio_flags" on audio_flags;
create policy "anon all audio_flags" on audio_flags
  for all using (true) with check (true);
