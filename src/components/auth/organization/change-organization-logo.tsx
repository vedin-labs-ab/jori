"use client"

import { fileToBase64 } from "@better-auth-ui/core"
import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useUpdateOrganization
} from "@better-auth-ui/react"
import { useState } from "react"
import { toast } from "sonner"

import { AvatarField } from "@/components/auth/avatar"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { OrganizationLogo } from "./organization-logo"

export type ChangeOrganizationLogoProps = {
  className?: string
}

export function ChangeOrganizationLogo({
  className
}: ChangeOrganizationLogoProps) {
  const { authClient } = useAuth()
  const { logo, localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  const { data: activeOrganization, isPending: activeOrganizationPending } =
    useActiveOrganization(authClient as OrganizationAuthClient)

  const { mutate: updateOrganization, isPending: updatePending } =
    useUpdateOrganization(authClient as OrganizationAuthClient)

  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isPending = updatePending || isUploading || isDeleting

  async function handleFileChange(file: File) {
    if (!activeOrganization) return

    setIsUploading(true)

    try {
      const resized =
        (await logo.resize?.(file, logo.size, logo.extension)) || file

      const image =
        (await logo.upload?.(resized)) || (await fileToBase64(resized))

      updateOrganization(
        { data: { logo: image } },
        {
          onSuccess: () =>
            toast.success(organizationLocalization.logoChangedSuccess),
          onSettled: () => setIsUploading(false)
        }
      )
    } catch (error) {
      setIsUploading(false)
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }
  }

  async function handleDelete() {
    const currentLogo = activeOrganization?.logo

    updateOrganization(
      { data: { logo: "" } },
      {
        onSuccess: async () => {
          if (!currentLogo) {
            toast.success(organizationLocalization.logoDeletedSuccess)
            return
          }

          setIsDeleting(true)
          try {
            await logo.delete?.(currentLogo)
            toast.success(organizationLocalization.logoDeletedSuccess)
          } catch (error) {
            if (error instanceof Error) {
              toast.error(error.message)
            }
          } finally {
            setIsDeleting(false)
          }
        }
      }
    )
  }

  if (!logo.enabled) {
    return null
  }

  return (
    <AvatarField
      avatar={
        <OrganizationLogo
          isPending={activeOrganizationPending}
          organization={activeOrganization}
          size="lg"
        />
      }
      changeLabel={organizationLocalization.changeLogo}
      className={className}
      deleteDisabled={!activeOrganization?.logo}
      deleteLabel={organizationLocalization.deleteLogo}
      disabled={!activeOrganization}
      isPending={isPending}
      label={organizationLocalization.logo}
      onDelete={handleDelete}
      onFileChange={handleFileChange}
      uploadLabel={organizationLocalization.uploadLogo}
    />
  )
}
