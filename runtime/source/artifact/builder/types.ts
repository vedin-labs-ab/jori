export type ArtifactSourceFile = {
  path: string
  content: string
  executable?: boolean
}

export type NormalizedArtifactSourceFile = {
  path: string
  content: string
  executable: boolean
  byteSize: number
}

export type FormattedArtifactSourceFile = NormalizedArtifactSourceFile & {
  byteSize: number
}

export type ArtifactBuildAsset = {
  path: string
  mimeType: string
  contentBase64: string
}

export type ArtifactContractJson = {
  version: number
  state: Array<{
    name: string
    key: string
    scope: "personal" | "shared"
    description?: string
    schemaName: string
    schemaVersion: number
    schemaHash: string
    schema: Record<string, unknown>
  }>
}

export type ArtifactManifest = {
  entry: string
  styles: string[]
}

export type BuilderConfig = {
  artifactTemplatePath: string
  platformArtifactSourcePathPrefixes: string[]
  requiredArtifactSourcePaths: string[]
  platformArtifactSourcePaths: string[]
}
