export class InputError extends Error {
  override readonly name = "InputError";
}

export function positiveInt(value: string, label: string): number {
  const n = Number(value.trim());
  if (value.trim() === "" || !Number.isInteger(n) || n < 1) {
    throw new InputError(`${label} must be a whole number of at least 1`);
  }
  return n;
}
