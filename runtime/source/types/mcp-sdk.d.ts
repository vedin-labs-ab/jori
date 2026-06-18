declare module "@modelcontextprotocol/sdk/server/index.js" {
  export class Server {
    constructor(
      identity: { name: string; version: string },
      options: { capabilities: { tools: Record<string, unknown> } }
    )

    setRequestHandler(
      schema: unknown,
      handler: (request: {
        params: { name: string; arguments?: unknown }
      }) => unknown | Promise<unknown>
    ): void

    connect(transport: unknown): Promise<void>
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {}
}

declare module "@modelcontextprotocol/sdk/types.js" {
  export const CallToolRequestSchema: unknown
  export const ListToolsRequestSchema: unknown
  export const ErrorCode: {
    InternalError: number
    InvalidParams: number
  }

  export class McpError extends Error {
    constructor(code: number, message: string)
  }
}
