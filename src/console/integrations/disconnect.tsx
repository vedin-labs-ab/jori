import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function DisconnectDialog({
  isDisconnecting,
  onDisconnect,
  title,
}: {
  isDisconnecting: boolean
  onDisconnect: () => void
  title: string
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={isDisconnecting}>
          {isDisconnecting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Disconnecting
            </>
          ) : (
            "Disconnect"
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Milo will stop using this integration for new runs. You can connect
            it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDisconnect}>
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
