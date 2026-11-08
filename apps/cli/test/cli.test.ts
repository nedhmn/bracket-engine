import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

import { connect, testDatabaseUrl } from "@repo/db";
import { afterAll, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../src/cli/index.ts", import.meta.url));
const url = testDatabaseUrl();
const db = connect(url);
const created: string[] = [];

type Run = { code: number; stderr: string; stdout: string };

function cli(...args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [entry, ...args],
      { env: { ...process.env, DATABASE_URL: url } },
      (error, stdout, stderr) => {
        resolve({
          code: error ? Number(error.code ?? 1) : 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      },
    );
  });
}

async function ok(...args: string[]): Promise<string> {
  const run = await cli(...args);
  expect(run.stderr).toBe("");
  expect(run.code).toBe(0);
  return run.stdout;
}

async function fails(message: string, ...args: string[]): Promise<void> {
  const run = await cli(...args);
  expect(run.code).toBe(1);
  expect(run.stderr).toContain(message);
}

async function create(...args: string[]): Promise<string> {
  const id = await ok("create", ...args);
  created.push(id);
  return id;
}

async function join(tournamentId: string, names: string[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const name of names) {
    ids.set(name, await ok("join", tournamentId, name));
  }
  return ids;
}

type Shown = { id: string; player1: string };

async function openMatches(tournamentId: string): Promise<Shown[]> {
  return (await ok("show", tournamentId))
    .split("\n")
    .filter((line) => line.includes(" vs ") && line.includes(" open "))
    .map((line) => {
      const [id = ""] = line.trim().split(/\s+/);
      const player1 = line.split(" vs ")[0]?.trim().split(/\s+/).at(-1) ?? "";
      return { id, player1 };
    });
}

describe("cli", () => {
  afterAll(async () => {
    await db.$client.query("delete from tournaments where id = any($1::uuid[])", [created]);
    await db.$client.end();
  });

  it("runs a swiss event from create to end", async () => {
    const t = await create("Weekly", "--format", "swiss", "--rounds", "2");
    const ids = await join(t, ["Ana", "Ben", "Cy", "Dee"]);
    expect(await ok("start", t)).toBe("started with 4 participants");
    expect(await ok("show", t)).toContain("phase 1  swiss  underway  round 1/2");

    const round1 = await openMatches(t);
    expect(round1).toHaveLength(2);
    const outputs = [];
    for (const m of round1) {
      outputs.push(await ok("report", m.id, ids.get(m.player1) ?? ""));
    }
    expect(outputs).toEqual([
      "recorded. 0 match(es) opened",
      "recorded. 0 match(es) opened, next swiss round paired",
    ]);
    expect(await openMatches(t)).toHaveLength(2);

    expect(await ok("end", t, "--force")).toBe("finalized");
    expect((await ok("show", t)).split("\n")[0]).toBe("Weekly  complete");
  });

  it("drops before and after the start", async () => {
    const t = await create("Cup", "--format", "single_elimination");
    const ids = await join(t, ["Ana", "Ben", "Cy", "Dee", "Eli"]);
    expect(await ok("drop", ids.get("Eli") ?? "")).toBe("removed before start");
    await ok("start", t);
    expect(await ok("drop", ids.get("Ana") ?? "")).toBe("dropped, 1 match(es) forfeited");
    expect(await ok("show", t)).toContain("Ana (dropped)");
  });

  it("prints engine and lookup errors and exits 1", async () => {
    const t = await create("Errors", "--format", "double_elimination");
    await join(t, ["Ana", "Ben"]);
    await fails("A participant with that name has already joined", "join", t, "Ana");
    await ok("start", t);
    await fails("Participants can only join before the tournament starts", "join", t, "Cy");
    await fails("Tournament has already started", "start", t);
    await fails("matches are unresolved. Resolve them or pass --force.", "end", t);
    await fails("Match not found", "report", "not-a-match", "x");
    await fails("Participant not found", "drop", "00000000-0000-0000-0000-000000000000");
    await fails("Tournament not found", "show", "00000000-0000-0000-0000-000000000000");
    await fails("--format must be one of", "create", "x", "--format", "nope");
    await fails('unknown command "bogus"', "bogus");
  });
});
