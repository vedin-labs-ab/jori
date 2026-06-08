import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"

const http = httpRouter()

function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}

http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity()

      if (identity === null) {
        return unauthorizedResponse()
      }
    } catch {
      return unauthorizedResponse()
    }

    return new Response("pong", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }),
})

export default http
