import { useAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useEffect, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { api } from "../../../convex/_generated/api"

type ChannelOption = Extract<
  Awaited<FunctionReturnType<typeof api.automations.options.search>>,
  { status: "ready" }
>["options"][number]

export type SlackChannel = { channelId: string; channelName: string }

/** Slack channel picker, backed by the shared integration option search. */
export function SlackChannelField({
  disabled = false,
  onChange,
  tenantId,
  value,
}: {
  disabled?: boolean
  onChange: (channel: SlackChannel | undefined) => void
  tenantId: string
  value: SlackChannel | undefined
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { message, options, setQuery } = useChannelOptions(tenantId, isOpen)
  const selected =
    value === undefined
      ? null
      : { value: value.channelId, label: `#${value.channelName}` }

  return (
    <Combobox
      autoHighlight
      filter={null}
      isItemEqualToValue={(item, current) => item.value === current.value}
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
        onChange(
          option === null
            ? undefined
            : {
                channelId: option.value,
                channelName: option.label.replace(/^#/, ""),
              }
        )
        setQuery("")
      }}
      open={isOpen}
      value={selected}
    >
      <ComboboxInput
        aria-label="Slack channel"
        clearLabel="Clear channel"
        disabled={disabled}
        placeholder="Search channels…"
        showClear={value !== undefined}
      />
      <ComboboxContent>
        <ComboboxEmpty>{message ?? "No channels found."}</ComboboxEmpty>
        <ComboboxList>
          {options.map((option, index) => (
            <ComboboxItem index={index} key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function useChannelOptions(tenantId: string, isOpen: boolean) {
  const search = useAction(api.automations.options.search)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<ChannelOption[]>([])
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(() => {
      search({
        tenantId,
        integration: "slack",
        source: "slack.channels",
        query,
      })
        .then((result) => {
          if (cancelled) {
            return
          }

          setOptions(result.status === "ready" ? result.options : [])
          setMessage(result.status === "ready" ? undefined : result.message)
        })
        .catch(() => {
          if (!cancelled) {
            setMessage("Couldn't load channels.")
          }
        })
    }, 150)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [isOpen, query, search, tenantId])

  return { message, options, setQuery }
}
