import { type Region } from "../../../contracts/region"
import { requireEnvironmentVariable } from "../../shared/environment"
import { requireRegion } from "../../shared/origin"

export function birdConfig(region: Region = requireRegion()) {
  if (region !== requireRegion()) {
    throw new Error("Email belongs to a different Jori region")
  }
  const apiKey = requireEnvironmentVariable("BIRD_API_KEY")
  const dataRegion = `${region}1`
  if (!apiKey.startsWith(`bk_${dataRegion}_`)) {
    throw new Error("Bird API key does not match this Jori region")
  }
  return {
    apiKey,
    endpoint: `https://${dataRegion}.platform.bird.com`,
    workspace: requireEnvironmentVariable("BIRD_WORKSPACE_ID"),
  }
}
