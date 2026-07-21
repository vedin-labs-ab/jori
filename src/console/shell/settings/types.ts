import { type LucideIcon } from "lucide-react"

type SettingsDialogView<Value extends string> = {
  icon: LucideIcon
  label: string
  value: Value
}

export type { SettingsDialogView }
