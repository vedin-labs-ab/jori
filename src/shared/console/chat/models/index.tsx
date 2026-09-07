import {
  catalogModel,
  type ModelVendor,
  modelLabel,
  modelVendors,
  vendorModels,
} from "@contracts/models/catalog"
import {
  effortLabels,
  type ModelSelection,
  type ModelTier,
  reasoningEfforts,
  selectionTier,
  tierLabels,
  tierOrder,
  tiers,
  withEffort,
  withModel,
} from "@contracts/models/selection"
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  ChevronDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroupButton } from "@/components/ui/input-group"
import { Slider } from "@/components/ui/slider"
import { VendorLogo } from "@/shared/logo/vendor"

/** A battery low, half, or full: how much the tier spends on a turn. */
const tierIcons = {
  basic: BatteryLow,
  standard: BatteryMedium,
  premium: BatteryFull,
} as const

const vendorOrder: ModelVendor[] = ["openai", "anthropic"]

/**
 * What the chat runs on, chosen in the composer: the three recommended
 * tiers first, each a model at an effort, then every model of each vendor
 * under its own submenu, where the chosen model carries the slider that
 * sets its reasoning effort. The trigger reads the model and its effort
 * behind the tier's battery, or the vendor's mark when the choice is none
 * of the three. Changing it any time is fine; the next run takes it.
 */
export function ModelPicker({
  onSelect,
  selection,
}: {
  onSelect: (selection: ModelSelection) => void
  selection: ModelSelection
}) {
  const tier = selectionTier(selection)
  const Icon = tier === null ? null : tierIcons[tier]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          aria-label={`Model: ${modelLabel(selection.model)}, ${effortLabels[selection.effort]} reasoning`}
          className="gap-1.5 text-muted-foreground"
          size="sm"
          variant="ghost"
        >
          {Icon === null ? (
            <VendorLogo vendor={catalogModel(selection.model).vendor} />
          ) : (
            <Icon aria-hidden="true" />
          )}
          {modelLabel(selection.model)}
          <Badge variant="secondary">{effortLabels[selection.effort]}</Badge>
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recommendations</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => onSelect(tiers[next as ModelTier])}
            value={tier ?? ""}
          >
            {tierOrder.map((candidate) => (
              <TierItem key={candidate} tier={candidate} />
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>More models</DropdownMenuLabel>
          {vendorOrder.map((vendor) => (
            <DropdownMenuSub key={vendor}>
              <DropdownMenuSubTrigger>
                <VendorLogo vendor={vendor} />
                {modelVendors[vendor]}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                <VendorModels
                  onSelect={onSelect}
                  selection={selection}
                  vendor={vendor}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A tier: its battery, its name, and at the right the model and the
 *  effort it runs at, since the effort is half of what the tier is. */
function TierItem({ tier }: { tier: ModelTier }) {
  const Icon = tierIcons[tier]
  const { effort, model } = tiers[tier]

  return (
    <DropdownMenuRadioItem value={tier}>
      <Icon aria-hidden="true" />
      {tierLabels[tier]}
      <span className="ml-auto text-muted-foreground">
        {modelLabel(model)} · {effortLabels[effort]}
      </span>
    </DropdownMenuRadioItem>
  )
}

/** A vendor's models, the chosen one marked with the tier it makes, if
 *  any, and followed by the slider for its effort. Picking a model keeps
 *  the effort in force. */
function VendorModels({
  onSelect,
  selection,
  vendor,
}: {
  onSelect: (selection: ModelSelection) => void
  selection: ModelSelection
  vendor: ModelVendor
}) {
  const tier = selectionTier(selection)

  return (
    <DropdownMenuRadioGroup
      onValueChange={(model) =>
        onSelect(withModel(selection, model as ModelSelection["model"]))
      }
      value={selection.model}
    >
      {vendorModels(vendor).map((model) => {
        const chosen = model.slug === selection.model

        return (
          <div key={model.slug}>
            <DropdownMenuRadioItem value={model.slug}>
              {model.label}
              {chosen && tier !== null ? (
                <Badge className="ml-auto" variant="secondary">
                  {tierLabels[tier]}
                </Badge>
              ) : null}
            </DropdownMenuRadioItem>
            {chosen ? (
              <EffortSlider onSelect={onSelect} selection={selection} />
            ) : null}
          </div>
        )
      })}
    </DropdownMenuRadioGroup>
  )
}

/** The effort, lowest to highest, under the chosen model. The menu owns
 *  the arrow keys around it, so the slider keeps its own. */
function EffortSlider({
  onSelect,
  selection,
}: {
  onSelect: (selection: ModelSelection) => void
  selection: ModelSelection
}) {
  const index = reasoningEfforts.indexOf(selection.effort)

  return (
    <fieldset
      className="grid gap-1.5 px-2 pt-1 pb-2"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <legend className="sr-only">Reasoning effort</legend>
      <Slider
        max={reasoningEfforts.length - 1}
        min={0}
        onValueChange={([next]) => {
          const effort = reasoningEfforts[next ?? index]

          if (effort !== undefined && effort !== selection.effort) {
            onSelect(withEffort(selection, effort))
          }
        }}
        step={1}
        value={[index]}
      />
      <div className="flex justify-between text-muted-foreground text-xs">
        <span>{effortLabels[reasoningEfforts[0] ?? "low"]}</span>
        <span className="text-foreground">
          {effortLabels[selection.effort]}
        </span>
        <span>{effortLabels[reasoningEfforts.at(-1) ?? "max"]}</span>
      </div>
    </fieldset>
  )
}
