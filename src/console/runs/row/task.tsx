import { ClipboardList } from "lucide-react"
import {
  CodeBlockDetail,
  codeBlockContentClassName,
  DetailLink,
} from "../../shared/details"

export function TaskDetail({
  sourceUrl,
  task,
}: {
  sourceUrl?: string
  task: string
}) {
  if (sourceUrl !== undefined) {
    return (
      <CodeBlockDetail
        header={<DetailLink href={sourceUrl}>Source</DetailLink>}
        icon={ClipboardList}
        label="Task"
        value={task}
      />
    )
  }

  return (
    <CodeBlockDetail
      contentClassName={codeBlockContentClassName}
      icon={ClipboardList}
      label="Task"
      value={task}
    />
  )
}
