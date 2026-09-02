import {
  type ConfigurablePermissionMode,
  type ToolSurface,
} from "@contracts/permissions"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { showErrorToast } from "@/shared/console/error"
import { type ToolPermission } from "@/shared/console/tools/model"
import { api } from "../../../convex/_generated/api"

export type ToolPermissionController = {
  permissions: ToolPermission[] | null | undefined
  pendingTool: string | undefined
  getSurfacePermissions: (surface: ToolSurface) => ToolPermission[]
  updatePermission: (tool: string, mode: ConfigurablePermissionMode) => void
}

export function useToolPermissions(
  organizationId: string
): ToolPermissionController {
  const permissions = useQuery(api.permissions.tools.list, {
    organizationId,
  }) as ToolPermission[] | null | undefined
  const setPermission = useMutation(api.permissions.tools.set)
  const [pendingTool, setPendingTool] = useState<string>()

  async function updatePermission(
    tool: string,
    mode: ConfigurablePermissionMode
  ) {
    setPendingTool(tool)

    try {
      await setPermission({ organizationId, tool, mode })
    } catch (updateError) {
      showErrorToast(updateError, "Couldn't update the permission.")
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
    getSurfacePermissions,
    updatePermission,
  }
}
