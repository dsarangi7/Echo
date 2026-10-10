import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Row = { set: string; zhSet: string; en: string; zh: string };

function load(name: string): Row[] {
  return JSON.parse(readFileSync(name, "utf8")) as Row[];
}

function setsOf(pack: Row[]) {
  const sets: { name: string; zhSet: string; count: number }[] = [];
  for (const row of pack) {
    const last = sets.at(-1);
    if (!last || last.name !== row.set) sets.push({ name: row.set, zhSet: row.zhSet, count: 1 });
    else {
      expect(row.zhSet).toBe(last.zhSet);
      last.count += 1;
    }
  }
  return sets.map((set) => [set.name, set.zhSet, set.count]);
}

describe("English pack", () => {
  const pack = load("src/data/pack-en.json");

  it("stays a 100-line office pack", () => {
    expect(pack).toHaveLength(100);
    expect(setsOf(pack)).toEqual([
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
    ]);
    const text = pack.map((row) => row.en).join("\n");
    expect(text).toContain("Please send the purchase order today.");
    expect(text).not.toMatch(/milk aisle|cilantro|to go/i);
  });
});

describe("Chinese pack", () => {
  const pack = load("src/data/pack-zh.json");

  it("is AYK office work plus Meituan and a Didi taxi set", () => {
    expect(pack).toHaveLength(100);
    expect(setsOf(pack)).toEqual([
      ["POs & quotes", "订单和报价", 10],
      ["Finance & invoices", "财务和发票", 10],
      ["Packing & shipping", "装箱和出货", 10],
      ["Meeting minutes", "会议纪要", 10],
      ["Admin & HR", "行政和人事", 10],
      ["Drawings & standards", "料号图纸标准", 10],
      ["Delivery / Meituan", "外卖", 15],
      ["Rider phrases", "外卖骑手", 15],
      ["Taxi / Didi", "打车", 10],
    ]);
    const toRider = pack.filter((row) => row.set === "Delivery / Meituan").map((row) => row.zh).join("\n");
    for (const phrase of ["放门口", "我在家", "给我打电话", "门前面", "不用上来", "地址写错了", "请等我一下"]) {
      expect(toRider).toContain(phrase);
    }
    const rider = pack.filter((row) => row.set === "Rider phrases").map((row) => row.zh).join("\n");
    for (const phrase of ["外卖到了", "到楼下", "放在门口", "取餐", "门禁"]) {
      expect(rider).toContain(phrase);
    }
    const taxi = pack.filter((row) => row.set === "Taxi / Didi").map((row) => row.zh).join("\n");
    for (const phrase of ["电话", "大门口", "北门", "上车点", "等我一下", "陆家嘴", "高架", "高速", "这儿停", "后备箱", "付好了", "订单", "车牌", "谢谢"]) {
      expect(taxi).toContain(phrase);
    }
    expect(pack.map((row) => row.zh).join("\n")).not.toMatch(/西红柿|香菜|菜单|怎么卖/);
  });
});
