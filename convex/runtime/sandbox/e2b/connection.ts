import { type Sandbox } from "e2b"
import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../../../shared/environment.ts"

/** One deployment owns the connection. E2B's shared endpoint is temporary;
 * domain changes apply to create, reconnect and delete together. */
export function sandboxConnection(): NonNullable<
  Parameters<typeof Sandbox.connect>[1]
> {
  return {
    apiKey: requireEnvironmentVariable("E2B_API_KEY"),
    ...sandboxEndpoint(readEnvironmentVariable("E2B_DOMAIN")),
  }
}

/** Template builds and runtime operations must address the same provider. */
export function sandboxEndpoint(configuredDomain?: string) {
  const domain = configuredDomain ?? "e2b.app"
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(domain)) {
    throw new Error("E2B_DOMAIN must be a hostname")
  }
  return {
    domain,
    apiUrl: `https://api.${domain}`,
  }
}

export function sandboxTemplate() {
  return requireEnvironmentVariable("JORI_E2B_TEMPLATE")
}
