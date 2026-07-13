import {
  type DeliveryMode,
  type DeliveryOption,
} from "@contracts/playbooks/delivery"
import { ChevronDown, Hash, Mail, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SurfaceLogo } from "../../automations/access/logo"

export function DeliveryModeMenu({
  disabled,
  mode,
  onSelect,
  options,
}: {
  disabled: boolean
  mode: DeliveryMode
  onSelect: (mode: DeliveryMode) => void
  options: DeliveryOption[]
}) {
  if (options.length < 2) {
    return <DeliveryIcon mode={mode} />
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Delivery method"
          className="px-2"
          disabled={disabled}
          variant="outline"
        >
          <DeliveryIcon mode={mode} />
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {options.map((option) => (
          <DropdownMenuItem
            className="justify-between gap-4"
            disabled={!option.available}
            key={option.mode}
            onSelect={() => onSelect(option.mode)}
          >
            <span className="flex items-center gap-2">
              <ModeIcon mode={option.mode} />
              {modeLabel(option.mode)}
            </span>
            {option.reason === undefined ? null : (
              <span className="text-muted-foreground text-xs">
                {option.reason}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DeliveryIcon({ mode }: { mode: DeliveryMode }) {
  return mode === "email" ? (
    <Mail className="size-3.5 shrink-0 text-muted-foreground" />
  ) : (
    <SurfaceLogo alt="" integration="slack" />
  )
}

function ModeIcon({ mode }: { mode: DeliveryMode }) {
  if (mode === "email") {
    return <Mail />
  }

  return mode === "dm" ? <MessageCircle /> : <Hash />
}

function modeLabel(mode: DeliveryMode) {
  if (mode === "email") {
    return "Email"
  }

  return mode === "dm" ? "Slack DM" : "Slack channel"
}
