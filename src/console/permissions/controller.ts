import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { readErrorMessage } from "../error"

export type PermissionMode = "required" | "allowed" | "prompted" | "blocked"
export type ConfigurablePermissionMode = Exclude<PermissionMode, "required">
export type ToolAccess = "read" | "write"

export type ToolProvider =
  | "milo"
  | "slack"
  | "linear"
  | "github"
  | "gmail"
  | "googleCalendar"
  | "googleDrive"
  | "notion"
  | "microsoftEmail"
  | "microsoftCalendar"

export type ToolPermission = {
  tool: string
  provider: ToolProvider
  label: string
  description: string
  access: ToolAccess
  mode: PermissionMode
  overrideMode: PermissionMode | null
}

type PermissionUpdateError = {
  tool: string
  message: string
}

export type ToolPermissionController = {
  permissions: ToolPermission[] | null | undefined
  pendingTool: string | undefined
  error: PermissionUpdateError | undefined
  getProviderPermissions: (provider: ToolProvider) => ToolPermission[]
  updatePermission: (tool: string, mode: ConfigurablePermissionMode) => void
}

export function useToolPermissions(tenantId: string): ToolPermissionController {
  const permissions = useQuery(api.permissions.tools.list, { tenantId }) as
    | ToolPermission[]
    | null
    | undefined
  const setPermission = useMutation(api.permissions.tools.set)
  const [pendingTool, setPendingTool] = useState<string>()
  const [error, setError] = useState<PermissionUpdateError>()

  async function updatePermission(
    tool: string,
    mode: ConfigurablePermissionMode
  ) {
    setPendingTool(tool)
    setError(undefined)

    try {
      await setPermission({ tenantId, tool, mode })
    } catch (updateError) {
      setError({
        tool,
        message: readErrorMessage(updateError, "Could not update permission."),
      })
    } finally {
      setPendingTool(undefined)
    }
  }

  function getProviderPermissions(provider: ToolProvider) {
    if (!Array.isArray(permissions)) {
      return []
    }

    return permissions.filter((permission) => permission.provider === provider)
  }

  return {
    permissions,
    pendingTool,
    error,
    getProviderPermissions,
    updatePermission,
  }
}
