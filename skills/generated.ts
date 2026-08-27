export const skills = {
  "image-generation": {
    name: "image-generation",
    description:
      "Generate a bitmap image with the `generate_image` tool and save it as a file. Use when the user asks Jori to produce an illustration, mockup, icon, texture, background, social image, or other generated picture.",
    category: "creation",
    body: '# Image Generation\n\nCall `generate_image` to create the image. Don\'t claim an image exists unless\nthe tool returned a successful file.\n\n## Writing the Prompt\n\nTurn the request into a complete, standalone prompt before calling the tool.\nCover subject, setting, composition, style, mood, materials, color constraints,\naspect expectation when implied, and any exact text that must appear. Prefer\nconcrete visual language over meta-instructions like "make it nice" or "high\nquality". State negatives only when they prevent a likely mistake.\n\n- Product or UI imagery: name the real object or interface, viewpoint, lighting,\n  and legibility requirements.\n- Icons and simple images: one central subject, plus background treatment, edge\n  style, and whether text should be absent.\n- Images with text: quote the exact text, keep it short, and require it to be\n  crisp and readable when legibility matters.\n\nThe tool only generates a new image from text — it has no transparent-output,\nreference-image, or mask-edit support. Don\'t imply otherwise; if the request\nneeds one of those, say so.\n\n## Files\n\nGenerate one image per distinct file; for several unrelated files, call the\ntool separately for each. Set `save.name` when the image has an obvious durable\nname, and `save.description` when it helps the user tell files apart later.\n\nAfter the tool succeeds, reference the returned file and workspace path. If the\nimage feeds another tool or an app, pass the returned `path` or `fileId`\ninstead of regenerating it.',
  },
  slack: {
    name: "slack",
    description:
      "Format Slack replies with native `text`, Slack `mrkdwn`, documented Block Kit blocks, links, mentions, and escaping.",
    category: "communication",
    associatedIntegrations: ["slack"],
    communication: {
      parts: {
        text: "Most replies are a line or two of plain `mrkdwn`. Reach for structure only when it earns its place.\n\nFormat Slack messages with Slack `mrkdwn`, never GitHub Markdown: no `[label](url)` links, `**double-asterisk bold**`, `# headings`, HTML, or pipe tables.\n\nUse Slack-native formatting:\n\n- `*bold*`, `_italic_`, `` `code` ``, and `>` quotes\n- Links as `<https://example.com|label>`\n- Direct mentions as `<@U123>` only with a real Slack user ID\n- Escape literal `&`, `<`, and `>` unless they are part of valid Slack syntax; emoji shortcodes don't render inside code",
        rich: "Use Slack `blocks` when structure makes the message easier to scan: results, research summaries, grouped findings, previews, anything with multiple sections. Prefer `section`, `section.fields`, `context`, `divider`, and `header`; use `table` for small tables, `data_table` when sorting or filtering helps, `data_visualization` for charts, `image` for previews, and `carousel` for several visual items. Never use interactive elements (`actions`, `context_actions`, `input`, buttons, selects, menus, modals): callbacks are not handled.",
      },
    },
    body: "## Text\n\nMost replies are a line or two of plain `mrkdwn`. Reach for structure only when it earns its place.\n\nFormat Slack messages with Slack `mrkdwn`, never GitHub Markdown: no `[label](url)` links, `**double-asterisk bold**`, `# headings`, HTML, or pipe tables.\n\nUse Slack-native formatting:\n\n- `*bold*`, `_italic_`, `` `code` ``, and `>` quotes\n- Links as `<https://example.com|label>`\n- Direct mentions as `<@U123>` only with a real Slack user ID\n- Escape literal `&`, `<`, and `>` unless they are part of valid Slack syntax; emoji shortcodes don't render inside code\n\n## Rich\n\nUse Slack `blocks` when structure makes the message easier to scan: results, research summaries, grouped findings, previews, anything with multiple sections. Prefer `section`, `section.fields`, `context`, `divider`, and `header`; use `table` for small tables, `data_table` when sorting or filtering helps, `data_visualization` for charts, `image` for previews, and `carousel` for several visual items. Never use interactive elements (`actions`, `context_actions`, `input`, buttons, selects, menus, modals): callbacks are not handled.",
  },
} as const
