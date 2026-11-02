# Library content and the owner's review

Coaches only ever see content that is **verified** (enough independent reliable sources, spec §6) or
**approved** by the owner. Everything else is a **draft** and waits in the owner's review queue.

Approving or rejecting content is a reviewed code change, never a database write. The decisions live in
`decisions.json` in this folder; `fullLibrary()` applies them when the app loads.

## How to approve or reject drafts

1. Open a build with the review screen turned on (a dev build or a PR preview built with
   `REACT_APP_ENABLE_CONTENT_REVIEW=true`). Sign in and open the **Content review** tab.
2. For each draft, look at its diagram or claim, the note and the sources found so far. Choose **Approve**,
   or **Reject** and write a one-line reason. A rejected item is kept as a record so it is not researched again.
3. Press **Download decisions**. You get a `decisions.json` holding the decisions already committed plus the
   ones you just made.
4. Replace `src/football-core/content/decisions.json` with the downloaded file on a new branch and open a pull
   request into `recovery/coach-core-mvp-2026`. When it is merged, approved items reach coaches and rejected ones
   disappear from the queue.

Nothing is published until that pull request is merged. Closing the tab before downloading loses only the
decisions you have not downloaded yet.

## Format

```json
{
  "decisions": [
    { "kind": "concept", "id": "flood", "decision": "approve", "reviewer": "Owner", "date": "2026-11-01" },
    { "kind": "matchup", "id": "snag:cover-3", "decision": "reject", "reviewer": "Owner", "date": "2026-11-01", "reason": "Not how it is taught" }
  ]
}
```

`kind` is `formation`, `concept`, `front`, `coverage` or `matchup`; a matchup's `id` is `concept:coverage`.
Decisions for unknown ids or for items that are not drafts are ignored. If an item appears twice, the later
decision wins.
