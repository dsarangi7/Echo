import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Project site: https://dsarangi7.github.io/Echo/
  base: "/Echo/",
});
