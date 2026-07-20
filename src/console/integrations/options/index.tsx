import {
  type IntegrationOption,
  type IntegrationOptionMatch,
  type IntegrationOptionSource,
} from "@contracts/integrations/options"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { useIntegrationOptions } from "./query"

type IntegrationOptionPickerProps = {
  ariaLabel: string
  className?: string
  clearLabel: string
  disabled?: boolean
  emptyLabel: string
  id?: string
  match?: IntegrationOptionMatch
  onChange: (option: IntegrationOption | null) => void
  placeholder: string
  source: IntegrationOptionSource
  organizationId: string
  value: IntegrationOption | null
}

export function IntegrationOptionPicker({
  ariaLabel,
  className,
  clearLabel,
  disabled = false,
  emptyLabel,
  id,
  match,
  onChange,
  placeholder,
  source,
  organizationId,
  value,
}: IntegrationOptionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isLoading, message, options, setQuery } = useIntegrationOptions({
    disabled,
    isOpen,
    match,
    source,
    organizationId,
  })
  const selected =
    options.find((option) => option.value === value?.value) ?? value

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
        onChange(option)
        setQuery("")
      }}
      open={isOpen && !disabled}
      value={selected}
    >
      <ComboboxInput
        aria-label={ariaLabel}
        className={className}
        clearLabel={clearLabel}
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        showClear={!disabled && value !== null}
      />
      <PickerContent
        emptyLabel={emptyLabel}
        isLoading={isLoading}
        message={message}
        options={options}
      />
    </Combobox>
  )
}

function PickerContent({
  emptyLabel,
  isLoading,
  message,
  options,
}: {
  emptyLabel: string
  isLoading: boolean
  message: string | undefined
  options: IntegrationOption[]
}) {
  return (
    <ComboboxContent>
      {isLoading ? <PickerState loading>Loading options</PickerState> : null}
      {!isLoading && message !== undefined ? (
        <PickerState>{message}</PickerState>
      ) : null}
      {!isLoading && message === undefined ? (
        <>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxList>
            {options.map((option, index) => (
              <ComboboxItem
                className="items-start pr-7"
                index={index}
                key={option.value}
                value={option}
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate">{option.label}</span>
                  {option.description === undefined ? null : (
                    <span className="truncate text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </>
      ) : null}
    </ComboboxContent>
  )
}

function PickerState({
  children,
  loading = false,
}: {
  children: React.ReactNode
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {children}
    </div>
  )
}
