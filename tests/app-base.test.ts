import { describe, expect, it } from "vitest";
import { normalizeBase, resolveAppBase } from "../scripts/app-base";

describe("resolveAppBase", () => {
  it("keeps GitHub Pages on /Echo/ when no deploy env is set", () => {
    expect(resolveAppBase({})).toBe("/Echo/");
  });

  it("uses / for the Capacitor Android shell", () => {
    expect(resolveAppBase({ CAPACITOR: "1" })).toBe("/");
    expect(resolveAppBase({ VITE_CAPACITOR: "1" })).toBe("/");
    expect(resolveAppBase({ CAPACITOR: "1", VITE_BASE: "/Echo/" })).toBe("/Echo/");
  });

  it("uses / on Vercel when VITE_BASE and BASE_PATH are unset", () => {
    expect(resolveAppBase({ VERCEL: "1" })).toBe("/");
    expect(resolveAppBase({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe("/");
    expect(resolveAppBase({ VERCEL: "1", VERCEL_ENV: "production" })).toBe("/");
  });

  it("lets VITE_BASE override Vercel auto-detect", () => {
    expect(resolveAppBase({ VERCEL: "1", VITE_BASE: "/Echo/" })).toBe("/Echo/");
    expect(resolveAppBase({ VERCEL: "1", VITE_BASE: "/" })).toBe("/");
  });

  it("lets BASE_PATH override Vercel auto-detect when VITE_BASE is unset", () => {
    expect(resolveAppBase({ VERCEL: "1", BASE_PATH: "/Echo/" })).toBe("/Echo/");
    expect(resolveAppBase({ BASE_PATH: "/" })).toBe("/");
  });

  it("prefers VITE_BASE over BASE_PATH", () => {
    expect(resolveAppBase({ VITE_BASE: "/", BASE_PATH: "/Echo/" })).toBe("/");
  });

  it("treats an empty explicit value as unset", () => {
    expect(resolveAppBase({ VITE_BASE: "", BASE_PATH: "" })).toBe("/Echo/");
    expect(resolveAppBase({ VITE_BASE: "", VERCEL: "1" })).toBe("/");
    expect(resolveAppBase({ VITE_BASE: "", BASE_PATH: "/docs/" })).toBe("/docs/");
  });

  it("treats a whitespace-only base as the root", () => {
    expect(resolveAppBase({ VITE_BASE: "  " })).toBe("/");
  });
});

describe("normalizeBase", () => {
  it("adds a trailing slash and a leading slash for path bases", () => {
    expect(normalizeBase("/Echo")).toBe("/Echo/");
    expect(normalizeBase("Echo")).toBe("/Echo/");
    expect(normalizeBase("/")).toBe("/");
    expect(normalizeBase(" / ")).toBe("/");
  });
});
