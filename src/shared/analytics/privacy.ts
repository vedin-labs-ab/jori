import { contractProperties, pages } from "./events"

type BeforeSend = import("posthog-js").BeforeSendFn

/** Takes a router fullPath definition, never a browser pathname. Dynamic parameters
 * are discarded along with deeper routes, including invitation tokens. */
export function analyticsPage(routePath: string | undefined) {
  const page = routePath === "/" ? "home" : routePath?.split("/")[1]
  return pages.find((known) => known === page)
}

/** A strict output schema: only events in the contract leave, carrying only
 * the contract's properties. That also drops whatever future SDK defaults,
 * integrations or accidental capture calls add. Anonymous IDs stay host-local. */
export const minimizeEvent: BeforeSend = (event) => {
  if (event === null) {
    return null
  }
  const contract = contractProperties(event.event, event.properties)
  if (contract === undefined) {
    return null
  }
  const properties: Record<string, string | number | boolean> = {
    ...contract,
    $process_person_profile: false,
  }
  if (event.event === "$pageview") {
    properties.$pathname = contract.page === "home" ? "/" : `/${contract.page}`
  }
  for (const name of [
    "token",
    "distinct_id",
    "$device_id",
    "$session_id",
    "$lib",
    "$lib_version",
  ]) {
    const value = event.properties[name]
    if (typeof value === "string") {
      properties[name] = value
    }
  }
  return {
    uuid: event.uuid,
    event: event.event,
    timestamp: event.timestamp,
    properties,
  }
}
