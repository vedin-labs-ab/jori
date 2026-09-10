// WebSocket-only interception leaves unrelated HTTP caching enabled.
export async function installSocketFixtures(page, options) {
  const state = {
    queryRules: [],
    mutationFailures: [],
    onLog: () => {},
    ...options,
    usedQueries: new Set(),
    usedMutations: new Set(),
  }
  await page.routeWebSocket("**/api/*/sync", (socket) => connect(socket, state))
}

function connect(socket, state) {
  const server = socket.connectToServer()
  const context = { ...state, socket, server, queries: new Map() }
  socket.onMessage((message) => fromBrowser(message, context))
  server.onMessage((message) => fromServer(message, context))
}

function fromBrowser(message, context) {
  const data = parse(message)
  if (data?.type === "ModifyQuerySet") {
    for (const modification of data.modifications) {
      if (modification.type === "Add") {
        context.queries.set(modification.queryId, modification.udfPath)
      }
      if (modification.type === "Remove") {
        context.queries.delete(modification.queryId)
      }
    }
  }
  if (
    context.armed() &&
    data?.type === "Mutation" &&
    failMutation(data, context)
  ) {
    return
  }
  context.server.send(message)
}

function failMutation(data, context) {
  const index = context.mutationFailures.findIndex(
    (rule) => rule.udfPath === data.udfPath
  )
  if (
    index < 0 ||
    (!context.mutationFailures[index].persistent &&
      context.usedMutations.has(index))
  ) {
    return false
  }
  context.usedMutations.add(index)
  context.socket.send(
    JSON.stringify({
      type: "MutationResponse",
      requestId: data.requestId,
      success: false,
      result: "Layout audit transient transport failure",
      logLines: [],
    })
  )
  context.onLog({ kind: "mutation-fault-before-send", udfPath: data.udfPath })
  return true
}

function fromServer(message, context) {
  const data = parse(message)
  let changed = false
  if (context.armed() && data?.type === "Transition") {
    data.modifications = data.modifications.map((modification) => {
      const result = updateQuery(modification, context)
      changed ||= result !== modification
      return result
    })
  }
  context.socket.send(changed ? JSON.stringify(data) : message)
}

function updateQuery(modification, context) {
  if (modification.type !== "QueryUpdated") {
    return modification
  }
  const udfPath = context.queries.get(modification.queryId)
  const index = context.queryRules.findIndex((rule) => rule.udfPath === udfPath)
  if (
    index < 0 ||
    (!context.queryRules[index].persistent && context.usedQueries.has(index))
  ) {
    return modification
  }
  context.usedQueries.add(index)
  const rule = context.queryRules[index]
  context.onLog({
    kind: rule.transform ? "query-state-fixture" : "query-fault",
    udfPath,
  })
  return rule.transform
    ? { ...modification, value: rule.transform(modification.value) }
    : {
        type: "QueryFailed",
        queryId: modification.queryId,
        errorMessage: "Layout audit transient query failure",
        errorData: null,
        logLines: [],
        journal: modification.journal,
      }
}

function parse(message) {
  try {
    return JSON.parse(
      typeof message === "string" ? message : message.toString()
    )
  } catch {
    return null
  }
}
