import {
  type ArtifactContract,
  type ArtifactContractStateEntry,
  assertContractStateValue,
  normalizeArtifactContract,
  resolveArtifactStateContract,
} from "../../../contracts/artifacts/contract"
import { type Doc } from "../../_generated/dataModel"

export {
  type ArtifactContract,
  type ArtifactContractStateEntry,
  assertContractStateValue,
  normalizeArtifactContract,
}

export function resolveStateContract(
  artifact: Doc<"artifacts">,
  contractName: string
) {
  return resolveArtifactStateContract(artifact.contract, contractName)
}
