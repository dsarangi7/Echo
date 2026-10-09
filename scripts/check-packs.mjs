import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { clipSrc } from "../src/practice/clips.ts";

const root = new URL("..", import.meta.url);

function load(name) {
  return JSON.parse(readFileSync(new URL(name, root), "utf8"));
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function setsOf(pack) {
  const sets = [];
  for (const row of pack) {
    const last = sets.at(-1);
    if (!last || last.name !== row.set) {
      sets.push({ name: row.set, zhSet: row.zhSet, count: 1 });
    } else {
      assert.equal(row.zhSet, last.zhSet, `${row.set} changed zhSet mid-set`);
      last.count += 1;
    }
  }
  return sets;
}

function assertPack(pack, lang) {
  assert.equal(pack.length, 100, `${lang} length`);
  const spoken = [];
  for (const [index, row] of pack.entries()) {
    for (const key of ["set", "zhSet", "en", "zh"]) {
      assert.equal(typeof row[key], "string", `${lang} ${index} ${key}`);
      assert.ok(row[key].trim().length > 0, `${lang} ${index} ${key} empty`);
    }
    assert.ok(row[lang].length <= 80, `${lang} ${index} line is too long: ${row[lang]}`);
    spoken.push(row[lang]);
  }
  assert.equal(new Set(spoken).size, spoken.length, `${lang} spoken lines repeat`);
  return setsOf(pack);
}

test("clip paths follow the pack index", () => {
  assert.equal(clipSrc("/Echo/", "en", 0), "/Echo/audio/en/000.mp3");
  assert.equal(clipSrc("/Echo", "zh", 15), "/Echo/audio/zh/015.mp3");
  assert.equal(clipSrc("/", "en", 99), "/audio/en/099.mp3");
});

test("English pack stays office-focused", () => {
  const pack = load("src/data/pack-en.json");
  const sets = assertPack(pack, "en");
  assert.deepEqual(
    sets.map((set) => [set.name, set.zhSet, set.count]),
    [
      ["Office", "办公室", 10],
      ["Meetings", "开会", 10],
      ["Email & messages", "邮件消息", 10],
      ["Factory & shipping", "工厂出货", 10],
      ["Quality", "质量", 10],
      ["Polite pushback", "礼貌拒绝", 10],
      ["Small talk", "闲聊", 10],
      ["Instructions", "说明指示", 10],
      ["Fixes & problems", "问题处理", 10],
      ["Orders & documents", "订单单据", 10],
    ],
  );
  const text = pack.map((row) => row.en).join("\n");
  assert.match(text, /When will this order ship/);
  assert.match(text, /Please send the purchase order today/);
  assert.doesNotMatch(text, /milk aisle|cilantro|to go/i);
});

test("Chinese pack is office and Meituan, not tourist food shopping", () => {
  const pack = load("src/data/pack-zh.json");
  const sets = assertPack(pack, "zh");
  assert.deepEqual(
    sets.map((set) => [set.name, set.zhSet, set.count]),
    [
      ["POs & quotes", "订单和报价", 10],
      ["Finance & invoices", "财务和发票", 10],
      ["Packing & shipping", "装箱和出货", 10],
      ["Meeting minutes", "会议纪要", 10],
      ["Admin & HR", "行政和人事", 10],
      ["Drawings & standards", "料号图纸标准", 10],
      ["Delivery / Meituan", "外卖", 15],
      ["Rider phrases", "外卖骑手", 15],
      ["Everyday", "日常", 10],
    ],
  );
  const office = sets.slice(0, 6).reduce((sum, set) => sum + set.count, 0);
  const delivery = sets.slice(6, 8).reduce((sum, set) => sum + set.count, 0);
  assert.equal(office, 60);
  assert.equal(delivery, 30);
  assert.ok(office + delivery > pack.length / 2);

  const toRider = pack.filter((row) => row.set === "Delivery / Meituan").map((row) => row.zh).join("\n");
  for (const phrase of ["放门口", "我在家", "给我打电话", "门前面", "不用上来", "地址写错了", "请等我一下", "谢谢"]) {
    assert.ok(toRider.includes(phrase), `missing rider line: ${phrase}`);
  }
  const rider = pack.filter((row) => row.set === "Rider phrases").map((row) => row.zh).join("\n");
  for (const phrase of ["外卖到了", "到楼下", "放在门口", "取餐", "门禁"]) {
    assert.ok(rider.includes(phrase), `missing rider phrase: ${phrase}`);
  }
  const zh = pack.map((row) => row.zh).join("\n");
  assert.doesNotMatch(zh, /西红柿|香菜|菜单|怎么卖/);
});

test("Piper clips match the spoken line at each index", () => {
  const manifest = load("public/audio/manifest.json");
  for (const lang of ["en", "zh"]) {
    const pack = load(`src/data/pack-${lang}.json`);
    assert.equal(manifest[lang].length, pack.length);
    for (let index = 0; index < pack.length; index += 1) {
      const id = String(index).padStart(3, "0");
      const file = new URL(`public/audio/${lang}/${id}.mp3`, root);
      const path = fileURLToPath(file);
      assert.equal(manifest[lang][index], sha256(pack[index][lang]), `${lang} ${id} hash`);
      assert.ok(existsSync(path), `${lang} ${id} missing`);
      const bytes = readFileSync(path);
      assert.ok(bytes.length > 800, `${lang} ${id} too small`);
      assert.equal(bytes.subarray(0, 3).toString("ascii"), "ID3", `${lang} ${id} header`);
      const duration = Number(
        execFileSync(
          "ffprobe",
          ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
          { encoding: "utf8" },
        ).trim(),
      );
      assert.ok(duration > 0.35 && duration < 12, `${lang} ${id} duration ${duration}`);
    }
  }
});
