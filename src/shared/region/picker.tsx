import { isRegion, type Region } from "@contracts/region"
import { type ReactNode, useId } from "react"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"
import { regionOptions } from "./catalog"
import { regionConfig } from "./config"
import { regionSelectionUrl } from "./routing"

type RegionPickerProps = {
  labelAction?: ReactNode
  layout?: "compact" | "field"
}

export function RegionPicker({
  labelAction,
  layout = "compact",
}: RegionPickerProps) {
  const pickerId = useId()
  const isField = layout === "field"

  function selectRegion(region: Region) {
    if (region === regionConfig.current || !regionConfig.enabled.has(region)) {
      return
    }

    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`

    window.location.assign(regionSelectionUrl(regionConfig, region, returnTo))
  }

  return (
    <div
      className={cn(
        "flex text-sm",
        isField ? "flex-col gap-2" : "items-center gap-2"
      )}
    >
      <div
        className={cn(
          "flex items-center",
          isField ? "justify-between gap-3" : "shrink-0 gap-2"
        )}
      >
        <label
          className={cn(
            isField ? "font-medium text-xs" : "text-muted-foreground"
          )}
          htmlFor={pickerId}
        >
          Data region
        </label>
        {labelAction}
      </div>
      <NativeSelect
        className={cn(isField && "w-full")}
        id={pickerId}
        onChange={(event) => {
          const region = event.currentTarget.value

          if (isRegion(region)) {
            selectRegion(region)
          }
        }}
        size={isField ? "default" : "sm"}
        value={regionConfig.current}
      >
        {regionOptions.map((option) => {
          const enabled = regionConfig.enabled.has(option.id)
          const label = `${option.flag} ${option.label}`

          return (
            <NativeSelectOption
              disabled={!enabled}
              key={option.id}
              value={option.id}
            >
              {enabled ? label : `${label} (Coming soon)`}
            </NativeSelectOption>
          )
        })}
      </NativeSelect>
    </div>
  )
}
