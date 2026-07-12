import { type DeliveryKind } from "@contracts/playbooks/delivery"
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
import { type DeliveryMode, deliveryModeCount } from "./model"

export function DeliveryModeMenu({
  disabled,
  kinds,
  mode,
  onSelect,
}: {
  disabled: boolean
  kinds: DeliveryKind[]
  mode: DeliveryMode
  onSelect: (mode: DeliveryMode) => void
}) {
  if (deliveryModeCount(kinds) < 2) {
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
      <DropdownMenuContent align="start">
        {kinds.includes("email") ? (
          <DropdownMenuItem onSelect={() => onSelect("email")}>
            <Mail /> Email
          </DropdownMenuItem>
        ) : null}
        {kinds.includes("slack") ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SurfaceLogo alt="" integration="slack" /> Slack
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => onSelect("channel")}>
                  <Hash /> Channel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onSelect("dm")}>
                  <MessageCircle /> DM
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ) : null}
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
