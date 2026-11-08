const SAMPLE_NAMES = [
  "Ana",
  "Ben",
  "Cy",
  "Dee",
  "Eli",
  "Fay",
  "Gus",
  "Hal",
  "Ivy",
  "Jo",
  "Kai",
  "Lea",
  "Max",
  "Nia",
  "Oz",
  "Pia",
  "Quinn",
  "Rae",
  "Sam",
  "Tia",
  "Uma",
  "Vic",
  "Wes",
  "Xia",
  "Yara",
  "Zed",
];

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

export function sampleNames(taken: readonly string[], count: number): string[] {
  const used = new Set(taken);
  const names: string[] = [];
  for (let n = 0; names.length < count; n++) {
    const name = n < SAMPLE_NAMES.length ? SAMPLE_NAMES[n] : `Player ${n + 1}`;
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
  }
  return names;
}
