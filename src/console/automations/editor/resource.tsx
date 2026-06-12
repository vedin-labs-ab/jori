import { useAction } from "convex/react"
import { ChevronsUpDown, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
import { cn } from "@/lib/utils"
import { api } from "../../../../convex/_generated/api"
import {
  type AutomationEventParameter,
  type AutomationEventProvider,
} from "../../../../convex/automations/events"
import { type AutomationEventOption, searchEventOptions } from "./search"

export function EventOptionField({
  tenantId,
  provider,
  parameter,
  criteria,
  disabled,
  disabledMessage,
  id,
  value,
  onValueChange,
}: {
  tenantId: string
  provider: AutomationEventProvider
  parameter: Extract<AutomationEventParameter, { type: "option" }>
  criteria: Record<string, string>
  disabled: boolean
  disabledMessage: string | undefined
  id: string
  value: string
  onValueChange: (value: string) => void
}) {
  const search = useAction(api.automations.options.search)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<AutomationEventOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const selectedOption = options.find((option) => option.value === value)
  const valueLabel = selectedOption?.label ?? value

  useEffect(() => {
    if (!isOpen || disabled) {
      return
    }

    return searchEventOptions({
      provider,
      query,
      parameter,
      criteria,
      search,
      setIsLoading,
      setMessage,
      setOptions,
      tenantId,
    })
  }, [isOpen, disabled, provider, query, parameter, criteria, search, tenantId])

  return (
    <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <EventOptionTrigger
        disabled={disabled}
        disabledMessage={disabledMessage}
        id={id}
        isOpen={isOpen}
        placeholder={parameter.placeholder}
        value={value}
        valueLabel={valueLabel}
      />
      <EventOptionContent
        isLoading={isLoading}
        message={message}
        onQueryChange={setQuery}
        onValueChange={(nextValue) => {
          onValueChange(nextValue)
          setIsOpen(false)
          setQuery("")
        }}
        options={options}
        placeholder={parameter.placeholder}
        query={query}
        value={value}
      />
    </Popover>
  )
}

function EventOptionTrigger({
  disabled,
  disabledMessage,
  id,
  isOpen,
  placeholder,
  value,
  valueLabel,
}: {
  disabled: boolean
  disabledMessage: string | undefined
  id: string
  isOpen: boolean
  placeholder: string
  value: string
  valueLabel: string
}) {
  const label = disabled ? (disabledMessage ?? placeholder) : placeholder

  return (
    <PopoverTrigger asChild>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "h-8 w-full justify-between font-normal",
          (value === "" || disabled) && "text-muted-foreground"
        )}
        disabled={disabled}
        id={id}
        role="combobox"
        type="button"
        variant="outline"
      >
        <span className="min-w-0 truncate">
          {value === "" || disabled ? label : valueLabel}
        </span>
        <ChevronsUpDown className="size-3.5 opacity-50" />
      </Button>
    </PopoverTrigger>
  )
}

function EventOptionContent({
  isLoading,
  message,
  onQueryChange,
  onValueChange,
  options,
  placeholder,
  query,
  value,
}: {
  isLoading: boolean
  message: string | undefined
  onQueryChange: (query: string) => void
  onValueChange: (value: string) => void
  options: AutomationEventOption[]
  placeholder: string
  query: string
  value: string
}) {
  return (
    <PopoverContent
      align="start"
      className="w-(--radix-popover-trigger-width) p-0"
    >
      <Command shouldFilter={false}>
        <CommandInput
          onValueChange={onQueryChange}
          placeholder={placeholder}
          value={query}
        />
        <CommandList>
          <EventOptionState
            isLoading={isLoading}
            message={message}
            options={options}
          />
          <CommandGroup>
            {options.map((option) => (
              <EventOptionItem
                key={option.value}
                onValueChange={onValueChange}
                option={option}
                value={value}
              />
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  )
}

function EventOptionItem({
  onValueChange,
  option,
  value,
}: {
  onValueChange: (value: string) => void
  option: AutomationEventOption
  value: string
}) {
  return (
    <CommandItem
      data-checked={option.value === value}
      onSelect={() => onValueChange(option.value)}
      value={option.value}
    >
      <div className="grid min-w-0 gap-0.5">
        <span className="truncate">{option.label}</span>
        {option.description === undefined ? null : (
          <span className="truncate text-muted-foreground">
            {option.description}
          </span>
        )}
      </div>
    </CommandItem>
  )
}

function EventOptionState({
  isLoading,
  message,
  options,
}: {
  isLoading: boolean
  message: string | undefined
  options: AutomationEventOption[]
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Loading options
      </div>
    )
  }

  if (message !== undefined) {
    return <p className="px-3 py-2 text-muted-foreground text-xs">{message}</p>
  }

  return options.length === 0 ? (
    <CommandEmpty>No options found.</CommandEmpty>
  ) : null
}
