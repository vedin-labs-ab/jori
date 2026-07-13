"use node"

import { type Doc } from "../../_generated/dataModel"
import { createArtifactSourceSnapshot } from "../../artifacts/source"
import { playbookBlueprints } from "./_generated/blueprints"

export type PlaybookBlueprint =
  (typeof playbookBlueprints)[keyof typeof playbookBlueprints]

export function readPlaybookBlueprint(key: string) {
  return key in playbookBlueprints
    ? playbookBlueprints[key as keyof typeof playbookBlueprints]
    : undefined
}

export function isCurrentPlaybookBlueprint(
  existing: { artifact: Doc<"artifacts">; treeId?: string },
  blueprint: PlaybookBlueprint
) {
  const treeId = createArtifactSourceSnapshot(
    blueprint.source.map((file) => ({ ...file }))
  ).treeId

  return (
    existing.treeId === treeId &&
    existing.artifact.title === blueprint.title &&
    existing.artifact.access === blueprint.access
  )
}
