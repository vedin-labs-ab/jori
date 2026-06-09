export function getNotionWorkspaceName(data: unknown) {
  return readNotionDataString(data, "workspaceName")
}

export function getNotionWorkspaceIcon(data: unknown) {
  return readNotionDataString(data, "workspaceIcon")
}

export function getNotionBotId(data: unknown) {
  return readNotionDataString(data, "botId")
}

export function getNotionOwnerName(data: unknown) {
  const owner = readNotionDataObject(data, "owner")
  const user = readNotionDataObject(owner, "user")

  return readNotionDataString(user, "name")
}

export function getNotionOwnerEmail(data: unknown) {
  const owner = readNotionDataObject(data, "owner")
  const user = readNotionDataObject(owner, "user")
  const person = readNotionDataObject(user, "person")

  return readNotionDataString(person, "email")
}

function readNotionDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}

function readNotionDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
