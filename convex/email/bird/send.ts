import { type Region } from "../../../contracts/region"
import { type Message } from "../schema"
import { birdConfig } from "./config"

export type SendResult =
  | { kind: "accepted"; providerId: string }
  | { kind: "retry"; failure: string; retryAfterMs?: number }
  | { kind: "failed"; failure: string }

export async function send(
  id: string,
  region: Region,
  message: Message
): Promise<SendResult> {
  const config = birdConfig(region)
  let response: Response
  try {
    response = await fetch(`${config.endpoint}/v1/email/messages`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
      },
      body: JSON.stringify({
        ...message,
        from: "Jori <hello@mail.usejori.com>",
        to: [message.to],
        category: "transactional",
        track_opens: false,
        track_clicks: false,
        metadata: { submission_id: id, region },
      }),
    })
  } catch {
    return { kind: "retry", failure: "transport" }
  }
  return await readResponse(response)
}

async function readResponse(response: Response): Promise<SendResult> {
  if (response.status === 202) {
    const body: unknown = await response.json().catch(() => null)
    if (isRecord(body) && typeof body.id === "string") {
      return { kind: "accepted", providerId: body.id }
    }
    return { kind: "retry", failure: "invalid_acceptance" }
  }
  const failure = `http_${response.status}`
  if (
    response.status === 429 ||
    response.status >= 500 ||
    response.status === 409
  ) {
    const seconds = Number(response.headers.get("Retry-After"))
    return {
      kind: "retry",
      failure,
      retryAfterMs: Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 0,
    }
  }
  return { kind: "failed", failure }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
