import { type ConnectionStatus } from "./card"

export type WorkspaceStatus = {
  accountId: string
  status: Exclude<ConnectionStatus, undefined>
} | null

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
