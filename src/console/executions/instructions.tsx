import { MessageCircleMore } from "lucide-react"
import { CodeBlockDetail, StatusDetail } from "./details"

export function InstructionsDetail({
  instructions,
}: {
  instructions: string | undefined
}) {
  if (instructions !== undefined && instructions.trim() !== "") {
    return (
      <CodeBlockDetail
        contentClassName="max-h-96 overflow-y-auto"
        icon={MessageCircleMore}
        label="Instructions"
        value={instructions}
      />
    )
  }

  return (
    <StatusDetail
      icon={MessageCircleMore}
      label="Instructions"
      value="No instructions recorded."
    />
  )
}
