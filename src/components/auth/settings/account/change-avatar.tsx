"use client"

import { fileToBase64 } from "@better-auth-ui/core"
import { useAuth, useSession, useUpdateUser } from "@better-auth-ui/react"
import { useState } from "react"
import { toast } from "sonner"
import { AvatarField } from "@/components/auth/avatar"
import { UserAvatar } from "@/components/auth/user/user-avatar"

export type ChangeAvatarProps = {
  className?: string
}

export function ChangeAvatar({ className }: ChangeAvatarProps) {
  const { authClient, localization, avatar } = useAuth()
  const { data: session, isPending: sessionPending } = useSession(authClient)

  const { mutate: updateUser, isPending: updatePending } =
    useUpdateUser(authClient)

  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isPending = updatePending || isUploading || isDeleting

  async function handleFileChange(file: File) {
    setIsUploading(true)

    try {
      const resized =
        (await avatar.resize?.(file, avatar.size, avatar.extension)) || file

      const image =
        (await avatar.upload?.(resized)) || (await fileToBase64(resized))

      updateUser(
        { image },
        {
          onSuccess: () =>
            toast.success(localization.settings.avatarChangedSuccess)
        }
      )
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    setIsUploading(false)
  }

  async function handleDelete() {
    const currentImage = session?.user.image

    updateUser(
      { image: null },
      {
        onSuccess: async () => {
          if (currentImage) {
            setIsDeleting(true)
            try {
              await avatar.delete?.(currentImage)
            } finally {
              setIsDeleting(false)
            }
          }

          toast.success(localization.settings.avatarDeletedSuccess)
        }
      }
    )
  }

  return (
    <AvatarField
      avatar={<UserAvatar className="size-12" isPending={sessionPending} />}
      changeLabel={localization.settings.changeAvatar}
      className={className}
      deleteDisabled={!session?.user.image}
      deleteLabel={localization.settings.deleteAvatar}
      disabled={!session}
      isPending={isPending}
      label={localization.settings.avatar}
      onDelete={handleDelete}
      onFileChange={handleFileChange}
      uploadLabel={localization.settings.uploadAvatar}
    />
  )
}
