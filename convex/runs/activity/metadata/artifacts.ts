import { clampShareExpiryHours } from "../../../../contracts/artifacts/share"
import { item, readNumber, readString } from "../helpers"

type ArtifactMetadataArgs = {
  artifactTitles: ReadonlyMap<string, string>
  input: Record<string, unknown> | undefined
  runArtifactId: string | undefined
  tool: string
}

export function artifactMetadata(args: ArtifactMetadataArgs) {
  const artifactId = activityArtifactId(
    args.tool,
    args.input,
    args.runArtifactId
  )

  if (artifactId === undefined) {
    return []
  }

  const artifactTitle = args.artifactTitles.get(artifactId) ?? artifactId

  if (args.tool === "read_artifact_state") {
    return [
      item("target", artifactTitle),
      item("scope", readString(args.input?.contractName)),
    ]
  }

  return [
    item("target", artifactTitle),
    item("scope", shareDurationLabel(args.input?.expiresInHours)),
  ]
}

export function activityArtifactId(
  tool: string | undefined,
  input: Record<string, unknown> | undefined,
  runArtifactId: string | undefined
) {
  if (tool !== "read_artifact_state" && tool !== "share_artifact") {
    return undefined
  }

  return (
    readString(input?.artifactId) ??
    (tool === "read_artifact_state" ? runArtifactId : undefined)
  )
}

function shareDurationLabel(value: unknown) {
  const hours = clampShareExpiryHours(readNumber(value))

  return `${hours}h link`
}
