import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { type SettingsDialogView } from "./types"

type SettingsNavigationProps<Value extends string> = {
  label: string
  onViewChange: (view: Value) => void
  view: Value
  views: readonly SettingsDialogView<Value>[]
}

function SettingsSidebar<Value extends string>({
  label,
  onViewChange,
  view,
  views,
}: SettingsNavigationProps<Value>) {
  return (
    <Sidebar className="hidden h-full border-r md:flex" collapsible="none">
      <SidebarContent className={cn(scrollFade, "pt-2")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label={label}>
              {views.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    aria-current={view === item.value ? "page" : undefined}
                    isActive={view === item.value}
                    onClick={() => onViewChange(item.value)}
                    type="button"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function SettingsMobileNav<Value extends string>({
  label,
  onViewChange,
  view,
  views,
}: SettingsNavigationProps<Value>) {
  return (
    <Tabs
      className="shrink-0 p-2 md:hidden"
      onValueChange={(value) => onViewChange(value as Value)}
      value={view}
    >
      <TabsList aria-label={label} className="flex w-full">
        {views.map((item) => (
          <TabsTrigger className="flex-1" key={item.value} value={item.value}>
            <item.icon />
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { SettingsMobileNav, SettingsSidebar }
