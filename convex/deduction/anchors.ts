import { type Doc } from "../_generated/dataModel"

// One stable token per source container. The same token appears on a belief's
// accumulated anchors and on incoming events, so the judge matches new
// activity to existing work structurally, before names. Broad containers (a
// whole repository) legitimately anchor several workstreams; anchors are a
// matching aid, not an identity.
export function eventAnchor(
  event: Pick<Doc<"events">, "data">
): string | undefined {
  const data = event.data

  if (data === undefined) {
    return undefined
  }

  if ("repository" in data) {
    return `github:repository:${data.repository.fullName}`
  }

  if ("channel" in data) {
    return `slack:channel:${data.channel.id}`
  }

  if ("notionEventId" in data) {
    const page = data.parent?.id ?? data.page?.id

    return page === undefined ? undefined : `notion:page:${page}`
  }

  return data.projectId === undefined
    ? undefined
    : `linear:project:${data.projectId}`
}
