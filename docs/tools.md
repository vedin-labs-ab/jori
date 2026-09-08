# Agent tool verification

Started 8 September 2026 on task/agent-verification, base 25bb89e3.

## Completion rule

All 105 catalogued tools must have an actual Jori agent-run result in each production region. Channel-specific reply/reaction variants, meaningful operation variants, validation, permissions, and failure paths are tracked separately. Automated tests and direct provider probes support the evidence but are not agent E2E passes. Existing release evidence is historical until reproduced.

Use labeled synthetic fixtures. Do not modify unrelated customer content, send to outside recipients, enable global inference fallbacks, or weaken approval checks. Record run IDs and result summaries without credentials or private payloads. Record blocked and failed tools explicitly. Test fixtures may remain for reproducibility until cleanup is authorized.

## Coverage

Every catalogued input and output schema compiles independently with Ajv. All 93 broker tools reject invalid root values and unknown fields in contract tests. These checks do not establish provider behavior or complete per-tool validation coverage.

The table round trips below completed in both regions, but their output contracts need a post-fix rerun. Other rows remain pending until their recorded calls are reviewed.

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
| jori | `load_skill` | Compiles | Pending | Pending |
| jori | `search_runs` | Compiles | Pending | Pending |
| jori | `search_run_activity` | Compiles | Pending | Pending |
| jori | `read_workstreams` | Compiles | Pending | Pending |
| jori | `offer_integration` | Compiles | Pending | Pending |
| jori | `cancel_approval_request` | Compiles | Pending | Pending |
| jori | `cancel_integration_offer` | Compiles | Pending | Pending |
| jori | `save_file` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `generate_image` | Compiles | Pending | Pending |
| jori | `search_files` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `read_file` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `search_jobs` | Compiles | Pending | Pending |
| jori | `read_job` | Compiles | Pending | Pending |
| jori | `add_job` | Compiles | Pending | Pending |
| jori | `update_job` | Compiles | Pending | Pending |
| jori | `delete_job` | Compiles | Pending | Pending |
| linear | `linear_search_issues` | Compiles | Pending | Pending |
| linear | `linear_get_issue` | Compiles | Pending | Pending |
| linear | `linear_list_comments` | Compiles | Pending | Pending |
| linear | `linear_add_comment` | Compiles | Pending | Pending |
| linear | `linear_add_reaction` | Compiles | Pending | Pending |
| jori | `search_tables` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `read_table` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `list_table_rows` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `create_table` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `insert_table_row` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `update_table_row` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `delete_table_row` | Compiles | Pending | Pending |
| jori | `share_table` | Compiles | Pending | Pending |
| jori | `search_stores` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `read_store` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `create_store` | Compiles | Round trip, contract retest | Round trip, contract retest |
| jori | `write_store` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
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
| jori | `grep` | Compiles | Basic pass, filter retest | Filter defect, retest |
| jori | `glob` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `git` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `apply_patch` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `bash` | Compiles | Basic pass, restrictions reviewed | Basic pass, restrictions reviewed |
| jori | `start_agent` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `wait_for_agents` | Compiles | Basic pass, batch 1/2 | Basic pass, batch 1/2 |
| jori | `stop_agent` | Compiles | Pending | Pending |
| notion | `notion_search` | Compiles | Pending | Pending |
| notion | `notion_get_page` | Compiles | Pending | Pending |
| notion | `notion_get_block_children` | Compiles | Pending | Pending |
| notion | `notion_query_data_source` | Compiles | Pending | Pending |
| notion | `notion_list_comments` | Compiles | Pending | Pending |
| notion | `notion_create_page` | Compiles | Pending | Pending |
| notion | `notion_update_page` | Compiles | Pending | Pending |
| notion | `notion_upload_file` | Compiles | Pending | Pending |
| notion | `notion_append_block_children` | Compiles | Pending | Pending |
| notion | `notion_create_comment` | Compiles | Pending | Pending |
| slack | `channels_list` | Compiles | Pending | Pending |
| slack | `conversations_history` | Compiles | Pending | Pending |
| slack | `conversations_replies` | Compiles | Pending | Pending |
| slack | `conversations_search_messages` | Compiles | Pending | Pending |
| slack | `users_search` | Compiles | Pending | Pending |
| slack | `conversations_add_message` | Compiles | Pending | Pending |
| slack | `slack_add_reaction` | Compiles | Pending | Pending |
| jori | `web_search` | Compiles | Pending | Pending |
| jori | `web_fetch` | Compiles | Pending | Pending |

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

EU conversation `jx72vt2g901czvt43avvqxr3hx8e1psj` and the existing US audit conversation have active batch 3 requests. Each asks a child to use only public web tools plus core Jori image generation. Their results remain pending review.

### Provider access

The EU verification organization has Notion connected. GitHub, Slack and Linear report not connected. The GitHub EU installation is prepared for selected repositories, not all repositories, but no installation grant has been submitted.
