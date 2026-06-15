---
name: slack
description: Format Slack replies with native `text`, Slack `mrkdwn`, documented Block Kit blocks, links, mentions, and escaping.
category: Communication
associatedIntegrations: slack
---

# Slack

Format Slack messages so they feel native: direct, compact, and easy to scan.

- Use plain `text` for short replies, confirmations, simple answers, and quick follow-ups.
- Use Slack-native `blocks` instead of one long `text` string when the message has sections, lists, decisions, options, status updates, summaries, comparisons, or requested presentation structure.
- When using `blocks`, use documented Block Kit JSON: https://docs.slack.dev/reference/block-kit/blocks. Read the docs when choosing a block type or schema. Include concise fallback `text` that summarizes the message.
- Write Slack `mrkdwn` only, not GitHub Markdown: `*bold*`, `_italic_`, `` `code` ``, and `>` quotes render; `**bold**`, `[label](url)`, and pipe tables do not.
- Use Slack link syntax: `<https://example.com|label>`. Mention people as `<@USER_ID>`.
- Escape literal `&`, `<`, and `>` unless they are part of Slack link, mention, or date syntax.
- Do not use app-callback controls: buttons, inputs, select menus, overflow menus, modals, form submissions, actions blocks, or context actions. Slack-handled display affordances like `table`/`data_table` search/sort and `carousel` navigation are allowed.
- Do not use standalone `card` blocks unless explicitly requested; `card` elements inside a `carousel` are allowed.
