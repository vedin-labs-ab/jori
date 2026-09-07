import { MessagesSquare } from "lucide-react"
import { useState } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { scrollFade } from "@/shared/fade"
import { type ChatConversation } from "../chat/types"
import { useConsoleNavigate } from "./location"
import { conversationDestination, conversationPathname } from "./routes"

/** The chats where the sidebar has no room for their titles — the icon
 *  rail, and the sheet a phone opens — as one entry that opens them in a
 *  searchable list, the way the rail folds the folder tree into one
 *  entry. Choosing one goes there and closes the list. */
export function ChatsMenu({
  chats,
  pathname,
  side,
}: {
  chats: ChatConversation[]
  pathname: string
  /** Where the list opens: beside the rail, under the sheet's entry. */
  side: "right" | "bottom"
}) {
  const [open, setOpen] = useState(false)
  const navigate = useConsoleNavigate()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              isActive={chats.some(
                (chat) => pathname === conversationPathname(chat.id)
              )}
              tooltip="Chats"
            >
              <MessagesSquare />
              <span>Chats</span>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0" side={side}>
            <Command>
              <CommandInput placeholder="Search chats…" />
              <CommandList className={scrollFade}>
                <CommandEmpty>No chats match.</CommandEmpty>
                <CommandGroup>
                  {chats.map((chat) => (
                    <CommandItem
                      key={chat.id}
                      onSelect={() => {
                        setOpen(false)
                        navigate(conversationDestination(chat.id))
                      }}
                      value={`${chat.title} ${chat.id}`}
                    >
                      <span className="truncate">{chat.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
