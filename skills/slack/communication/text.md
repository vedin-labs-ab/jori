Format Slack messages with Slack `mrkdwn`.

Use Slack-native formatting:

* `*bold*`, `_italic_`, `` `code` ``, and `>` quotes
* Links as `<https://example.com|label>`
* Mentions as `<@U123>` only with a real Slack user ID

Keep formatting simple and scannable. In Slack replies, do not use Markdown-style links `[label](url)`, double-asterisk bold `**bold**`, headings like `# Heading`, HTML, or pipe tables unless intentionally showing syntax.

Escape literal `&`, `<`, and `>` unless they are part of valid Slack syntax.