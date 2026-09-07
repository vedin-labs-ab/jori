import {
  type ModelVendor,
  modelLabel,
  modelVendors,
  vendorModels,
} from "@contracts/models/catalog"
import {
  type ModelSelection,
  type ModelTier,
  selectionLabel,
  selectionTier,
  selectModel,
  tierLabels,
  tierOrder,
  tiers,
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
 * on its own at medium effort. The trigger reads as the tier, or as the
 * model when the choice is none of the three. Changing it any time is
 * fine; the next run is what takes it.
 */
export function ModelPicker({
  onSelect,
  selection,
}: {
  onSelect: (selection: ModelSelection) => void
  selection: ModelSelection
}) {
  const label = selectionLabel(selection)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          aria-label={`Model: ${label}`}
          className="gap-1 text-muted-foreground"
          size="sm"
          variant="ghost"
        >
          {label}
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recommendations</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(tier) => onSelect(tiers[tier as ModelTier])}
            value={selectionTier(selection) ?? ""}
          >
            {tierOrder.map((tier) => (
              <TierItem key={tier} tier={tier} />
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
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuRadioGroup
                  onValueChange={(model) =>
                    onSelect(selectModel(model as ModelSelection["model"]))
                  }
                  value={selection.model}
                >
                  {vendorModels(vendor).map((model) => (
                    <DropdownMenuRadioItem key={model.slug} value={model.slug}>
                      {model.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TierItem({ tier }: { tier: ModelTier }) {
  const Icon = tierIcons[tier]

  return (
    <DropdownMenuRadioItem value={tier}>
      <Icon aria-hidden="true" />
      {tierLabels[tier]}
      <span className="ml-auto text-muted-foreground">
        {modelLabel(tiers[tier].model)}
      </span>
    </DropdownMenuRadioItem>
  )
}
