# Agents

| Working on                               | Read first                |
| ---------------------------------------- | ------------------------- |
| A package                                | `docs/architecture.md`    |
| `apps/web`                               | `docs/architecture.md`    |
| `apps/tournament-engine`                 | `docs/architecture.md`    |
| Running it                               | `docs/getting-started.md` |
| Workflows, versions, changelog, releases | `CONTRIBUTING.md`         |

`.claude/skills/release` before merging a release PR.

## Rules

- Parse data into a domain type at the I/O boundary where it arrives. Never pass an open
  record, `unknown`, or a runtime type check downstream as a contract.
- A module in `apps/tournament-engine` moves to `packages/` only when a second app imports it.
- Run the gate in `CONTRIBUTING.md` before every push. A red step is fixed in the source.
  A lint override is scoped to a path and carries its reason in the lint config.
- Commit subjects are conventional commits and they are the release notes. Write the
  subject for the person reading the changelog.
- Ported or vendored code keeps its attribution in `LICENSE` and its own header.
- Third-party skills and vendored rules are never edited in place. Edit upstream or fork it.
- No docstrings, no narrative comments, no em dashes.
