import { wire } from "./actions.ts";
import { state } from "./state.ts";
import { renderApp } from "./views/app.ts";

const root = document.getElementById("app");

function render(): void {
  if (!root) {
    return;
  }
  // innerHTML resets horizontal scroll, which loses a visitor's place in a wide bracket
  const scrolls = [...root.querySelectorAll(".bracket")].map((el) => el.scrollLeft);
  root.innerHTML = renderApp(state);
  root.querySelectorAll(".bracket").forEach((el, i) => {
    el.scrollLeft = scrolls[i] ?? 0;
  });
}

if (root) {
  wire(root, render);
  render();
}
