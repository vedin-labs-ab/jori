import { requireRegion } from "../shared/origin"
import { createParallelClient } from "./parallel"
import { type SearchClient } from "./types"

// Selection belongs to the deployment, never a caller-supplied tenant region.
export function createSearchClient(): SearchClient {
  return createParallelClient(requireRegion())
}
