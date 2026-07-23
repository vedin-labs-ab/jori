import { isRegion, type Region } from "@contracts/region"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { regionOptions } from "./catalog"
import { regionConfig } from "./config"
import { regionSelectionUrl } from "./routing"

export function RegionPicker() {
  function selectRegion(region: Region) {
    if (region === regionConfig.current || !regionConfig.enabled.has(region)) {
      return
    }

    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`

    window.location.assign(regionSelectionUrl(regionConfig, region, returnTo))
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Data region</span>
      <NativeSelect
        aria-label="Data region"
        onChange={(event) => {
          const region = event.currentTarget.value

          if (isRegion(region)) {
            selectRegion(region)
          }
        }}
        size="sm"
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
