import { MessageCircleMore } from "lucide-react"
import { CodeBlockDetail } from "./details"

export function TaskDetail({ task }: { task: string }) {
  return (
    <CodeBlockDetail
      framed
      icon={MessageCircleMore}
      label="Task"
      value={task}
    />
  )
}
