import { Upload } from "lucide-react"
import { type DragEvent, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** Click-or-drop target for queueing files: the whole zone opens a multiple
 *  file picker, and dropped files land through the same callback. */
export function FileDropzone({
  disabled,
  onFiles,
}: {
  disabled: boolean
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragOver(false)

    if (!disabled) {
      onFiles(Array.from(event.dataTransfer.files))
    }
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false)
    }
  }

  return (
    <>
      <input
        aria-label="Add files"
        className="hidden"
        multiple
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ""
        }}
        ref={inputRef}
        type="file"
      />
      <button
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg border border-dashed px-6 py-8 outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50",
          isDragOver && "border-ring bg-muted/50"
        )}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        type="button"
      >
        <DropzoneHint />
      </button>
    </>
  )
}

function DropzoneHint() {
  return (
    <>
      <Upload aria-hidden className="size-5 text-muted-foreground" />
      <span className="font-medium text-sm">Click to upload or drop files</span>
      <span className="text-muted-foreground text-xs">Any file type</span>
    </>
  )
}
