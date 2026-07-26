import { createFileRoute } from "@tanstack/react-router"
import { SignOut } from "@/components/auth/sign-out"

export const Route = createFileRoute("/sign-out")({
  component: SignOut,
  head: () => ({ meta: [{ title: "Jori · Signing out" }] }),
})
