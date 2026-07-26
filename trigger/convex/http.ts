import { isRecord } from "../../contracts/json"
import { type RuntimeId } from "../../contracts/runtime/worker"

/** POST to a Jori worker HTTP endpoint: the run id and worker secret ride
 *  the x-jori-* headers, the response is JSON, and failures surface the
 *  server's { error } envelope when present. */
export async function postWorkerEndpoint(args: {
  body: BodyInit
  contentType: string
  failure: string
  runId: RuntimeId<"runs">
  secret: string
  url: URL
}): Promise<unknown> {
  const response = await fetch(args.url, {
    body: args.body,
    headers: {
      "content-type": args.contentType,
      "x-jori-run-id": args.runId,
      "x-jori-worker-secret": args.secret,
    },
    method: "POST",
  })
  const result = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(
      isRecord(result) && typeof result.error === "string"
        ? result.error
        : args.failure
    )
  }

  return result
}
