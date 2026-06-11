import { ArrowLeftRight, Eye, PencilLine, Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  getScheduleSurfaceLabel,
  getScheduleSurfaceLogo,
  type ScheduleReadScope,
  type ScheduleSurfaceAccess,
  type ScheduleSurfaceFormValue,
  type ScheduleSurfaceProvider,
  scheduleSurfaceProviders,
} from "./surfaces"
import { type ScheduleFormValues } from "./types"

export function IntegrationAccessFields({
  onInsertSurface,
  onReadScopeChange,
  onRemoveSurface,
  onSurfaceAccessChange,
  values,
}: {
  onInsertSurface: (provider: ScheduleSurfaceProvider) => void
  onReadScopeChange: (readScope: ScheduleReadScope) => void
  onRemoveSurface: (provider: ScheduleSurfaceProvider) => void
  onSurfaceAccessChange: (
    provider: ScheduleSurfaceProvider,
    access: ScheduleSurfaceAccess
  ) => void
  values: ScheduleFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>Integration access</Label>
        <SurfacePicker onSelect={onInsertSurface} surfaces={values.surfaces} />
      </div>
      <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-2">
        <Checkbox
          checked={values.readScope === "allConnected"}
          id="schedule-all-reads"
          onCheckedChange={(checked) =>
            onReadScopeChange(checked === true ? "allConnected" : "selected")
          }
        />
        <div className="grid gap-0.5">
          <Label htmlFor="schedule-all-reads" className="font-normal text-xs">
            Allow reading from any connected integration
          </Label>
          <p className="text-muted-foreground text-xs">
            Writes still require a marker set to Write or Both.
          </p>
        </div>
      </div>
      {values.surfaces.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Mention integrations with @, then choose what Milo can read or write.
        </p>
      ) : (
        <div className="grid gap-2">
          {values.surfaces.map((surface) => (
            <SurfaceAccessRow
              key={surface.provider}
              onAccessChange={onSurfaceAccessChange}
              onRemove={onRemoveSurface}
              surface={surface}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SurfacePicker({
  onSelect,
  surfaces,
}: {
  onSelect: (provider: ScheduleSurfaceProvider) => void
  surfaces: ScheduleSurfaceFormValue[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedProviders = new Set(surfaces.map((surface) => surface.provider))

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <Plus />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <Command>
          <CommandInput placeholder="Find integration..." />
          <CommandList>
            <CommandEmpty>No integration found.</CommandEmpty>
            <CommandGroup>
              {scheduleSurfaceProviders.map((provider) => (
                <CommandItem
                  key={provider.provider}
                  disabled={selectedProviders.has(provider.provider)}
                  onSelect={() => {
                    onSelect(provider.provider)
                    setIsOpen(false)
                  }}
                  value={provider.label}
                >
                  <ProviderLogo provider={provider.provider} />
                  {provider.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function SurfaceAccessRow({
  onAccessChange,
  onRemove,
  surface,
}: {
  onAccessChange: (
    provider: ScheduleSurfaceProvider,
    access: ScheduleSurfaceAccess
  ) => void
  onRemove: (provider: ScheduleSurfaceProvider) => void
  surface: ScheduleSurfaceFormValue
}) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <ProviderLogo provider={surface.provider} />
        <span className="truncate font-medium text-sm">
          {getScheduleSurfaceLabel(surface.provider)}
        </span>
        {surface.access === "" ? (
          <span className="text-muted-foreground text-xs">Choose access</span>
        ) : null}
      </div>
      <AccessToggle
        access={surface.access}
        onAccessChange={(access) => onAccessChange(surface.provider, access)}
      />
      <Button
        aria-label={`Remove ${getScheduleSurfaceLabel(surface.provider)}`}
        className="justify-self-start sm:justify-self-end"
        onClick={() => onRemove(surface.provider)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}

function AccessToggle({
  access,
  onAccessChange,
}: {
  access: ScheduleSurfaceFormValue["access"]
  onAccessChange: (access: ScheduleSurfaceAccess) => void
}) {
  return (
    <ToggleGroup
      aria-label="Integration access"
      className="w-fit flex-wrap justify-start"
      onValueChange={(value) => {
        if (value !== "") {
          onAccessChange(value as ScheduleSurfaceAccess)
        }
      }}
      size="sm"
      spacing={0}
      type="single"
      value={access}
      variant="outline"
    >
      <ToggleGroupItem value="read">
        <Eye />
        Read
      </ToggleGroupItem>
      <ToggleGroupItem value="write">
        <PencilLine />
        Write
      </ToggleGroupItem>
      <ToggleGroupItem value="both">
        <ArrowLeftRight />
        Both
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function ProviderLogo({ provider }: { provider: ScheduleSurfaceProvider }) {
  return (
    <img
      alt=""
      className="size-3.5 shrink-0"
      src={getScheduleSurfaceLogo(provider)}
    />
  )
}
