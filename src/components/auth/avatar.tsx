"use client"

import { Trash2, Upload } from "lucide-react"
import { type ReactNode, useRef } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Field, FieldTitle } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type AvatarFieldProps = {
  avatar: ReactNode
  changeLabel: string
  className?: string
  deleteDisabled?: boolean
  deleteLabel: string
  disabled?: boolean
  isPending?: boolean
  label: string
  onDelete: () => void | Promise<void>
  onFileChange: (file: File) => void | Promise<void>
  uploadLabel: string
}

/** Shared avatar editor used by user and organization profile settings. */
export function AvatarField({
  avatar,
  changeLabel,
  className,
  deleteDisabled = false,
  deleteLabel,
  disabled = false,
  isPending = false,
  label,
  onDelete,
  onFileChange,
  uploadLabel
}: AvatarFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function chooseFile() {
    fileInputRef.current?.click()
  }

  return (
    <Field className={className}>
      <FieldTitle>{label}</FieldTitle>

      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ""

          if (file) {
            void onFileChange(file)
          }
        }}
        type="file"
      />

      <div className="flex items-center gap-3">
        <Button
          aria-label={changeLabel}
          className="h-auto w-auto rounded-avatar p-0"
          disabled={disabled || isPending}
          onClick={chooseFile}
          type="button"
          variant="ghost"
        >
          {avatar}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            disabled={disabled || isPending}
          >
            {isPending ? <Spinner /> : null}
            {changeLabel}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-fit">
            <DropdownMenuItem onClick={chooseFile}>
              <Upload className="text-muted-foreground" />
              {uploadLabel}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={deleteDisabled}
              onClick={() => void onDelete()}
              variant="destructive"
            >
              <Trash2 />
              {deleteLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Field>
  )
}
