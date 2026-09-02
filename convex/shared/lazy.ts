import { type ActionCtx, httpAction } from "../_generated/server"

export type LazyHandler = (
  ctx: ActionCtx,
  request: Request
) => Promise<Response> | Response

/** An httpAction that loads its handler module on first request. Convex
 *  evaluates http.ts's whole static module graph per execution inside a hard
 *  memory ceiling, so route groups must only be paid for when traffic hits
 *  them. */
export function lazyHttpAction<Module>(
  load: () => Promise<Module>,
  pick: (module: Module) => LazyHandler
) {
  return httpAction(async (ctx, request) => {
    const handler = pick(await load())

    return await handler(ctx, request)
  })
}
