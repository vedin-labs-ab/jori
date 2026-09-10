import {
  catalogModel,
  type ModelSlug,
  type ModelVendor,
  modelLabel,
  modelVendors,
  vendorModels,
} from "@contracts/models/catalog"
import {
  effortLabels,
  type ModelSelection,
  type ModelTier,
  type ReasoningEffort,
  reasoningEfforts,
  selectionLabel,
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
 * under its own submenu, and the reasoning effort under its own, so any
 * model runs at any effort. The trigger reads the tier behind its battery,
 * and only outside the three the model and its effort behind the vendor's
 * mark. Changing it any time is fine; the next run takes it.
 */
export function ModelPicker({
  availableModels,
  onSelect,
  selection,
}: {
  availableModels: readonly ModelSlug[] | undefined
  onSelect: (selection: ModelSelection) => void
  selection: ModelSelection
}) {
  const tier = selectionTier(selection)
  const Icon = tier === null ? null : tierIcons[tier]
  const choose = (next: ModelSelection) => {
    if (availableModels?.includes(next.model)) {
      onSelect(next)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          aria-label={`Model: ${modelLabel(selection.model)}, ${effortLabels[selection.effort]} reasoning`}
          className="min-w-28 gap-1.5 text-muted-foreground"
          disabled={
            availableModels === undefined || availableModels.length === 0
          }
          size="sm"
          variant="ghost"
        >
          {Icon === null ? (
            <VendorLogo vendor={catalogModel(selection.model).vendor} />
          ) : (
            <Icon aria-hidden="true" />
          )}
          {selectionLabel(selection)}
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recommendations</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => choose(tiers[next as ModelTier])}
            value={tier ?? ""}
          >
            {tierOrder
              .filter((candidate) =>
                availableModels?.includes(tiers[candidate].model)
              )
              .map((candidate) => (
                <TierItem key={candidate} tier={candidate} />
              ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>More models</DropdownMenuLabel>
          {vendorOrder
            .filter((vendor) =>
              vendorModels(vendor).some((model) =>
                availableModels?.includes(model.slug)
              )
            )
            .map((vendor) => (
              <DropdownMenuSub key={vendor}>
                <DropdownMenuSubTrigger>
                  <VendorLogo vendor={vendor} />
                  {modelVendors[vendor]}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <VendorModels
                    availableModels={availableModels ?? []}
                    onSelect={choose}
                    selection={selection}
                    vendor={vendor}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          {/* The level takes the row's free space so it sits against the
              chevron, which otherwise shares that space with it. */}
          <DropdownMenuSubTrigger className="[&>svg]:ml-0">
            Reasoning
            <span className="ml-auto w-16 text-right text-muted-foreground">
              {effortLabels[selection.effort]}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuRadioGroup
              onValueChange={(effort) =>
                choose(withEffort(selection, effort as ReasoningEffort))
              }
              value={selection.effort}
            >
              {reasoningEfforts.map((effort) => (
                <DropdownMenuRadioItem key={effort} value={effort}>
                  {effortLabels[effort]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
 *  any. Picking a model keeps the effort in force. */
function VendorModels({
  availableModels,
  onSelect,
  selection,
  vendor,
}: {
  availableModels: readonly ModelSlug[]
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
      {vendorModels(vendor)
        .filter((model) => availableModels.includes(model.slug))
        .map((model) => (
          <DropdownMenuRadioItem key={model.slug} value={model.slug}>
            {model.label}
            {model.slug === selection.model && tier !== null ? (
              <span className="ml-auto text-muted-foreground">
                {tierLabels[tier]}
              </span>
            ) : null}
          </DropdownMenuRadioItem>
        ))}
    </DropdownMenuRadioGroup>
  )
}
