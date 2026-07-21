"use client"

import type { ComponentProps } from "react"

import { SectionGroup } from "@/components/ui/section"
import { OrganizationInvitations } from "./organization-invitations"
import { OrganizationMembers } from "./organization-members"

/** Props for the `OrganizationPeople` component. */
export type OrganizationPeopleProps = {
  className?: string
}

/**
 * Organization people UI: members table (see `OrganizationMembers`), then org
 * invitations.
 */
export function OrganizationPeople({
  className,
  ...props
}: OrganizationPeopleProps & ComponentProps<"div">) {
  return (
    <SectionGroup className={className} {...props}>
      <OrganizationMembers />
      <OrganizationInvitations />
    </SectionGroup>
  )
}
