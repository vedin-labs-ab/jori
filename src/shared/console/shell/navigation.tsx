import { Fragment, type ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { scrollFadeViewport } from "@/shared/fade"
import { type ChatConversation } from "../chat/types"
import { ChatsMenu } from "./chats"
import { CollapsibleGroup } from "./group"
import { ConsoleLink } from "./link"
import {
  type ConsoleSurface,
  consoleNavigation,
  consolePlatformNavigation,
  conversationDestination,
  conversationPathname,
  isNavigationActive,
} from "./routes"

/** The console's sidebar: the workspace navigation with the person's
 *  chats after its first group, the folder tree, and the platform group
 *  in the quiet bottom slot, between the organization at its head and
 *  the account in its footer. The three parts that know who is signed in
 *  arrive as slots; the chats arrive as rows, since the sidebar draws
 *  them the way it draws its own items. A labelled group closes from its
 *  label, for the room. */
export function ConsoleSidebar({
  account,
  chats,
  folders,
  organization,
  pathname,
}: {
  account: ReactNode
  /** The person's conversations, most recent first. */
  chats: ChatConversation[]
  folders: ReactNode
  organization: ReactNode
  pathname: string
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>{organization}</SidebarHeader>
      <SidebarContent>
        {consoleNavigation.map((group, index) => (
          <Fragment key={group.label ?? index}>
            {group.label === undefined ? (
              <SidebarGroup>
                <SidebarGroupContent>
                  <NavigationMenu items={group.items} pathname={pathname} />
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <CollapsibleGroup
                label={group.label}
                name={group.label.toLowerCase()}
              >
                <NavigationMenu items={group.items} pathname={pathname} />
              </CollapsibleGroup>
            )}
            {/* The chats follow the first group: under New chat and
                Activity, above the resources. */}
            {index === 0 ? (
              <ChatsGroup chats={chats} pathname={pathname} />
            ) : null}
          </Fragment>
        ))}
        {folders}
        {/* The quiet bottom slot: low-frequency setup and reference
            surfaces, above the user button, held in place by the folder
            tree taking whatever height is left. */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <NavigationMenu
              items={consolePlatformNavigation}
              pathname={pathname}
              size="sm"
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{account}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** The person's conversations, by title, in a box about three rows tall
 *  that scrolls, so the sidebar never grows with the number of chats.
 *  Nothing at all until there is a conversation to show. Titles need the
 *  open sidebar's width: the icon rail and a phone's sheet fold them into
 *  one Chats entry that opens the list. */
function ChatsGroup({
  chats,
  pathname,
}: {
  chats: ChatConversation[]
  pathname: string
}) {
  const { isMobile, state } = useSidebar()

  if (chats.length === 0) {
    return null
  }

  if (isMobile || state === "collapsed") {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <ChatsMenu
            chats={chats}
            pathname={pathname}
            side={isMobile ? "bottom" : "right"}
          />
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <CollapsibleGroup label="Chats" name="chats">
      <ChatsScroll clamp={chats.length > visibleChats}>
        <SidebarMenu>
          {chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                asChild
                isActive={pathname === conversationPathname(chat.id)}
                tooltip={chat.title}
              >
                <ConsoleLink {...conversationDestination(chat.id)}>
                  <span>{chat.title}</span>
                </ConsoleLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </ChatsScroll>
    </CollapsibleGroup>
  )
}

/** Three chats sit in the open; more than that scroll inside the same
 *  height. A scroll viewport only scrolls with a definite height, so the
 *  clamp is a height, not a maximum. */
const visibleChats = 3

function ChatsScroll({
  children,
  clamp,
}: {
  children: ReactNode
  clamp: boolean
}) {
  if (!clamp) {
    return children
  }

  return (
    <ScrollArea className={cn(scrollFadeViewport, "h-24")}>
      {children}
    </ScrollArea>
  )
}

function NavigationMenu({
  items,
  pathname,
  size = "default",
}: {
  items: readonly ConsoleSurface[]
  pathname: string
  size?: "default" | "sm"
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            isActive={isNavigationActive(pathname, item.to, item.exact)}
            size={size}
            tooltip={item.label}
          >
            <ConsoleLink to={item.to}>
              <item.icon />
              <span>{item.label}</span>
            </ConsoleLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
