export class InputError extends Error {
  override readonly name = "InputError";
}

export function field(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.value.trim() : "";
}

export function choice<const T extends readonly string[]>(value: string, allowed: T): T[number] {
  const hit = allowed.find((v) => v === value);
  if (hit === undefined) {
    throw new InputError(`Choose one of ${allowed.join(", ")}`);
  }
  return hit;
}

export function positiveInt(value: string, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new InputError(`${label} must be a whole number of at least 1`);
  }
  return n;
}

export function snapshot(form: HTMLFormElement): Map<string, string> {
  const values = new Map<string, string>();
  for (const el of form.elements) {
    if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.name) {
      values.set(el.name, el.value);
    }
  }
  return values;
}

export function restore(form: HTMLFormElement, values: Map<string, string>): void {
  for (const [name, value] of values) {
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.value = value;
    }
  }
}
