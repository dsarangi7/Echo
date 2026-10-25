import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pinyinMarkCount } from "../src/practice/pinyin";
import { charsOf } from "../src/practice/score";

type Row = { set: string; zhSet: string; en: string; zh: string; py?: string };

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
    expect(pack.every((row) => !("py" in row))).toBe(true);
  });
});

describe("Chinese pack", () => {
  const pack = load("src/data/pack-zh.json");

  it("is AYK office work, Meituan, Didi, and four class sets", () => {
    expect(pack).toHaveLength(140);
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
      ["Tea house / ordering", "酒楼饮茶点餐", 10],
      ["Online shopping", "线上购物", 10],
      ["In-store shopping", "线下购物", 10],
      ["Supermarket", "逛超市", 10],
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
    const classSets = new Set(["Tea house / ordering", "Online shopping", "In-store shopping", "Supermarket"]);
    const beforeClass = pack.filter((row) => !classSets.has(row.set));
    expect(beforeClass.map((row) => row.zh).join("\n")).not.toMatch(/西红柿|香菜|菜单|怎么卖/);
    expect(pack.filter((row) => row.set === "Tea house / ordering").map((row) => row.zh)).toEqual([
      "我们去喝早茶。",
      "我们需要排队取号。",
      "您需要等位吗？",
      "我已经取号了。",
      "服务员，请给我菜单。",
      "我们去点餐。",
      "我有忌口。",
      "请添茶。",
      "我们需要打包吗？",
      "买单。茶位费多少？",
    ]);
    expect(pack.filter((row) => row.set === "Online shopping").map((row) => row.zh)).toEqual([
      "我想网购。",
      "我在淘宝上买东西。",
      "我用手机搜索商品。",
      "这个商品比较便宜。",
      "你比价了吗？",
      "苹果手机比华为手机贵。",
      "我有优惠券。",
      "放进购物车。",
      "我很快收到了快递。",
      "我找客服退货。",
    ]);
    expect(pack.filter((row) => row.set === "In-store shopping").map((row) => row.zh)).toEqual([
      "我想买衣服。",
      "你觉得这件卫衣怎么样？",
      "这双运动鞋有点儿大。",
      "我要中号的。",
      "有黑色的吗？",
      "我可以试试吗？",
      "请帮我试一下这条裙子。",
      "这个尺码有点儿小。",
      "价格可以便宜一点儿吗？",
      "这件衣服在打折。",
    ]);
    expect(pack.filter((row) => row.set === "Supermarket").map((row) => row.zh)).toEqual([
      "我去超市买东西。",
      "请问入口在哪里？",
      "水果蔬菜区在哪里？",
      "我在海鲜区买鱼。",
      "零食区怎么走？",
      "请直走，然后右转。",
      "先试吃，再买东西。",
      "我去收银台结账。",
      "出口在左边。",
      "你去哪里买水果？",
    ]);
    expect(pack.map((row) => row.zh).join("\n")).not.toMatch(/奶茶|炒牛河|点外卖/);
    const byZh = new Map(pack.map((row) => [row.zh, row.py ?? ""]));
    for (const row of pack) {
      expect(row.py, row.zh).toBeTruthy();
      expect(row.py).not.toMatch(/\p{Script=Han}/u);
      expect(row.py).not.toMatch(/[？。，]/);
      expect(row.py).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/);
      expect(pinyinMarkCount(row.py ?? "")).toBe(charsOf(row.zh).length);
    }
    const py = (zh: string) => (byZh.get(zh) ?? "").toLowerCase();
    expect(py("这张发票需要重开。")).toContain("chóng kāi");
    expect(py("公差是正负零点一毫米。")).toContain("gōng chā");
    expect(py("公差是正负零点一毫米。")).toContain("yī");
    expect(py("公差是正负零点一毫米。")).not.toContain("yì");
    expect(py("这个尺寸超差了。")).toContain("chāo chā");
    expect(py("起订量是多少？")).toContain("qǐ dìng liàng");
    expect(py("发票和送货单一起寄来。")).toContain("yì qǐ");
    expect(py("师傅，这儿停，开一下后备箱。")).toContain("zhèr");
    expect(py("表面处理按图纸要求做。")).toContain("chǔ lǐ");
    expect(py("表面处理按图纸要求做。")).toContain("yāo qiú");
    expect(byZh.get("不用上来，谢谢。")).toMatch(/^Bú yòng /);
    expect(py("新同事下周一入职。")).toContain("zhōu yī");
    expect(py("放门口就行。")).toContain("xíng");
    expect(py("我在淘宝上买东西。")).toContain("dōng xi");
    expect(py("苹果手机比华为手机贵。")).toContain("huá wéi");
    expect(py("我可以试试吗？")).toContain("shì shi");
    expect(py("请帮我试一下这条裙子。")).toContain("qún zi");
    expect(py("价格可以便宜一点儿吗？")).toContain("diǎn er");
    expect(py("这双运动鞋有点儿大。")).toContain("diǎn er");
    expect(py("买单。茶位费多少？")).toContain("duō shǎo");
  });
});
