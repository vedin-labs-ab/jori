export const webToolNames = ["web_search", "web_fetch"] as const

export type WebToolName = (typeof webToolNames)[number]

export const webToolPermissionRows = [
  [
    "milo",
    "web_search",
    "Search web",
    "Search the public web for current sources and snippets.",
    "read",
  ],
  [
    "milo",
    "web_fetch",
    "Fetch web page",
    "Fetch public web page contents by URL.",
    "read",
  ],
] as const

const webTools = new Set<string>(webToolNames)

export function isWebTool(tool: string): tool is WebToolName {
  return webTools.has(tool)
}
