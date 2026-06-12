import { type ReactAction, useAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
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
import { api } from "../../../convex/_generated/api"
import {
  type AutomationEventProvider,
  type AutomationEventResource,
} from "../../../convex/automations/events"

export function EventOptionField({
  tenantId,
  provider,
  resource,
  value,
  onValueChange,
}: {
  tenantId: string
  provider: AutomationEventProvider
  resource: Extract<AutomationEventResource, { type: "option" }>
  value: string
  onValueChange: (value: string) => void
}) {
  const search = useAction(api.automations.options.search)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<AutomationEventOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const selectedOption = options.find((option) => option.value === value)
  const valueLabel = selectedOption?.label ?? value

  useEffect(() => {
    if (!isOpen) {
      return
    }

    return searchEventOptions({
      provider,
      query,
      resource,
      search,
      setError,
      setIsLoading,
      setOptions,
      tenantId,
    })
  }, [isOpen, provider, query, resource, search, tenantId])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <EventOptionTrigger
        isOpen={isOpen}
        placeholder={resource.placeholder}
        value={value}
        valueLabel={valueLabel}
      />
      <EventOptionContent
        error={error}
        isLoading={isLoading}
        onQueryChange={setQuery}
        onValueChange={(nextValue) => {
          onValueChange(nextValue)
          setIsOpen(false)
          setQuery("")
        }}
        options={options}
        placeholder={resource.placeholder}
        query={query}
        value={value}
      />
    </Popover>
  )
}

type AutomationEventOption = FunctionReturnType<
  typeof api.automations.options.search
>[number]

type SearchAction = ReactAction<typeof api.automations.options.search>

function EventOptionTrigger({
  isOpen,
  placeholder,
  value,
  valueLabel,
}: {
  isOpen: boolean
  placeholder: string
  value: string
  valueLabel: string
}) {
  return (
    <PopoverTrigger asChild>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "h-8 w-full justify-between font-normal",
          value === "" && "text-muted-foreground"
        )}
        id="automation-event-resource"
        role="combobox"
        type="button"
        variant="outline"
      >
        <span className="min-w-0 truncate">
          {value === "" ? placeholder : valueLabel}
        </span>
        <ChevronsUpDown className="size-3.5 opacity-50" />
      </Button>
    </PopoverTrigger>
  )
}

function EventOptionContent({
  error,
  isLoading,
  onQueryChange,
  onValueChange,
  options,
  placeholder,
  query,
  value,
}: {
  error: string | undefined
  isLoading: boolean
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
            error={error}
            isLoading={isLoading}
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

function searchEventOptions({
  provider,
  query,
  resource,
  search,
  setError,
  setIsLoading,
  setOptions,
  tenantId,
}: {
  provider: AutomationEventProvider
  query: string
  resource: Extract<AutomationEventResource, { type: "option" }>
  search: SearchAction
  setError: (error: string | undefined) => void
  setIsLoading: (isLoading: boolean) => void
  setOptions: (options: AutomationEventOption[]) => void
  tenantId: string
}) {
  let isCancelled = false
  const timeout = window.setTimeout(() => {
    setIsLoading(true)
    setError(undefined)

    search({
      tenantId,
      provider,
      source: resource.source,
      query,
    })
      .then((result) => {
        if (!isCancelled) {
          setOptions(result)
        }
      })
      .catch((searchError: unknown) => {
        if (!isCancelled) {
          setOptions([])
          setError(
            searchError instanceof Error
              ? searchError.message
              : "Could not load options."
          )
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })
  }, 150)

  return () => {
    isCancelled = true
    window.clearTimeout(timeout)
  }
}

function EventOptionState({
  error,
  isLoading,
  options,
}: {
  error: string | undefined
  isLoading: boolean
  options: AutomationEventOption[]
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Loading
      </div>
    )
  }

  if (error !== undefined) {
    return <p className="px-3 py-2 text-destructive text-xs">{error}</p>
  }

  return options.length === 0 ? (
    <CommandEmpty>No results found.</CommandEmpty>
  ) : null
}
