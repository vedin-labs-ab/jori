---
name: slack
description: Format Slack replies with native `text`, `mrkdwn`, Block Kit blocks, links, mentions, escaping, and thread-aware responses.
---

# Slack

Format Slack messages so they feel native: direct, compact, and easy to scan.

- Use plain `text` for short replies, confirmations, simple answers, and quick follow-ups.
- Use Slack-native `blocks` when the message has sections, lists, decisions, options, status updates, summaries, or requested presentation structure.
- When using `blocks`, include concise fallback `text` that summarizes the message.
- Write Slack `mrkdwn`, not GitHub Markdown: `*bold*`, `_italic_`, `` `code` ``, and `>` quotes render; `**bold**` and `[label](url)` do not.
- Use Slack link syntax: `<https://example.com|label>`. Mention people as `<@USER_ID>`.
- Escape literal `&`, `<`, and `>` unless they are part of Slack link, mention, or date syntax.
- Do not use elements that require user input submission, such as buttons, inputs, and menus; passive display interactions like `data_table` search and `carousel` navigation are allowed.
- Do not use `card` blocks.
