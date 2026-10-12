import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SITE_DESCRIPTION_EN,
  SITE_DESCRIPTION_ZH,
  SITE_IMAGE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "../src/ui/seo";

describe("课猫 Echo page meta", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8").replace(/\s+/g, " ");

  it("uses one English description and a canonical GitHub Pages URL", () => {
    expect(html).toContain(`<html lang="en">`);
    expect(html).toContain(`<title>${SITE_TITLE}</title>`);
    expect(html).toContain(`content="${SITE_DESCRIPTION_EN}"`);
    expect(html).not.toContain(SITE_DESCRIPTION_ZH);
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}" />`);
    expect(html).toContain('name="apple-mobile-web-app-title" content="课猫 Echo"');
    expect(html).toContain('name="theme-color" content="#121212"');
    expect(html).not.toMatch(/AI口语教练|ELSA/i);
  });

  it("ships Open Graph and Twitter cards with one 1200×630 image", () => {
    expect(html).toContain(`property="og:url" content="${SITE_URL}"`);
    expect(html).toContain(`property="og:title" content="${SITE_TITLE}"`);
    expect(html).toContain(`property="og:description" content="${SITE_DESCRIPTION_EN}"`);
    expect(html).toContain(`property="og:site_name" content="${SITE_NAME}"`);
    expect(html).toContain('property="og:locale" content="en_US"');
    expect(html).toContain('property="og:locale:alternate" content="zh_CN"');
    expect(html).toContain(`property="og:image" content="${SITE_IMAGE}"`);
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain(`name="twitter:title" content="${SITE_TITLE}"`);
    expect(html).toContain(`name="twitter:description" content="${SITE_DESCRIPTION_EN}"`);
    expect(html).toContain(`name="twitter:image" content="${SITE_IMAGE}"`);
  });

  it("keeps the runtime title stable and swaps only the description with the practice language", () => {
    const practice = readFileSync(new URL("../src/practice/usePractice.ts", import.meta.url), "utf8");
    expect(practice).toContain("document.title = SITE_TITLE");
    expect(practice).toContain("SITE_DESCRIPTION_ZH");
    expect(practice).toContain("SITE_DESCRIPTION_EN");
    expect(practice).not.toContain("课猫 Echo · English practice");
    expect(SITE_DESCRIPTION_EN).not.toContain("听一句");
    expect(SITE_DESCRIPTION_ZH).toContain("听一句");
  });
});
