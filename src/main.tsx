import { createRoot } from "react-dom/client";
import { worldReady } from "./loader";
import { App } from "./ui/App";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  const app = createRoot(root);
  app.render(<App onReady={worldReady} />);
  if (import.meta.hot) import.meta.hot.dispose(() => app.unmount());
}
