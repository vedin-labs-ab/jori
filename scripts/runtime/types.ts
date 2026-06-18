export type RuntimeAssets = {
  artifact: {
    builder: Record<string, string>
    dependencies: string[]
    fonts: {
      geistLatinWoff2: string
    }
    shell: {
      html: string
      loader: string
      style: string
    }
    template: Record<string, string>
  }
  mcp: {
    broker: string
    milo: string
    miloFiles: Record<string, string>
  }
  sandbox: {
    bootstrap: string
    imageCheck: string
    slackPreflight: string
    tokenPreflight: string
    traceServer: string
  }
}
