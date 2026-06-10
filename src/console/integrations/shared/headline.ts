import { type ConnectionStatus } from "./card"

export type AccountStatus = {
  accountId: string
  email?: string
  name?: string
  status: Exclude<ConnectionStatus, undefined>
} | null

export type WorkspaceStatus = {
  accountId: string
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
    status?.email ??
    status?.accountId ??
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
    status?.accountId ??
    emptyHeadline
  )
}
