import { type Visibility } from "@contracts/visibility"

/** Explains participation and connections before the common visibility save. */
export function ChatVisibilityNotice({
  current,
  value,
}: {
  current: Visibility
  value: Visibility
}) {
  const isPrivate = value.mode === "private"
  const changesContext = JSON.stringify(current) !== JSON.stringify(value)

  return (
    <div className="grid gap-2 text-muted-foreground text-sm">
      <p>
        {isPrivate
          ? "Only you can use this chat. Jori uses your personal connections."
          : "Everyone with access can read the full history and activity, send messages, and manage this chat. Jori uses workspace connections."}
      </p>
      {changesContext ? (
        <p>
          Changing visibility stops any running work. Your next message starts a
          fresh session with the chat history and the selected access and
          connections.
        </p>
      ) : null}
    </div>
  )
}
