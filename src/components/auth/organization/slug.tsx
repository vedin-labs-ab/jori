"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useCheckSlug
} from "@better-auth-ui/react"
import { useDebouncedValue } from "@tanstack/react-pacer"
import { Check, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Spinner } from "@/components/ui/spinner"

export type SlugAvailability =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"

/** Normalize an organization slug while preserving in-progress edge dashes. */
export function sanitizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/** Debounced availability state shared by create and inline-edit flows. */
export function useSlugAvailability(
  value: string,
  currentSlug: string | undefined,
  enabled: boolean
): SlugAvailability {
  const { authClient } = useAuth()
  const normalizedValue = value.trim()
  const [debouncedValue] = useDebouncedValue(normalizedValue, { wait: 500 })
  const { mutateAsync: checkSlug } = useCheckSlug(
    authClient as OrganizationAuthClient
  )
  const [checked, setChecked] = useState<{
    available: boolean
    value: string
  }>()

  const shouldCheck =
    enabled && normalizedValue !== "" && normalizedValue !== currentSlug

  useEffect(() => {
    if (!shouldCheck || debouncedValue !== normalizedValue) {
      return
    }

    let active = true

    async function verify() {
      try {
        const result = await checkSlug({ slug: debouncedValue })
        if (active) {
          setChecked({ available: result.status, value: debouncedValue })
        }
      } catch {
        if (active) {
          setChecked({ available: false, value: debouncedValue })
        }
      }
    }

    void verify()
    return () => {
      active = false
    }
  }, [checkSlug, debouncedValue, normalizedValue, shouldCheck])

  if (!shouldCheck) {
    return "idle"
  }
  if (debouncedValue !== normalizedValue || checked?.value !== normalizedValue) {
    return "checking"
  }
  return checked.available ? "available" : "unavailable"
}

export function SlugAvailabilityIndicator({
  status
}: {
  status: SlugAvailability
}) {
  switch (status) {
    case "idle":
      return null
    case "checking":
      return <Spinner aria-label="Checking slug availability" />
    case "available":
      return <Check aria-label="Slug available" className="text-foreground" />
    case "unavailable":
      return <X aria-label="Slug unavailable" className="text-destructive" />
  }
}
