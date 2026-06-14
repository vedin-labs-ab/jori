import { MessageCircleMore } from "lucide-react"
import { CodeBlockDetail, codeBlockContentClassName } from "./details"

export function TaskDetail({ task }: { task: string }) {
  return (
    <CodeBlockDetail
      contentClassName={codeBlockContentClassName}
      icon={MessageCircleMore}
      label="Task"
      value={task}
    />
  )
}
