/**
 * App tools whose model-facing input is a workspace path. Before the call
 * reaches Convex, the worker builds that workspace and replaces the path with a
 * publish payload (source, build assets, contract). Because the payload no
 * longer matches the model-facing schema, the broker skips schema validation
 * for these tools and the publish action validates the built payload instead.
 */
const appPublishTools = ["create_app", "update_app"] as const

type AppPublishTool = (typeof appPublishTools)[number]

export function isAppPublishTool(tool: string): tool is AppPublishTool {
  return (appPublishTools as readonly string[]).includes(tool)
}
