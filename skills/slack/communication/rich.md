Use Slack `blocks` when structure makes the message easier to scan, especially for results, blockers with next steps, research summaries, generated deliverables, grouped findings, small tables, previews, or messages with multiple sections.

When using `blocks`:

- Always include concise fallback `text`.
- Prefer `section`, `section.fields`, `context`, `divider`, and `header` for most structured replies.
- Use `table` for small tables, `data_table` for sortable/filterable tables, `data_visualization` for charts, `image` for previews, and `carousel` for multiple visual items.
- Never use interactive Slack surfaces or controls: `actions`, `context_actions`, `input`, buttons, selects, menus, modals, or form submissions. Callbacks are not handled.
