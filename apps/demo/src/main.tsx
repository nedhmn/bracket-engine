import "@repo/design-system/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./components/app.tsx";
import { SessionProvider } from "./session.tsx";

const root = document.getElementById("app");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <SessionProvider>
        <App />
      </SessionProvider>
    </StrictMode>,
  );
}
