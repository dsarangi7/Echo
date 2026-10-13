import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootTheme } from "./ui/theme";
import "./index.css";

bootTheme();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
