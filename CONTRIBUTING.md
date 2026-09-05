# Contributing

Lead with the idea, not the diff. A paragraph in an issue that says what you want to
change, why the current behaviour is a problem, and what you would do instead is the most
useful thing you can send. If we agree, the implementation is the easy part.

Small pull requests are welcome too. Keep the diff small enough that a person can hold it
in their head, and say why in the description.

Security problems go through [SECURITY.md](./SECURITY.md), not a public issue.

## Running it

[docs/getting-started.md](./docs/getting-started.md).

## Before you push

```sh
pnpm gate
```

CI runs the same steps in the same order. A `pre-push` hook runs them for you, so a push
that would fail CI fails on your machine first. `pnpm install` wires the hook; there is no
hook manager. `git push --no-verify` skips it once. `SKIP_HOOKS=1` skips it for a shell.

## Commits and releases

Commit subjects are conventional commits and they are the release notes. Pull requests are
squash merged, so the PR title is the subject. Use `feat`, `fix`, `perf`, `refactor`,
`docs`, `deps`, `revert` for anything user-visible. `chore`, `test`, `ci`, `build`,
`style` stay out of the changelog. A `!` after the type marks a breaking change.

release-please keeps one open pull request on `main` with the next version and
changelog. Merging it tags the release and publishes the GitHub Release. Nothing is
published to a package registry. Versions are `0.x` until the API settles, and a breaking
change bumps the minor.

## Dependencies

Renovate opens the updates. Patch and minor updates to stable packages merge themselves
when the gate is green. Majors and `0.x` minors wait for a human.

## Lint

Two layers. `oxlint` correctness rules, and the vendored
[anti-slop](https://github.com/dmmulroy/anti-slop) rules, which hold one line: data
crossing an I/O boundary is parsed into a domain type where it arrives. No
`Record<string, unknown>` as a contract, no `typeof` as a parser, no `unknown` parameter
without a schema. A file that legitimately works on open data gets a scoped override in
`.oxlintrc.json` with its reason, and that is the only way past a rule.
