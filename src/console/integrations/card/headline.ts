export type IntegrationCardStatus =
  | "active"
  | "disconnected"
  | "expired"
  | undefined

type AccountStatus = {
  externalId: string
  email?: string
  name?: string
  status: Exclude<IntegrationCardStatus, undefined>
} | null

type WorkspaceStatus = {
  externalId: string
  status: Exclude<IntegrationCardStatus, undefined>
} | null

export function getAccountHeadline(
  status: AccountStatus | undefined,
  label: string
) {
  if (status === undefined) {
    return `Checking ${label}`
  }

  return (
    status?.name ??
    status?.email ??
    status?.externalId ??
    `No ${label} connected`
  )
}

export function getWorkspaceHeadline(
  status: WorkspaceStatus | undefined,
  label: string,
  emptyHeadline: string,
  ...connectedLabels: (string | undefined)[]
) {
  if (status === undefined) {
    return `Checking ${label}`
  }

  return (
    connectedLabels.find((value) => value !== undefined) ??
    status?.externalId ??
    emptyHeadline
  )
}
