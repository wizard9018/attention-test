import json, re, shutil, os

SRC_ROOT = r"C:\Users\wizar\My Drive (wizard9018@gmail.com)\3.K12网站资源\专注力训练\output_audio\全量词汇_路线一"
DST_AUDIO_ROOT = "audio"  # relative to training/, matches existing training/audio/{difficulty}/{zh|en}/{gender}/{id}.mp3
UNIT_COUNT = 3


def truncate_meaning(meaning):
    # 中文释义只保留前两个逗号分隔的解释（半角/全角逗号都算）
    parts = re.split(r"([,，])", meaning)
    result, seg_count = [], 0
    for i, p in enumerate(parts):
        if i % 2 == 0:
            seg_count += 1
            if seg_count > 2:
                break
            result.append(p)
        else:
            if seg_count >= 2:
                break
            result.append(p)
    return "".join(result)


def import_one(catalog_path, src_audio_dir, prefix, difficulty, out_path):
    entries = json.load(open(catalog_path, encoding="utf-8"))
    words = []
    copy_jobs = []  # (src_filename, dst_path)

    for e in entries:
        wid = f"{prefix}{e['seq']:04d}"
        words.append({"id": wid, "word": e["clean_english"] or e["english"], "meaning": truncate_meaning(e["chinese"])})

        for track_key, lang, gender in [
            ("cn_audio_male", "zh", "male"),
            ("cn_audio_female", "zh", "female"),
            ("en_audio_male", "en", "male"),
            ("en_audio_female", "en", "female"),
        ]:
            src_name = e.get(track_key)
            if not src_name:
                continue
            src_path = os.path.join(src_audio_dir, src_name)
            dst_dir = os.path.join(DST_AUDIO_ROOT, difficulty, lang, gender)
            dst_path = os.path.join(dst_dir, wid + ".mp3")
            copy_jobs.append((src_path, dst_dir, dst_path))

    per_unit = -(-len(words) // UNIT_COUNT)
    units = []
    for i in range(0, len(words), per_unit):
        units.append({"unit_index": i // per_unit, "words": words[i:i + per_unit]})

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"total_words": len(words), "units": units}, f, ensure_ascii=False, indent=1)
    print(f"wrote {out_path}: {len(words)} words, {len(units)} units, sizes {[len(u['words']) for u in units]}")

    copied, missing = 0, []
    for src_path, dst_dir, dst_path in copy_jobs:
        if not os.path.exists(src_path):
            missing.append(src_path)
            continue
        os.makedirs(dst_dir, exist_ok=True)
        shutil.copyfile(src_path, dst_path)
        copied += 1
    print(f"  audio copied: {copied}/{len(copy_jobs)}, missing: {len(missing)}")
    for m in missing[:10]:
        print("   MISSING:", m)


import_one(
    os.path.join(SRC_ROOT, "catalog_primary.json"),
    os.path.join(SRC_ROOT, "初级词汇"),
    "j", "junior", "junior_words.json",
)
import_one(
    os.path.join(SRC_ROOT, "catalog_advanced.json"),
    os.path.join(SRC_ROOT, "高级词汇"),
    "s", "senior", "senior_words.json",
)
