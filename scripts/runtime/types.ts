export type RuntimeAssets = {
  app: {
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
}
