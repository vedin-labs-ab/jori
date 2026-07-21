"use client"

import {
  useAuth,
  useAuthPlugin
} from "@better-auth-ui/react"
import { useState } from "react"

import { Field, FieldError } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import {
  sanitizeSlug,
  SlugAvailabilityIndicator,
  useSlugAvailability
} from "./slug"

/** Props for the `SlugField` component. */
export type SlugFieldProps = {
  value: string
  onChange: (value: string) => void
  currentSlug?: string
  disabled?: boolean
  id?: string
}

/**
 * Sanitize a slug value so it only contains lowercase alphanumeric characters
 * and dashes. Runs of disallowed characters are collapsed to a single dash, but
 * leading/trailing dashes are preserved while the user is still typing.
 */
export { sanitizeSlug } from "./slug"

/**
 * Organization slug field with debounced availability checking.
 */
export function SlugField({
  value,
  onChange,
  currentSlug,
  disabled,
  id = "slug"
}: SlugFieldProps) {
  const { localization: authLocalization } = useAuth()
  const {
    localization,
    checkSlug: checkSlugEnabled,
    slugPrefix
  } = useAuthPlugin(organizationPlugin)

  const [slugError, setSlugError] = useState<string>()

  const availability = useSlugAvailability(
    value,
    currentSlug,
    checkSlugEnabled
  )
  const unavailable = availability === "unavailable"
  const error =
    slugError ?? (unavailable ? "This slug is unavailable." : undefined)

  return (
    <Field data-invalid={!!error}>
      <Label htmlFor={id}>{localization.slug}</Label>

      <InputGroup>
        {slugPrefix && (
          <InputGroupAddon align="inline-start">{slugPrefix}</InputGroupAddon>
        )}

        <InputGroupInput
          id={id}
          name="slug"
          value={value}
          onChange={(e) => {
            onChange(sanitizeSlug(e.target.value))
            setSlugError(undefined)
          }}
          onInvalid={(e) => {
            e.preventDefault()
            setSlugError(authLocalization.auth.fieldRequired)
          }}
          aria-invalid={!!error}
          placeholder={localization.slugPlaceholder}
          required
          disabled={disabled}
        />

        {availability !== "idle" && (
          <InputGroupAddon align="inline-end">
            <SlugAvailabilityIndicator status={availability} />
          </InputGroupAddon>
        )}
      </InputGroup>

      <FieldError>{error}</FieldError>
    </Field>
  )
}
