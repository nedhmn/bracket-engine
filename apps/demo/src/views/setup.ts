import { FORMAT_LABELS, esc } from "./html.ts";

export function grandFinalSelect(): string {
  return `
    <label class="field gf-field">
      <span class="field-label">Grand final</span>
      <select name="grandFinal">
        <option value="double">Double (bracket reset)</option>
        <option value="simple">Simple</option>
        <option value="none">None</option>
      </select>
    </label>`;
}

export function renderSetup(): string {
  const formats = [...FORMAT_LABELS]
    .map(([value, label]) => `<option value="${value}">${esc(label)}</option>`)
    .join("");
  return `
    <form class="card form" data-form="create">
      <h2 class="card-title">New tournament</h2>
      <label class="field">
        <span class="field-label">Name</span>
        <input name="name" type="text" value="Weekly Cup" maxlength="60" required />
      </label>
      <label class="field">
        <span class="field-label">Format</span>
        <select name="format">${formats}</select>
      </label>
      <label class="field rounds-field">
        <span class="field-label">Swiss rounds</span>
        <input name="rounds" type="number" min="1" max="20" step="1" placeholder="Auto" />
      </label>
      ${grandFinalSelect()}
      <div class="form-actions">
        <button class="cmd primary" type="submit">Create</button>
      </div>
    </form>`;
}
