import { MessageCircleMore } from "lucide-react"
import { CodeBlockDetail } from "./details"

export function TaskDetail({ task }: { task: string }) {
  return (
    <CodeBlockDetail
      contentClassName="max-h-96 overflow-y-auto"
      icon={MessageCircleMore}
      label="Task"
      value={task}
    />
  )
}
