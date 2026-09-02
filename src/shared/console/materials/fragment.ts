import { parseShareFragment } from "@contracts/shares/fragment"
import { useEffect } from "react"

type MaterialLocation = Pick<Location, "hash" | "pathname" | "search">

/** A successful member view no longer needs the capability secret carried
 *  in the URL fragment; drop it so copied URLs stay clean. */
function memberMaterialUrl(location: MaterialLocation) {
  if (parseShareFragment(location.hash) === null) {
    return null
  }

  return `${location.pathname}${location.search}`
}

export function useMemberUrl() {
  useEffect(() => {
    const url = memberMaterialUrl(window.location)

    if (url !== null) {
      window.history.replaceState(window.history.state, "", url)
    }
  }, [])
}
