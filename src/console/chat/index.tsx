import { Outlet } from "@tanstack/react-router"
import { ConsolePage } from "../page"

/** The chat's route component. The console around it is mounted once
 *  here, above the outlet, so the shell and its state outlive the move
 *  between the home and a conversation; the pages below compose
 *  `ConsolePage` as usual and find this one. */
export function ChatSection() {
  return <ConsolePage>{() => <Outlet />}</ConsolePage>
}
