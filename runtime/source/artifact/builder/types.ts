export type {
  ArtifactSourceFile,
  NormalizedArtifactSourceFile,
} from "../../../../contracts/artifacts/source.ts"

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
