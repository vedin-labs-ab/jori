import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { readErrorMessage } from "../shared/error"
import {
  type ConfigurablePermissionMode,
  type ToolPermission,
  type ToolSurface,
} from "./types"

export type { ToolSurface }

type PermissionUpdateError = {
  tool: string
  message: string
}

export type ToolPermissionController = {
  permissions: ToolPermission[] | null | undefined
  pendingTool: string | undefined
  error: PermissionUpdateError | undefined
  getSurfacePermissions: (surface: ToolSurface) => ToolPermission[]
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

  function getSurfacePermissions(surface: ToolSurface) {
    if (!Array.isArray(permissions)) {
      return []
    }

    return permissions.filter((permission) => permission.surface === surface)
  }

  return {
    permissions,
    pendingTool,
    error,
    getSurfacePermissions,
    updatePermission,
  }
}
