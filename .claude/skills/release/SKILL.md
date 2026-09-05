---
name: release
description: Verify the pending release-please pull request before it is merged. Use when the user says "/release", asks what the next version is, or wants to cut a release.
---

# /release

release-please keeps one pull request open on `main` titled `chore(main): release X.Y.Z`.
Merging it tags the release. This skill makes sure what it says is true first.

## Steps

1. Run the gate on `main`, clean checkout:

   ```sh
   git switch main && git pull --ff-only && pnpm gate
   ```

   Red means stop. Fix on `main`, push, come back.

2. Find the release PR:

   ```sh
   gh pr list --search "chore(main): release" --json number,title,body
   ```

   None open means nothing releasable has landed since the last tag. Report that and stop.

3. Read the changelog in the PR body against the actual diff:

   ```sh
   gh release view --json tagName --jq .tagName   # last tag
   git log <last-tag>..main --format='%h %s'
   git diff <last-tag>..main --stat
   ```

   For each changelog line, confirm the commit it cites describes what the diff does. A
   subject that is wrong or vague cannot be amended on a pushed `main`. Land a new commit
   whose subject states what actually shipped, note in the report that the earlier subject
   was inaccurate, and let release-please regenerate the body on push.

4. Check the version bump is right. `0.x`: a `feat` or `!` bumps minor, a `fix` bumps
   patch. If the bump is wrong, the commit type was wrong. Same fix as step 3.

5. Report: version, the changelog as it will publish, anything fixed, and the merge
   command:
   ```sh
   gh pr merge <number> --squash --admin
   ```
   `--admin` because the PR was opened with `GITHUB_TOKEN`, which does not trigger CI on
   it, so the `gate` check the ruleset requires never runs there. The squashed commit on
   `main` runs it. Merge only when the user says so. After merge, confirm:
   ```sh
   gh release view --json tagName,url
   ```

## Rules

- The PR body is generated. Never edit it.
- Never merge without the user's word.
- Never tag by hand. If release-please is stuck, find out why before touching labels.
