import {
  type AutomationEventIntegration,
  type AutomationEventParameter,
} from "@contracts/automations/events"
import { useAction } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"
import { api } from "../../../../../convex/_generated/api"
import { type AutomationEventOption, searchEventOptions } from "./search"

export function EventOptionField({
  tenantId,
  provider,
  parameter,
  criteria,
  disabled,
  disabledMessage,
  id,
  className,
  value,
  onValueChange,
}: {
  tenantId: string
  provider: AutomationEventIntegration
  parameter: Extract<AutomationEventParameter, { type: "option" }>
  criteria: Record<string, string>
  disabled: boolean
  disabledMessage: string | undefined
  id: string
  className?: string
  value: string
  onValueChange: (value: string) => void
}) {
  const search = useAction(api.automations.options.search)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<AutomationEventOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const selectedOption =
    options.find((option) => option.value === value) ??
    (value === "" ? null : { label: value, value })

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
    <Combobox
      autoHighlight
      filter={null}
      isItemEqualToValue={(item, selected) => item.value === selected.value}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      items={options}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          setQuery("")
        }
      }}
      onValueChange={(option) => {
        onValueChange(option?.value ?? "")
        setQuery("")
      }}
      open={isOpen && !disabled}
      value={selectedOption}
    >
      <EventOptionInput
        className={cn("w-full", className)}
        disabled={disabled}
        disabledMessage={disabledMessage}
        id={id}
        parameter={parameter}
        value={value}
      />
      <EventOptionContent isLoading={isLoading} message={message} />
    </Combobox>
  )
}

function EventOptionContent({
  isLoading,
  message,
}: {
  isLoading: boolean
  message: string | undefined
}) {
  return (
    <ComboboxContent>
      <EventOptionState isLoading={isLoading} message={message} />
      {message === undefined ? (
        <>
          {isLoading ? null : <ComboboxEmpty>No options found.</ComboboxEmpty>}
          <ComboboxList>
            {(option: AutomationEventOption, index: number) => (
              <EventOptionItem
                key={option.value}
                index={index}
                option={option}
              />
            )}
          </ComboboxList>
        </>
      ) : null}
    </ComboboxContent>
  )
}

function EventOptionInput({
  className,
  disabled,
  disabledMessage,
  id,
  parameter,
  value,
}: {
  className?: string
  disabled: boolean
  disabledMessage: string | undefined
  id: string
  parameter: Extract<AutomationEventParameter, { type: "option" }>
  value: string
}) {
  return (
    <ComboboxInput
      aria-label={parameter.label}
      className={className}
      clearLabel={`Clear ${parameter.label}`}
      disabled={disabled}
      id={id}
      placeholder={optionPlaceholder({ disabled, disabledMessage, parameter })}
      showClear={!disabled && value !== ""}
    />
  )
}

function optionPlaceholder({
  disabled,
  disabledMessage,
  parameter,
}: {
  disabled: boolean
  disabledMessage: string | undefined
  parameter: Extract<AutomationEventParameter, { type: "option" }>
}) {
  return disabled
    ? (disabledMessage ?? parameter.placeholder)
    : parameter.placeholder
}

function EventOptionItem({
  index,
  option,
}: {
  index: number
  option: AutomationEventOption
}) {
  return (
    <ComboboxItem className="items-start pr-7" index={index} value={option}>
      <div className="grid min-w-0 gap-0.5">
        <span className="truncate">{option.label}</span>
        {option.description === undefined ? null : (
          <span className="truncate text-muted-foreground">
            {option.description}
          </span>
        )}
      </div>
    </ComboboxItem>
  )
}

function EventOptionState({
  isLoading,
  message,
}: {
  isLoading: boolean
  message: string | undefined
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Loading options
      </div>
    )
  }

  return message === undefined ? null : (
    <p className="px-3 py-2 text-muted-foreground text-xs">{message}</p>
  )
}
