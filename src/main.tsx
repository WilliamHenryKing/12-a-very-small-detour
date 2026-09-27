import { createRoot } from "react-dom/client";
import { worldReady } from "./loader";
import { App } from "./ui/App";
import "./styles.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App onReady={worldReady} />);
