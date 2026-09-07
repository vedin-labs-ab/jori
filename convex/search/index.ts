import { requireRegion } from "../shared/origin"
import { createExaClient } from "./exa"
import { type SearchClient } from "./types"

// Selection belongs to the deployment, never a caller-supplied tenant region.
// A regional replacement can be selected here without changing either caller.
export function createSearchClient(): SearchClient {
  return createExaClient(requireRegion())
}
