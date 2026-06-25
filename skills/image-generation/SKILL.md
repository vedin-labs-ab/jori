---
name: image-generation
description: Generate Milo image assets with the `generate_image` tool and save them as run assets.
category: Milo
---

# Image Generation

Use this skill when the user asks Milo to create a visual asset, illustration,
mockup, diagram-like image, social image, icon concept, texture, background, or
other generated bitmap.

Call `generate_image` for the actual image. Do not claim an image was created
unless the tool returned a successful asset.

## Tool Contract

Use:

```json
{
  "prompt": "Complete image prompt.",
  "save": {
    "name": "optional-file-name",
    "description": "optional asset description"
  }
}
```

Only `prompt` is required. Use `save.name` when the image has an obvious durable
name. Use `save.description` when it will help the user distinguish the asset
later.

## Workflow

Before calling the tool, turn the user's request into a complete standalone
image prompt. Include the subject, setting, composition, style, mood, materials,
color constraints, aspect expectation when implied, and any exact text that must
appear in the image.

Keep prompts direct. Prefer concrete visual language over meta-instructions.
State important negatives only when they prevent likely mistakes.

Generate one image per distinct asset. If the user asks for several unrelated
assets, call `generate_image` separately for each one with a clear filename.

After the tool succeeds, reference the returned asset and workspace path.
If the image is meant for another tool or an artifact, use the returned `path`
or `assetId` instead of regenerating it.

## Prompt Quality

For product or UI imagery, specify the real object or interface, viewpoint,
lighting, and legibility requirements. Avoid vague phrases such as "make it
nice" or "high quality" unless paired with concrete visual direction.

For icons and simple assets, specify a single central subject, background
treatment, edge style, and whether text should be absent.

For images with text, quote the exact text and keep it short. If exact text is
critical, mention that it must be crisp and readable.

For transparent, reference-based, or edit-heavy requests, explain the current
tool only generates a new image from text when necessary. Do not invent
reference-image or mask-edit support.
