import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative assets so GitHub project Pages can serve the build from /Echo/.
  base: "./",
});
