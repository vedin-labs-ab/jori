import { OrganizationSwitcher } from "@clerk/tanstack-react-start"

export function SidebarOrganizationSwitcher() {
  return (
    <OrganizationSwitcher
      appearance={{
        elements: {
          rootBox: "!w-full",
          avatarBox: "!size-8",
          organizationPreview: "!gap-2",
          organizationPreviewAvatarBox: "!bg-transparent",
          organizationPreviewMainIdentifier: "!text-foreground",
          organizationSwitcherTrigger:
            "!h-12 !w-full !justify-between !rounded-[calc(var(--radius-sm)+2px)] !px-2 !text-xs transition-[width,height,padding] !duration-200 !ease-linear hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground focus-visible:!ring-2 focus-visible:!ring-sidebar-ring group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0",
          organizationSwitcherTriggerIcon:
            "group-data-[collapsible=icon]:!hidden",
        },
      }}
    />
  )
}
