# Agent tool verification

Started 8 September 2026 on task/agent-verification, base 25bb89e3.

## Completion rule

All 105 catalogued tools must have an actual Jori agent-run result in each production region. Channel-specific reply/reaction variants, meaningful operation variants, validation, permissions, and failure paths are tracked separately. Automated tests and direct provider probes support the evidence but are not agent E2E passes. Existing release evidence is historical until reproduced.

Use labeled synthetic fixtures. Do not modify unrelated customer content, send to outside recipients, enable global inference fallbacks, or weaken approval checks. Record run IDs and result summaries without credentials or private payloads. Record blocked and failed tools explicitly. Test fixtures may remain for reproducibility until cleanup is authorized.

## Coverage

Every catalogued input and output schema compiles independently with Ajv. All 93 broker tools reject invalid root values and unknown fields in contract tests. These checks do not establish provider behavior or complete per-tool validation coverage.

Basic success paths are recorded below. A basic pass is not full operation, validation, permission, and failure-path coverage. The post-deployment table/store and grep regressions passed in both regions.

| Provider | Tool | Contract tests | EU agent run | US agent run |
| --- | --- | --- | --- | --- |
| github | `github_list_repositories` | Compiles | Pending | Pending |
| github | `github_get_repository` | Compiles | Pending | Pending |
| github | `github_search_issues` | Compiles | Pending | Pending |
| github | `github_get_issue` | Compiles | Pending | Pending |
| github | `github_get_pull_request` | Compiles | Pending | Pending |
| github | `github_get_file` | Compiles | Pending | Pending |
| github | `github_clone_repository` | Compiles | Pending | Pending |
| github | `github_add_issue_comment` | Compiles | Pending | Pending |
| github | `github_reply_to_pull_request_review_comment` | Compiles | Pending | Pending |
| github | `github_list_pull_request_files` | Compiles | Pending | Pending |
| github | `github_list_pull_request_review_comments` | Compiles | Pending | Pending |
| github | `github_commit_to_pull_request` | Compiles | Pending | Pending |
| github | `github_create_pull_request` | Compiles | Pending | Pending |
| github | `github_add_comment_reaction` | Compiles | Pending | Pending |
| github | `github_update_pull_request` | Compiles | Pending | Pending |
| gmail | `google_gmail_search_threads` | Compiles | Pending | Pending |
| gmail | `google_gmail_get_thread` | Compiles | Pending | Pending |
| gmail | `google_gmail_get_threads` | Compiles | Pending | Pending |
| gmail | `google_gmail_get_message` | Compiles | Pending | Pending |
| gmail | `google_gmail_get_messages` | Compiles | Pending | Pending |
| gmail | `google_gmail_reply_to_thread` | Compiles | Pending | Pending |
| gmail | `google_gmail_send_message` | Compiles | Pending | Pending |
| gmail | `google_gmail_create_draft` | Compiles | Pending | Pending |
| googleCalendar | `google_calendar_list_calendars` | Compiles | Pending | Pending |
| googleCalendar | `google_calendar_list_events` | Compiles | Pending | Pending |
| googleCalendar | `google_calendar_get_event` | Compiles | Pending | Pending |
| googleCalendar | `google_calendar_create_event` | Compiles | Pending | Pending |
| googleCalendar | `google_calendar_update_event` | Compiles | Pending | Pending |
| jori | `list_capabilities` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `load_skill` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| jori | `search_runs` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| jori | `search_run_activity` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| jori | `read_workstreams` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| jori | `offer_integration` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| jori | `cancel_approval_request` | Compiles | Pending | Pending |
| jori | `cancel_integration_offer` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| jori | `save_file` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `generate_image` | Compiles | Basic pass, batch 3 | Basic pass, batch 3 |
| jori | `search_files` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `read_file` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `search_jobs` | Compiles | Empty search pass, batch 6 | Empty search pass, batch 6 |
| jori | `read_job` | Compiles | Pending | Pending |
| jori | `add_job` | Compiles | Empty access rejected, batch 6 | Empty access rejected, batch 6 |
| jori | `update_job` | Compiles | Pending | Pending |
| jori | `delete_job` | Compiles | Pending | Pending |
| linear | `linear_search_issues` | Compiles | Pending | Pending |
| linear | `linear_get_issue` | Compiles | Pending | Pending |
| linear | `linear_list_comments` | Compiles | Pending | Pending |
| linear | `linear_add_comment` | Compiles | Pending | Pending |
| linear | `linear_add_reaction` | Compiles | Pending | Pending |
| jori | `search_tables` | Compiles | Regression pass | Regression pass |
| jori | `read_table` | Compiles | Regression pass | Regression pass |
| jori | `list_table_rows` | Compiles | Regression pass | Regression pass |
| jori | `create_table` | Compiles | Regression pass | Regression pass |
| jori | `insert_table_row` | Compiles | Regression pass | Regression pass |
| jori | `update_table_row` | Compiles | Regression pass | Regression pass |
| jori | `delete_table_row` | Compiles | Pending | Pending |
| jori | `share_table` | Compiles | Pending | Pending |
| jori | `search_stores` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `read_store` | Compiles | Regression pass | Regression pass |
| jori | `create_store` | Compiles | Regression pass | Regression pass |
| jori | `write_store` | Compiles | Regression pass | Regression pass |
| jori | `share_store` | Compiles | Pending | Pending |
| jori | `share_file` | Compiles | Pending | Pending |
| microsoftEmail | `microsoft_email_search_messages` | Compiles | Pending | Pending |
| microsoftEmail | `microsoft_email_get_message` | Compiles | Pending | Pending |
| microsoftEmail | `microsoft_email_send_message` | Compiles | Pending | Pending |
| microsoftEmail | `microsoft_email_create_draft` | Compiles | Pending | Pending |
| microsoftEmail | `microsoft_email_update_message` | Compiles | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_list_calendars` | Compiles | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_list_events` | Compiles | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_get_event` | Compiles | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_create_event` | Compiles | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_update_event` | Compiles | Pending | Pending |
| jori | `finish_run` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `send_reply` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `add_reaction` | Compiles | Pending | Pending |
| jori | `read` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `grep` | Compiles | Regression pass | Regression pass |
| jori | `glob` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `git` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `apply_patch` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `bash` | Compiles | Basic pass, restrictions reviewed | Basic pass, restrictions reviewed |
| jori | `start_agent` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `wait_for_agents` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `stop_agent` | Compiles | Basic pass, batch 4 | Basic pass, batch 4 |
| notion | `notion_search` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_get_page` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_get_block_children` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_query_data_source` | Compiles | Pending | Pending |
| notion | `notion_list_comments` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_create_page` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_update_page` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_upload_file` | Compiles | Failed MIME type, fix pending | Failed MIME type, fix pending |
| notion | `notion_append_block_children` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| notion | `notion_create_comment` | Compiles | Basic pass, batch 5 | Basic pass, batch 5 |
| slack | `channels_list` | Compiles | Pending | Pending |
| slack | `conversations_history` | Compiles | Pending | Pending |
| slack | `conversations_replies` | Compiles | Pending | Pending |
| slack | `conversations_search_messages` | Compiles | Pending | Pending |
| slack | `users_search` | Compiles | Pending | Pending |
| slack | `conversations_add_message` | Compiles | Pending | Pending |
| slack | `slack_add_reaction` | Compiles | Pending | Pending |
| jori | `web_search` | Compiles | Basic pass, batch 3 | Basic pass, batch 3 |
| jori | `web_fetch` | Compiles | Basic pass, batch 3 | Basic pass, batch 3 |

## Variants and failure paths

- Replies: console, Slack, GitHub, Linear. Reactions: Slack, GitHub, Linear.
- Native execution: sandbox files, command completion/errors, Git inspection, delegation success/wait/stop, finish and reply finalization.
- Jori records: tables, stores, files, jobs, activity, workstreams, skills, offers and approval cancellation. Include pagination, concurrent versions, wrong-organization access, blocked and ask-first modes.
- Providers: read/write round trips, saved-file attachments where supported, pagination, optional-field omission, invalid input rejected before requests, API errors and token refresh.
- Residency: each run uses its own region's Jori records and configured credentials. Exa and E2B remain documented processing exceptions.

## Findings

### First table round trips

- EU run `nx78t23j30613tgaww5nahs2118e0587` completed in verification organization `jh73h5k7wnzydbfhgag164sjbx8dy1ys`. Table `js7a8yqy64v162mfgnpang55rs8e02c3`, row `k174b63wn7ga2mdzp9ay0s2erd8e01eq`, ended with label `audit-eu`, amount 2, version 2. The console also displayed the persisted row.
- US run `pn7a99ev6x7jbm00sqsysax0h18e0mc7` completed in verification organization `jh7eze1tmvmf6ff4hdfpt845t98dyrp7`. Table `r578550rz01d18tcc4deyjwyrn8e0fmw`, row `r97a3dpxckvmfnqtfhxz0cd09h8e1thk`, ended with label `audit-us`, amount 2, version 2.
- Both called `list_capabilities`, `search_tables`, `create_table`, `read_table`, `insert_table_row`, `list_table_rows`, `update_table_row`, and console `send_reply`. Updates supplied expected version 1.
- The US run also called `notion_search` despite an explicit instruction not to call outside integrations. This is a scope-following failure, not a clean batch pass. No external write occurred. The unintended search does not count as a Notion E2E pass.

### Demonstrated defects and checked fixes

- Broker validation ignored `const` and integer constraints and treated `oneOf` as first-match. Eleven negative assertions failed before the fix. Validation now requires exactly one matching shape and still applies sibling constraints. Positive and negative regression tests pass.
- Live table creation exposed internal column IDs and returned `rowCount` absent from the declared response. Creation now uses the same agent summary as read/search. Console summaries retain their required column IDs.
- Table and store schemas omitted folder/count fields and people/team visibility details. Shared visibility schemas and serialized-summary contract tests now cover these variants.
- The independent Ajv test helper replaces a test validator that had repeated the same incorrect `oneOf` behavior as production validation.
- Before deployment, `pnpm run check` passed and `pnpm run test` passed 2,730 tests across 555 files, with 4 tests in 2 files skipped. No checks were weakened. Live post-fix verification is still required.

### Store and sandbox batch

EU parent `nx7b19jy0e4ff07zg8xdncdtt58e1d47` created child `nx75ymsrzv1d3x4bp8x9bfhtnx8e0kwc` with `integrations: []` and `web: false`. The child created store `js7121wm9rde5xxnpvafqkh1wx8e04af`, wrote count 1, merge-patched count 2 with optimistic versioning, and read back version 2. Its sandbox rejected the requested path outside the Jori workspace and rejected Git writes through bash. Those refusals match the sandbox restrictions; the test prompt must use supported paths and Git operations.

US parent `pn73xvxhgr1nc5cqxk4q1xvjm18e1jnp` and child `pn757kxcp57gz66ncmaqnchjzx8e0n5t` completed with the same restricted access. Store `r5731ck6m0am5bcbx6dkrkv6n18e1mz1` ended at count 2, version 2. Both regions completed file read/search/patch/save operations, child `finish_run`, parent `wait_for_agents`, and console replies. Saved text file IDs are EU `ks7caex9rmbtxmh5jrgdg5ywas8e07b2` and US `rn7f0vgfvkbpjmzyvg07m6fge58e1v87`. Storage URLs pointed to their matching regional Convex deployments. `read_file` correctly returns metadata, not file text.

The test prompt incorrectly requested Git initialization and an outside-workspace directory. The agents worked around the Git command guard in their disposable sandboxes, using an absolute Git executable in EU and a manually created `.git` structure in US. The shell guard is not a security boundary against arbitrary code execution. These workarounds are not evidence that Git write restrictions are comprehensive. Future tests must clone a designated fixture repository through the provider tool and keep paths in `/home/user/workspace`.

The US run exposed a real search inconsistency. `grep` matched `include` against the workspace path while `glob` matched against the chosen search directory. A regression test reproduced the empty result. Both now use search-directory-relative matching, including filename matching when searching a single file. Targeted tests and the next full gate passed, with 2,732 tests passing and 4 skipped. The four UI loading failures seen on the preceding gate passed unchanged on both targeted and full reruns.

### Public web and regional image batch

EU parent `nx71kyfpmy02exd980pbxj70w18e0mzj` and child `nx73c5tkbe2bmby2vfkq4ped0x8e1e4f` completed. US parent `pn790q8hgwxe62gvpnv5g5fsgh8e03sz` and child `pn7cecg9mfv4js7fxr1nd7zrkd8e1ryt` completed. Both children had no integration access and explicit web access. Each called `web_search` and `web_fetch` for the official JSON Schema combination documentation and received successful Exa results. Each generated an image through Vertex and read its saved metadata. File IDs are EU `ks7abwd6y1vs1wcx853k6ts7jx8e1gek` and US `rn78m1yswcj6mw9zmms0t6wakd8e1wh9`. The US child also loaded the `image-generation` skill successfully. No connected integration was called. These basic success paths do not establish all web/image failure and validation cases.

### Deployment progress

Main `004377ff` is pushed and deployed to development and both production regions, including skill synchronization. EU Vercel deployment `dpl_EiT6NMkhfwWnzsEWdKMR1u37FnDp` is Ready in dub1. US deployment `dpl_MHDQq6y2qeKu9xP25kwEP462beNA` is Ready in iad1. Both regional origins returned HTTP 200 and routed to the console. These deployment checks do not replace tool E2E verification.

### Core history and cancellation batch

Batch 4 completed in EU run `nx7cyjpm54sapwx76ah0mwjtyn8e1pdr` and US run `pn75afhw26am4x6rzkjem1z1498e02gp`. Both returned run/activity results and an empty workstream list, loaded the image skill, created and cancelled a non-authorizing GitHub offer, and stopped a disposable child. Both waits returned that child's stopped status. No integration access was granted.

### Provider access

The EU verification organization has Notion connected. GitHub, Slack and Linear report not connected. The GitHub EU installation is prepared for selected repositories, not all repositories, but no installation grant has been submitted.

### Post-deployment contract regression

EU child `nx70p47qtw1n1jy1pera6x0dwd8e0qxf` and US child `pn7chr4sdvfdxz1kvkfmgtkapn8e0p8k` completed against main `004377ff`. Create/read/search table results omit internal column IDs. Each table ended with one valid row at amount 2, version 2. A numeric label and stale version were rejected without changing the row. Each integer-count store rejected 1.5 without advancing value or version, then accepted a merge patch to count 2, version 2. Both directory-relative and single-file grep filters returned the expected synthetic line. Glob and read agreed.

US regression and both job batches entered through the existing public console send mutation using the exact verification account identity supplied by the authorized Convex administrator. This exercises normal agent execution and provider calls, but does not verify browser sign-in or UI input. EU regression entered through the signed-in browser.

### Notion round trip and upload defect

EU child `nx7d9sm4ahz18rr5j15awya5dx8e0vjs` created page `3d523f2d-e283-815e-81bd-eb5bd1833323`. US child `pn7744ytvzw0x1b61bwf3n5jy98e1kb6` created page `3d523f2d-e283-810b-aee7-ea5978af0ab2`. Both are labeled synthetic pages beneath the approved test parent. Page creation, title updates, paragraph append, comment creation, and reads succeeded through the matching regional integration. No data source was found for query testing.

Both regions failed PNG uploads with Notion HTTP 400 because the multipart file arrived as application/octet-stream. A read-only production runtime probe showed that Convex FormData.set loses the File MIME type while append preserves it. The fix changes set to append. A regression modeled the Convex behavior, failed before the fix, and passed afterward. The full suite passed 2,733 tests with four workers and 4 skipped tests. Limiting worker concurrency addresses unrelated UI-loading contention without changing assertions or timeouts. Live upload retesting remains required after deployment.

### Synthetic job batch

EU child `nx7abr6agwa40t5jgtmp1az5gd8e04yr` and US child `pn78ktv7s0xqmhz1cyk7mhmheh8e11em` found no matching synthetic jobs. Both rejected creation with empty integration access, requiring at least one integration tool. No job was created or scheduled. Read/update/idempotency/deletion remain unverified. The intended product rule and tool contract need review before changing this restriction.
