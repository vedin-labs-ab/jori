import { Check, X } from "lucide-react"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatFileSize } from "@/lib/size"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { fileKind } from "@/shared/files/kind"
import { type QueuedUpload, type UploadStatus } from "./queue"

/** Attachment states carrying the row's visual treatment: queued and
 *  finished rows stay quiet, active and failed rows stand out. */
const attachmentStates = {
  done: "done",
  error: "error",
  pending: "done",
  uploading: "uploading",
} satisfies Record<UploadStatus, "done" | "error" | "uploading">

/** The queued files as compact attachment rows, with a quiet Clear all once
 *  more than one file is waiting. */
export function UploadList({
  disabled,
  items,
  onClear,
  onRemove,
}: {
  disabled: boolean
  items: QueuedUpload[]
  onClear: () => void
  onRemove: (key: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid gap-1.5">
      {/* Long queues scroll in place so the dialog never outgrows the
          viewport; Clear all stays pinned below the scroll region. */}
      <div className={cn(scrollFade, "grid max-h-56 gap-1.5 overflow-y-auto")}>
        {items.map((item) => (
          <UploadRow
            disabled={disabled}
            item={item}
            key={item.key}
            onRemove={() => onRemove(item.key)}
          />
        ))}
      </div>
      {items.length > 1 ? (
        <Button
          className="justify-self-end text-muted-foreground"
          disabled={disabled}
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          Clear all
        </Button>
      ) : null}
    </div>
  )
}

function UploadRow({
  disabled,
  item,
  onRemove,
}: {
  disabled: boolean
  item: QueuedUpload
  onRemove: () => void
}) {
  return (
    <Attachment
      className="w-full"
      size="sm"
      state={attachmentStates[item.status]}
    >
      <AttachmentMedia>
        <RowIcon item={item} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{item.file.name}</AttachmentTitle>
        <AttachmentDescription>
          {item.status === "error"
            ? "Upload failed"
            : formatFileSize(item.file.size)}
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions className="mr-1.5">
        <AttachmentAction
          aria-label={`Remove ${item.file.name}`}
          disabled={disabled}
          onClick={onRemove}
          type="button"
        >
          <X />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  )
}

/** The registry kind icon, swapped for a spinner while the row uploads and
 *  a check once it lands. */
function RowIcon({ item }: { item: QueuedUpload }) {
  if (item.status === "uploading") {
    return <Spinner />
  }

  if (item.status === "done") {
    return <Check aria-hidden />
  }

  const kind = fileKind(item.file.type, item.file.name)

  return <kind.icon aria-hidden />
}
