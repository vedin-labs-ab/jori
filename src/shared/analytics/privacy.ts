type BeforeSend = import("posthog-js").BeforeSendFn

const pages = new Set([
  "home",
  "pricing",
  "privacy",
  "terms",
  "trust",
  "sign-in",
  "sign-out",
  "console",
  "chat",
  "context",
  "files",
  "folders",
  "integrations",
  "jobs",
  "runs",
  "settings",
  "skills",
  "stores",
  "tables",
  "usage",
  "waitlist",
])

/** Takes a router definition, never a browser pathname. Dynamic parameters
 * are discarded along with deeper routes, including invitation tokens. */
export function analyticsPage(routeId: string | undefined) {
  const page = routeId === "/" ? "home" : routeId?.split("/")[1]
  return page !== undefined && pages.has(page) ? page : undefined
}

/** A strict output schema also drops properties added by future SDK defaults,
 * integrations or accidental capture calls. Anonymous IDs stay host-local. */
export const minimizeEvent: BeforeSend = (event) => {
  if (event === null || event.event !== "$pageview") {
    return null
  }
  const page = event.properties.page
  if (typeof page !== "string" || !pages.has(page)) {
    return null
  }
  const properties: Record<string, string | boolean> = {
    page,
    $pathname: page === "home" ? "/" : `/${page}`,
    $process_person_profile: false,
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
    event: "$pageview",
    timestamp: event.timestamp,
    properties,
  }
}
