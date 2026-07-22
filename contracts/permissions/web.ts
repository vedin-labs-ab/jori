const webToolNames = ["web_search", "web_fetch"] as const

type WebToolName = (typeof webToolNames)[number]

export const webToolPermissionRows = [
  [
    "milo",
    "web_search",
    "Search web",
    "Search the public web.",
    "Search the public web for current sources and snippets. Use for facts you cannot get from connected tools, then fetch a result for its full contents.",
    "read",
  ],
  [
    "milo",
    "web_fetch",
    "Fetch web page",
    "Open a public web page by its address.",
    "Fetch the contents of a public web page by URL. Use to read a page found via search or a link the requester provided.",
    "read",
  ],
] as const

const webTools = new Set<string>(webToolNames)

export function isWebTool(tool: string): tool is WebToolName {
  return webTools.has(tool)
}
