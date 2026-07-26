---
name: image-generation
description: Generate a bitmap image asset with the `generate_image` tool and save it as a run asset. Use when the user asks Jori to produce an illustration, mockup, icon, texture, background, social image, or other generated picture.
category: creation
---

# Image Generation

Call `generate_image` to create the image. Don't claim an image exists unless
the tool returned a successful asset.

## Writing the Prompt

Turn the request into a complete, standalone prompt before calling the tool.
Cover subject, setting, composition, style, mood, materials, color constraints,
aspect expectation when implied, and any exact text that must appear. Prefer
concrete visual language over meta-instructions like "make it nice" or "high
quality". State negatives only when they prevent a likely mistake.

- Product or UI imagery: name the real object or interface, viewpoint, lighting,
  and legibility requirements.
- Icons and simple assets: one central subject, plus background treatment, edge
  style, and whether text should be absent.
- Images with text: quote the exact text, keep it short, and require it to be
  crisp and readable when legibility matters.

The tool only generates a new image from text — it has no transparent-output,
reference-image, or mask-edit support. Don't imply otherwise; if the request
needs one of those, say so.

## Assets

Generate one image per distinct asset; for several unrelated assets, call the
tool separately for each. Set `save.name` when the image has an obvious durable
name, and `save.description` when it helps the user tell assets apart later.

After the tool succeeds, reference the returned asset and workspace path. If the
image feeds another tool or an app, pass the returned `path` or `assetId`
instead of regenerating it.
