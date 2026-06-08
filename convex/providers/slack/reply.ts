export async function postReply(args: {
  token: string
  channel: string | undefined
  threadId: string | undefined
  text: string
}) {
  if (args.channel === undefined) {
    return { ok: false, error: "missing_channel" }
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: args.channel,
      text: args.text,
      thread_ts: args.threadId,
    }),
  })
  const result = (await response.json()) as {
    ok?: boolean
    error?: string
    ts?: string
  }

  return {
    ok: result.ok === true,
    error: result.error,
    ts: result.ts,
  }
}
