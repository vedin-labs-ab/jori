/** Search locators are data, not navigation instructions. Offsets are UTF-16
 * within the named field/page/section and are valid only for this revision. */
export type MatchLocation = {
  kind: "resource" | "row" | "message" | "activity" | "passage"
  id: string
  label?: string
  field?: string
  page?: number
  seconds?: number
  sheet?: string
  cell?: string
  start?: number
  end?: number
}
export type DiscoveryKind =
  | "folder"
  | "file"
  | "table"
  | "store"
  | "chat"
  | "job"
  | "run"
export type Candidate = {
  key: string
  revision: string
  part: number
  score: number
}
export type Hit = {
  candidate: Candidate
  kind: DiscoveryKind
  resourceId: string
  title: string
  resourceName: string
  /** A compact display window from `excerpt`; source offsets stay in location. */
  snippet: string
  location: MatchLocation
  coverage?: string
}
export type SearchResponse = {
  candidates: Candidate[]
  partial: boolean
  unavailable: boolean
}
