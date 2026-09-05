# anti-slop

Vendored from https://github.com/dmmulroy/anti-slop `src/` (MIT, Dillon Mulroy).
Upstream is designed to be copied and edited, not depended on.

The `/oss-repo` skill copies `src/index.ts`, `src/rules/*.ts` (rules only, not
`*.test.ts`), and `src/shared/*.ts` at scaffold time and records the upstream commit
below. `@oxlint/plugins` must match the installed `oxlint` version exactly.

Verified: under Node 24 with oxlint and @oxlint/plugins 1.81.0 the vendored `src/` loads as-is
from `.oxlintrc.json` `jsPlugins`; `tools/oxlint/package.json` must carry `"type": "module"`.

Upstream commit: e8c4880471b23ab7f216fba7b27d173a6ef07d4c
