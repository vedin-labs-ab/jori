import { useId, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  groupToolsByAccess,
  type ToolAccessGroup,
  ToolGroupSection,
  ToolGroupsFrame,
  ToolRowContent,
} from "@/console/shared/tools"
import { cn } from "@/lib/utils"
import { type ToolPermission } from "../../../../permissions/types"
import {
  automationToolModeDescription,
  isAutomationToolSelectable,
} from "../../../access/policy"
import {
  ToolReferencesLoader,
  ToolSchemaButton,
  ToolSchemaDialog,
} from "./schema"
import { type ToolReferences, toolReferenceReady } from "./wire"

type AutomationSurfaceToolGroupsProps = {
  onToolsChange: (tools: string[]) => void
  permissions: ToolPermission[]
  tenantId: string
  tools: string[]
}

export function AutomationSurfaceToolGroups({
  onToolsChange,
  permissions,
  tenantId,
  tools,
}: AutomationSurfaceToolGroupsProps) {
  const selectedTools = new Set(tools)
  const [schemaPermission, setSchemaPermission] = useState<ToolPermission>()
  // Latched on the first sign of intent — pointer or focus reaching a
  // Schema button — so the subscription starts before any click and the
  // dialog usually opens with content already resolved. Nothing subscribes
  // for views the user never engages with.
  const [schemaIntent, setSchemaIntent] = useState(false)
  const [references, setReferences] = useState<ToolReferences>()

  function setTool(tool: string, enabled: boolean) {
    const nextTools = new Set(selectedTools)

    if (enabled) {
      nextTools.add(tool)
    } else {
      nextTools.delete(tool)
    }

    onToolsChange([...nextTools])
  }

  function setGroupTools(groupTools: ToolPermission[], enabled: boolean) {
    const nextTools = new Set(selectedTools)

    for (const permission of groupTools) {
      if (enabled && isAutomationToolSelectable(permission)) {
        nextTools.add(permission.tool)
        continue
      }

      if (!enabled) {
        nextTools.delete(permission.tool)
      }
    }

    onToolsChange([...nextTools])
  }

  return (
    <>
      <ToolGroupsFrame>
        {groupToolsByAccess(permissions).map((group) => (
          <EditableToolGroup
            group={group}
            key={group.access}
            onGroupChange={setGroupTools}
            onToolChange={setTool}
            onViewSchema={setSchemaPermission}
            onWarmSchemas={() => setSchemaIntent(true)}
            pendingSchemaTool={
              schemaPermission !== undefined &&
              !toolReferenceReady(references, schemaPermission.tool)
                ? schemaPermission.tool
                : undefined
            }
            selectedTools={selectedTools}
          />
        ))}
      </ToolGroupsFrame>
      {schemaIntent || schemaPermission !== undefined ? (
        <ToolReferencesLoader
          onChange={setReferences}
          tenantId={tenantId}
          tools={permissions.map((candidate) => candidate.tool)}
        />
      ) : null}
      <ToolSchemaDialog
        onOpenChange={(open) => {
          if (!open) {
            setSchemaPermission(undefined)
          }
        }}
        permission={schemaPermission}
        references={references}
      />
    </>
  )
}

function EditableToolGroup({
  group,
  onGroupChange,
  onToolChange,
  onViewSchema,
  onWarmSchemas,
  pendingSchemaTool,
  selectedTools,
}: {
  group: ToolAccessGroup<ToolPermission>
  onGroupChange: (tools: ToolPermission[], enabled: boolean) => void
  onToolChange: (tool: string, enabled: boolean) => void
  onViewSchema: (permission: ToolPermission) => void
  onWarmSchemas: () => void
  pendingSchemaTool: string | undefined
  selectedTools: Set<string>
}) {
  const selectableTools = group.tools.filter(isAutomationToolSelectable)
  const selectedCount = selectableTools.filter((permission) =>
    selectedTools.has(permission.tool)
  ).length
  const hasSelectableTools = selectableTools.length > 0
  const allSelectableSelected =
    hasSelectableTools && selectedCount === selectableTools.length

  return (
    <ToolGroupSection
      access={group.access}
      action={
        hasSelectableTools ? (
          <Button
            aria-label={`${allSelectableSelected ? "Clear" : "Select all"} ${group.access} tools`}
            onClick={() => onGroupChange(group.tools, !allSelectableSelected)}
            size="sm"
            type="button"
            variant="link"
          >
            {allSelectableSelected ? "Clear" : "Select all"}
          </Button>
        ) : null
      }
      badge={`${selectedCount} of ${selectableTools.length} selected`}
    >
      {group.tools.map((permission) => (
        <EditableToolRow
          key={permission.tool}
          onCheckedChange={(enabled) => onToolChange(permission.tool, enabled)}
          onViewSchema={() => onViewSchema(permission)}
          onWarmSchemas={onWarmSchemas}
          pendingSchema={pendingSchemaTool === permission.tool}
          permission={permission}
          selected={selectedTools.has(permission.tool)}
        />
      ))}
    </ToolGroupSection>
  )
}

function EditableToolRow({
  onCheckedChange,
  onViewSchema,
  onWarmSchemas,
  pendingSchema,
  permission,
  selected,
}: {
  onCheckedChange: (enabled: boolean) => void
  onViewSchema: () => void
  onWarmSchemas: () => void
  pendingSchema: boolean
  permission: ToolPermission
  selected: boolean
}) {
  const checkboxId = useId()
  const descriptionId = `${checkboxId}-description`
  const selectable = isAutomationToolSelectable(permission)
  const disabled = !selectable && !selected

  return (
    <div
      className={cn(
        "group/tool-row grid grid-cols-[auto_1fr_auto] gap-3 border-b p-3 last:border-b-0",
        disabled && "bg-muted/30"
      )}
    >
      <Checkbox
        aria-describedby={descriptionId}
        checked={selected}
        className="mt-0.5"
        disabled={disabled}
        id={checkboxId}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <ToolRowContent
        accessories={<ToolModeBadge permission={permission} />}
        description={getToolDescription(permission)}
        descriptionId={descriptionId}
        muted={disabled}
        title={
          <Label
            className={cn(
              "font-medium text-sm",
              disabled && "text-muted-foreground"
            )}
            htmlFor={checkboxId}
          >
            {permission.label}
          </Label>
        }
      />
      <div className="self-center">
        <ToolSchemaButton
          onClick={onViewSchema}
          onWarm={onWarmSchemas}
          pending={pendingSchema}
          toolLabel={permission.label}
        />
      </div>
    </div>
  )
}

function ToolModeBadge({ permission }: { permission: ToolPermission }) {
  if (permission.mode !== "blocked" && permission.mode !== "prompted") {
    return null
  }

  return (
    <Badge
      variant={permission.mode === "blocked" ? "destructive" : "secondary"}
    >
      {permission.mode === "prompted" ? "Approval required" : "Blocked"}
    </Badge>
  )
}

function getToolDescription(permission: ToolPermission) {
  if (permission.mode === "allowed" || permission.mode === "required") {
    return permission.description
  }

  return `${permission.description} ${automationToolModeDescription(permission)}`
}
