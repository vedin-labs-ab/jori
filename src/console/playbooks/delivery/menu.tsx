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
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
        <DeliveryOptions onSelect={onSelect} options={options} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DeliveryOptions({
  onSelect,
  options,
}: {
  onSelect: (mode: DeliveryMode) => void
  options: DeliveryOption[]
}) {
  const email = options.find((option) => option.mode === "email")
  const dm = options.find((option) => option.mode === "dm")
  const channel = options.find((option) => option.mode === "channel")

  return (
    <>
      {email === undefined ? null : (
        <DeliveryOptionItem label="Email" onSelect={onSelect} option={email} />
      )}
      {dm === undefined && channel === undefined ? null : (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SurfaceLogo alt="" integration="slack" />
            Slack
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="min-w-56">
              {dm === undefined ? null : (
                <DeliveryOptionItem
                  label="DM"
                  onSelect={onSelect}
                  option={dm}
                />
              )}
              {channel === undefined ? null : (
                <DeliveryOptionItem
                  label="Channel"
                  onSelect={onSelect}
                  option={channel}
                />
              )}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      )}
    </>
  )
}

function DeliveryOptionItem({
  label,
  onSelect,
  option,
}: {
  label: string
  onSelect: (mode: DeliveryMode) => void
  option: DeliveryOption
}) {
  return (
    <DropdownMenuItem
      className="justify-between gap-4"
      disabled={!option.available}
      onSelect={() => onSelect(option.mode)}
    >
      <span className="flex items-center gap-2">
        <ModeIcon mode={option.mode} />
        {label}
      </span>
      {option.reason === undefined ? null : (
        <span className="text-muted-foreground text-xs">{option.reason}</span>
      )}
    </DropdownMenuItem>
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
