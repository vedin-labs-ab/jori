import { isRegion } from "../../../../contracts/region.ts"
import { requireEnvironmentVariable } from "../../../shared/environment.ts"

const sandboxRegions = { eu: "eu-fra-1", us: "us-was-1" } as const

export function sandboxConnection() {
  const region = requireEnvironmentVariable("JORI_REGION")
  if (!isRegion(region)) {
    throw new Error("JORI_REGION must be eu or us")
  }
  return {
    apiKey: requireEnvironmentVariable("BL_API_KEY"),
    workspace: requireEnvironmentVariable("BL_WORKSPACE"),
    region: sandboxRegions[region],
    prefix: `jori-${region}-`,
  }
}

export function sandboxImage() {
  return requireEnvironmentVariable("JORI_BLAXEL_IMAGE")
}

/** Validate the provider's response before sending files, commands or tokens. */
export function assertSandboxRegion(
  sandbox: {
    metadata: { name?: string; url?: string; workspace?: string }
    spec: { region?: string }
  },
  connection: ReturnType<typeof sandboxConnection>
) {
  const url = new URL(sandbox.metadata.url ?? "https://invalid")
  if (
    sandbox.spec.region !== connection.region ||
    sandbox.metadata.workspace !== connection.workspace ||
    !sandbox.metadata.name?.startsWith(connection.prefix) ||
    url.protocol !== "https:" ||
    !url.hostname.endsWith(`.${connection.region}.bl.run`) ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    throw new Error("Sandbox does not belong to this deployment's region.")
  }
}
