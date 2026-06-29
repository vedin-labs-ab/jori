import { compactMetadata, isRecord } from "./helpers"
import { toolInputMetadata } from "./input"
import { toolResultMetadata } from "./result"

export function toolInputMetadataTrace(tool: string, input: unknown) {
  const metadata = isRecord(input) ? toolInputMetadata(tool, input) : []

  return metadata.length === 0 ? {} : { metadata }
}

export function toolResultMetadataTrace(
  tool: string,
  input: unknown,
  result: unknown
) {
  const inputMetadata = isRecord(input) ? toolInputMetadata(tool, input) : []
  const resultMetadata = toolResultMetadata(tool, result)
  const metadata = compactMetadata([...inputMetadata, ...resultMetadata])

  return metadata.length === 0 ? {} : { metadata }
}
