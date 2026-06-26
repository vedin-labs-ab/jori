/**
 * Artifact tools whose model-facing input is a workspace path. Before the call
 * reaches Convex, the worker builds that workspace and replaces the path with a
 * publish payload (source, build assets, contract). Because the payload no
 * longer matches the model-facing schema, the broker skips schema validation
 * for these tools and the publish action validates the built payload instead.
 */
export const artifactPublishTools = [
  "create_artifact",
  "update_artifact",
] as const

export type ArtifactPublishTool = (typeof artifactPublishTools)[number]

export function isArtifactPublishTool(
  tool: string
): tool is ArtifactPublishTool {
  return (artifactPublishTools as readonly string[]).includes(tool)
}
