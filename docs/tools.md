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
| github | `github_list_repositories` | Pending | Pending | Pending |
| github | `github_get_repository` | Pending | Pending | Pending |
| github | `github_search_issues` | Pending | Pending | Pending |
| github | `github_get_issue` | Pending | Pending | Pending |
| github | `github_get_pull_request` | Pending | Pending | Pending |
| github | `github_get_file` | Pending | Pending | Pending |
| github | `github_clone_repository` | Pending | Pending | Pending |
| github | `github_add_issue_comment` | Pending | Pending | Pending |
| github | `github_reply_to_pull_request_review_comment` | Pending | Pending | Pending |
| github | `github_list_pull_request_files` | Pending | Pending | Pending |
| github | `github_list_pull_request_review_comments` | Pending | Pending | Pending |
| github | `github_commit_to_pull_request` | Pending | Pending | Pending |
| github | `github_create_pull_request` | Pending | Pending | Pending |
| github | `github_add_comment_reaction` | Pending | Pending | Pending |
| github | `github_update_pull_request` | Pending | Pending | Pending |
| gmail | `google_gmail_search_threads` | Pending | Pending | Pending |
| gmail | `google_gmail_get_thread` | Pending | Pending | Pending |
| gmail | `google_gmail_get_threads` | Pending | Pending | Pending |
| gmail | `google_gmail_get_message` | Pending | Pending | Pending |
| gmail | `google_gmail_get_messages` | Pending | Pending | Pending |
| gmail | `google_gmail_reply_to_thread` | Pending | Pending | Pending |
| gmail | `google_gmail_send_message` | Pending | Pending | Pending |
| gmail | `google_gmail_create_draft` | Pending | Pending | Pending |
| googleCalendar | `google_calendar_list_calendars` | Pending | Pending | Pending |
| googleCalendar | `google_calendar_list_events` | Pending | Pending | Pending |
| googleCalendar | `google_calendar_get_event` | Pending | Pending | Pending |
| googleCalendar | `google_calendar_create_event` | Pending | Pending | Pending |
| googleCalendar | `google_calendar_update_event` | Pending | Pending | Pending |
| jori | `list_capabilities` | Pending | Pending | Pending |
| jori | `load_skill` | Pending | Pending | Pending |
| jori | `search_runs` | Pending | Pending | Pending |
| jori | `search_run_activity` | Pending | Pending | Pending |
| jori | `read_workstreams` | Pending | Pending | Pending |
| jori | `offer_integration` | Pending | Pending | Pending |
| jori | `cancel_approval_request` | Pending | Pending | Pending |
| jori | `cancel_integration_offer` | Pending | Pending | Pending |
| jori | `save_file` | Pending | Pending | Pending |
| jori | `generate_image` | Pending | Pending | Pending |
| jori | `search_files` | Pending | Pending | Pending |
| jori | `read_file` | Pending | Pending | Pending |
| jori | `search_jobs` | Pending | Pending | Pending |
| jori | `read_job` | Pending | Pending | Pending |
| jori | `add_job` | Pending | Pending | Pending |
| jori | `update_job` | Pending | Pending | Pending |
| jori | `delete_job` | Pending | Pending | Pending |
| linear | `linear_search_issues` | Pending | Pending | Pending |
| linear | `linear_get_issue` | Pending | Pending | Pending |
| linear | `linear_list_comments` | Pending | Pending | Pending |
| linear | `linear_add_comment` | Pending | Pending | Pending |
| linear | `linear_add_reaction` | Pending | Pending | Pending |
| jori | `search_tables` | Pending | Pending | Pending |
| jori | `read_table` | Pending | Pending | Pending |
| jori | `list_table_rows` | Pending | Pending | Pending |
| jori | `create_table` | Pending | Pending | Pending |
| jori | `insert_table_row` | Pending | Pending | Pending |
| jori | `update_table_row` | Pending | Pending | Pending |
| jori | `delete_table_row` | Pending | Pending | Pending |
| jori | `share_table` | Pending | Pending | Pending |
| jori | `search_stores` | Pending | Pending | Pending |
| jori | `read_store` | Pending | Pending | Pending |
| jori | `create_store` | Pending | Pending | Pending |
| jori | `write_store` | Pending | Pending | Pending |
| jori | `share_store` | Pending | Pending | Pending |
| jori | `share_file` | Pending | Pending | Pending |
| microsoftEmail | `microsoft_email_search_messages` | Pending | Pending | Pending |
| microsoftEmail | `microsoft_email_get_message` | Pending | Pending | Pending |
| microsoftEmail | `microsoft_email_send_message` | Pending | Pending | Pending |
| microsoftEmail | `microsoft_email_create_draft` | Pending | Pending | Pending |
| microsoftEmail | `microsoft_email_update_message` | Pending | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_list_calendars` | Pending | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_list_events` | Pending | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_get_event` | Pending | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_create_event` | Pending | Pending | Pending |
| microsoftCalendar | `microsoft_calendar_update_event` | Pending | Pending | Pending |
| jori | `finish_run` | Pending | Pending | Pending |
| jori | `send_reply` | Pending | Pending | Pending |
| jori | `add_reaction` | Pending | Pending | Pending |
| jori | `read` | Pending | Pending | Pending |
| jori | `grep` | Pending | Pending | Pending |
| jori | `glob` | Pending | Pending | Pending |
| jori | `git` | Pending | Pending | Pending |
| jori | `apply_patch` | Pending | Pending | Pending |
| jori | `bash` | Pending | Pending | Pending |
| jori | `start_agent` | Pending | Pending | Pending |
| jori | `wait_for_agents` | Pending | Pending | Pending |
| jori | `stop_agent` | Pending | Pending | Pending |
| notion | `notion_search` | Pending | Pending | Pending |
| notion | `notion_get_page` | Pending | Pending | Pending |
| notion | `notion_get_block_children` | Pending | Pending | Pending |
| notion | `notion_query_data_source` | Pending | Pending | Pending |
| notion | `notion_list_comments` | Pending | Pending | Pending |
| notion | `notion_create_page` | Pending | Pending | Pending |
| notion | `notion_update_page` | Pending | Pending | Pending |
| notion | `notion_upload_file` | Pending | Pending | Pending |
| notion | `notion_append_block_children` | Pending | Pending | Pending |
| notion | `notion_create_comment` | Pending | Pending | Pending |
| slack | `channels_list` | Pending | Pending | Pending |
| slack | `conversations_history` | Pending | Pending | Pending |
| slack | `conversations_replies` | Pending | Pending | Pending |
| slack | `conversations_search_messages` | Pending | Pending | Pending |
| slack | `users_search` | Pending | Pending | Pending |
| slack | `conversations_add_message` | Pending | Pending | Pending |
| slack | `slack_add_reaction` | Pending | Pending | Pending |
| jori | `web_search` | Pending | Pending | Pending |
| jori | `web_fetch` | Pending | Pending | Pending |

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

### Store and sandbox batch in progress

EU parent `nx7b19jy0e4ff07zg8xdncdtt58e1d47` created child `nx75ymsrzv1d3x4bp8x9bfhtnx8e0kwc` with `integrations: []` and `web: false`. The child created store `js7121wm9rde5xxnpvafqkh1wx8e04af`, wrote count 1, merge-patched count 2 with optimistic versioning, and read back version 2. Its sandbox rejected the requested path outside the Jori workspace and rejected Git writes through bash. Those refusals match the sandbox restrictions; the test prompt must use supported paths and Git operations.

US batch parent `pn757kxcp57gz66ncmaqnchjzx8e0n5t` is still under review. Do not infer completion from a submitted prompt.
