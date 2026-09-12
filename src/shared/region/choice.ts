import { useSyncExternalStore } from "react"
import { regionConfig } from "./config"
import { readRegionChoice, subscribeRegionChoice } from "./preference"

const read = () => readRegionChoice(regionConfig)
const none = () => undefined

/** The region the visitor has chosen on this site, live across the page. */
export function useRegionChoice() {
  return useSyncExternalStore(subscribeRegionChoice, read, none)
}
