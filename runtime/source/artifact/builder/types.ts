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

export type ArtifactBuildAsset = {
  path: string
  mimeType: string
  contentBase64: string
}

export type ArtifactManifest = {
  entry: string
  styles: string[]
}

export type BuilderConfig = {
  artifactTemplatePath: string
}
