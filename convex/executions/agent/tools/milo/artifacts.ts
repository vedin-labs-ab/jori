import {
  artifactEntrypoint,
  platformArtifactSourcePathPrefixes,
  platformArtifactSourcePaths,
  requiredArtifactSourcePaths,
} from "../../../../artifacts/template"
import { runtimeAssets } from "../../../../runtime/_generated/assets"
import { workspace } from "../../sandbox/harness"
import { type SandboxFile } from "../types"

export const artifactBuilderScriptPath = `${workspace}/milo-artifact-builder.ts`
export const artifactBuilderConfigPath = `${workspace}/.milo/artifact-builder.json`
export const artifactTemplatePath = `${workspace}/.milo/artifact-template`

export function createArtifactBuilderFiles(): SandboxFile[] {
  return Object.entries(runtimeAssets.artifact.builder).map(
    ([filePath, content]) => ({
      path: `${workspace}/${filePath}`,
      content,
    })
  )
}

export function createArtifactBuilderConfigFile(): SandboxFile {
  return {
    path: artifactBuilderConfigPath,
    content: `${JSON.stringify(createArtifactBuilderConfig(), null, 2)}\n`,
  }
}

export function createArtifactTemplateFiles(): SandboxFile[] {
  return Object.entries(runtimeAssets.artifact.template).map(
    ([filePath, content]) => ({
      path: `${artifactTemplatePath}/${filePath}`,
      content,
    })
  )
}

function createArtifactBuilderConfig() {
  return {
    artifactEntrypoint,
    artifactTemplatePath,
    platformArtifactSourcePathPrefixes,
    platformArtifactSourcePaths,
    requiredArtifactSourcePaths,
  }
}
