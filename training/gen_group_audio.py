import asyncio, json, sys
import edge_tts

VOICES = {
    ("zh", "male"): "zh-CN-YunxiNeural",
    ("zh", "female"): "zh-CN-XiaoyiNeural",
    ("en", "male"): "en-US-GuyNeural",
    ("en", "female"): "en-US-JennyNeural",
}

SEM = asyncio.Semaphore(8)

async def gen_one(lang, gender, wid, text, difficulty):
    out = f"audio/{difficulty}/{lang}/{gender}/{wid}.mp3"
    async with SEM:
        try:
            comm = edge_tts.Communicate(text, VOICES[(lang, gender)])
            await comm.save(out)
        except Exception as e:
            print("FAIL", out, text, e)

async def main(difficulty, group_index):
    data = json.load(open(f"{difficulty}_words.json", encoding="utf-8"))
    group = data["groups"][group_index]
    tasks = []
    for w in group["words"]:
        for gender in ("male", "female"):
            tasks.append(gen_one("zh", gender, w["id"], w["meaning"], difficulty))
            tasks.append(gen_one("en", gender, w["id"], w["word"], difficulty))
    await asyncio.gather(*tasks)
    print(f"done: {difficulty} group {group_index}, {len(group['words'])} words, {len(tasks)} files")

if __name__ == "__main__":
    difficulty = sys.argv[1]
    group_index = int(sys.argv[2])
    asyncio.run(main(difficulty, group_index))
