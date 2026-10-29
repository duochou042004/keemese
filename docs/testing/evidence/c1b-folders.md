# C1b folder verification — 2026-10-29

Approved by the user's explicit next-task implementation instruction in this session; [packet](../../delivery/c1b-folders.md). Clean local/origin baseline `cf73b015c5112f74db1af3a8c7845306209f62dd` independently verified. No new dependency, global setup, persistent schema/data operation, deployment, other-chat retrieval/messaging or delegation.

## Behavior and security

Tutor-created nested folders, Unicode sibling uniqueness, rename/reparent, cycle rejection, empty-only delete with confirmation, and native text assignment/filtering. Root/unfiled/all semantics are explicit; filtering shows direct contents, not descendants. Archived text retains folder ownership and blocks folder deletion. Folder writes and text writes share a transaction-scoped PostgreSQL advisory lock, making inverse-move and delete/assignment races safe across processes; EF versions reject stale writes. Restrictive FKs, two partial unique sibling indexes, self-parent/version/name checks and content-free audit are in the disposable schema. No cascade delete, source-text deletion or student association was added. The application still has no startup migration.

All folder routes sit inside the protected content family. New tests deny anonymous/two students/restricted sessions on list/detail/write/delete, including uppercase and unknown-ID paths, and deny CSRF/origin/logout replays. Folder DTOs contain ID/name/parent/version only. Text folder selection saves atomically with text; failed/stale saves retain drafts. Current editor always submits folderId; compatible older C1a payloads default missing folderId to unfiled. Retained-data deployment still needs an approved versioned migration.

## Executed local checks

- Exact locked restores and single-worker no-restore backend builds: passed, zero warnings/errors. Strict E2E/config/teardown TypeScript and production frontend build: passed.
- Initial five new real PostgreSQL/API test groups: passed25s. Complete suite then passed26 API (50s), original3 DB (12s), and16 built-asset Chromium scenarios (52.2s), no skips/retries, preserving identity-before-library-before-folders order.
- Final additions (folder detail GET and 1,000-folder cap proof) reran all five folder API groups: passed25s. Final empty-folder copy and corrected zoom capture reran three new browser scenarios: passed16.5s. Retained unchanged scenarios were not reflexively rerun locally after those narrow additions; final hosted full-suite result is recorded below.
- Browser folder lifecycle covers nested create, assignment, active/archived direct filtering, blocked nonempty deletion, restore/unfile, rename/move and confirmed/cancelled delete. Network/stale failures preserve folder names and text-folder selection; language switching preserves drafts and makes no new requests. Explicit reload requires discard confirmation. Existing source-content student navigation regression passed without source requests.
- Geometry/labels/44px targets:32 additional new/edit ×8 widths×2 languages cases. Existing identity/library matrix160 cases retained. Two additional actual200% zoom cases (one per language) plus retained20; disposable extension/profile removed. Short-height keyboard cancel and title→folder→description tab sequence passed.
- Agent inspected actual desktop/mobile folder forms and both-language actual-zoom captures; white/navy hierarchy, labels/actions and wrapping remain legible. Initial normal Playwright zoom screenshot was cropped despite passing geometry; switched to the existing CDP full-page capture mechanism and inspected the corrected output. This is agent visual review, not user aesthetic acceptance or screen-reader/other-browser proof.
- React review skill applied: stable keys, top-level hooks, locale-independent fetch dependencies, cleanup/live guards, typed props/messages, native labeled selects/buttons, no stored credentials or HTML execution. Folder and text data load independently; refresh retains form drafts until explicit reload. No new state library or package.
- Independent final container/volume/cleanup-marker/zoom-profile inventories empty. Generated tracked qa.json differed only in synthetic UUID routes and was restored; new measurement JSON is ignored in node_modules/.cache and PNGs remain ignored. No forced-kill/crash cleanup guarantee.

## Hosted execution and publication

Pending reviewed C1b implementation publication and actual hosted full run. Local passes are not hosted evidence. CI configuration/pins unchanged; normal branch publication and final remote/worktree checks follow. Full C1/A3, files/tags/questions/grants/student teaching activity, other OS/browsers, screen readers, deployment and persistent migrations remain outside this packet.
