import { type ConnectionStatus } from "./card"

export type AccountStatus = {
  externalId: string
  email?: string
  fallbackEmail?: string
  fallbackName?: string
  name?: string
  status: Exclude<ConnectionStatus, undefined>
} | null

export type WorkspaceStatus = {
  externalId: string
  status: Exclude<ConnectionStatus, undefined>
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
    status?.fallbackName ??
    status?.email ??
    status?.fallbackEmail ??
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
