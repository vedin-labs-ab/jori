export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status })
}

export function unauthorizedResponse(headers?: HeadersInit) {
  return new Response("Unauthorized", { status: 401, headers })
}
