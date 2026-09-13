import { ChevronsUpDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// The grant pickers behind "Specific people" and "Specific teams": the
// house searchable Command menu, multi-select, listing the organization's
// members with avatars or its teams with sizes.

export type GrantOption = {
  id: string
  name: string
  image?: string
  hint?: string
}

/** Search scores only the option labels: item identity is an id, which
 *  must never match text the user types. */
function grantFilter(_value: string, search: string, keywords?: string[]) {
  const haystack = (keywords ?? []).join(" ").toLowerCase()

  return haystack.includes(search.trim().toLowerCase()) ? 1 : 0
}

export function GrantPicker({
  emptyLabel,
  label,
  onToggle,
  options,
  placeholder,
  selected,
}: {
  emptyLabel: string
  label: string
  onToggle: (id: string) => void
  options: GrantOption[] | undefined
  placeholder: string
  selected: readonly string[]
}) {
  const chosen = new Set(selected)
  const names = options
    ?.filter((option) => chosen.has(option.id))
    .map((option) => option.name)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={label}
          className="w-full justify-between font-normal"
          type="button"
          variant="outline"
        >
          <span className="truncate">
            {names === undefined || names.length === 0
              ? emptyLabel
              : names.join(", ")}
          </span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0" collisionPadding={8}>
        <Command
          className="max-h-(--radix-popover-content-available-height)"
          filter={grantFilter}
        >
          <CommandInput placeholder={placeholder} />
          <CommandList className="min-h-0">
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {(options ?? []).map((option) => (
                <CommandItem
                  data-checked={chosen.has(option.id)}
                  key={option.id}
                  keywords={[option.name]}
                  onSelect={() => onToggle(option.id)}
                  value={option.id}
                >
                  <Avatar className="size-5">
                    <AvatarImage alt="" src={option.image} />
                    <AvatarFallback className="text-[9px]">
                      {initials(option.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{option.name}</span>
                  {option.hint === undefined ? null : (
                    <span className="text-muted-foreground text-xs">
                      {option.hint}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}
