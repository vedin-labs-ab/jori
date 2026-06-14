import { MessageCircleMore } from "lucide-react"
import { CodeBlockDetail } from "./details"

export function TaskDetail({ task }: { task: string }) {
  return (
    <CodeBlockDetail
      contentClassName="max-h-96 overflow-y-auto"
      header="Task"
      icon={MessageCircleMore}
      label="Task"
      value={task}
    />
  )
}
