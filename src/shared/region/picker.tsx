import { isRegion, type Region } from "@contracts/region"
import { type ReactNode, useId } from "react"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"
import { regionConfig } from "./config"
import { regionSelectionUrl } from "./routing"

const regionOptions = [
  { flag: "🇺🇸", id: "us", label: "United States" },
  { flag: "🇪🇺", id: "eu", label: "European Union" },
] as const satisfies readonly {
  flag: string
  id: Region
  label: string
}[]

type RegionPickerProps = {
  labelAction?: ReactNode
  layout?: "compact" | "field"
  value?: Region
  onChange?: (region: Region) => void
  disabled?: boolean
}

export function RegionPicker({
  labelAction,
  layout = "compact",
  value = regionConfig.current,
  onChange,
  disabled,
}: RegionPickerProps) {
  const pickerId = useId()
  const isField = layout === "field"

  // Inline, the region reads from the option itself, so the label is for
  // screen readers only. As a field it needs the visible name.
  const label = (
    <label
      className={cn(isField ? "font-medium text-xs" : "sr-only")}
      htmlFor={pickerId}
    >
      Data region
    </label>
  )
  // A screen-reader-only label is absolutely positioned, so it takes no part
  // in flex layout. A wrapper around it does. Wrapping unconditionally put an
  // empty box before the select and the row's gap after it, which is why the
  // compact picker sat indented from the edge the rest of the footer aligns
  // to. The row exists only when it holds something visible.
  const hasVisibleLabelRow = isField || labelAction !== undefined

  return (
    <div
      className={cn(
        "flex text-sm",
        isField ? "flex-col gap-2" : "items-center gap-2"
      )}
    >
      {hasVisibleLabelRow ? (
        <div
          className={cn(
            "flex items-center",
            isField ? "justify-between gap-3" : "shrink-0 gap-2"
          )}
        >
          {label}
          {labelAction}
        </div>
      ) : (
        label
      )}
      <NativeSelect
        disabled={disabled}
        className={cn(isField && "w-full")}
        id={pickerId}
        onChange={(event) => {
          const region = event.currentTarget.value

          if (isRegion(region)) {
            selectRegion(region, onChange)
          }
        }}
        size={isField ? "default" : "sm"}
        value={value}
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

function selectRegion(region: Region, onChange: RegionPickerProps["onChange"]) {
  if (!regionConfig.enabled.has(region)) {
    return
  }
  if (onChange !== undefined) {
    onChange(region)
  } else if (region !== regionConfig.current) {
    window.location.assign(regionSelectionUrl(regionConfig, region))
  }
}
