# Chat organization and collaboration

[Docs index](index.md)

Chats use the same visibility and folder rules as other resources. Filing is
organization, not consent to share: a private chat stays private when moved into
a shared folder. Its runs and costs follow that folder.

Anyone with effective access can read the history and activity, send messages,
and manage the work. The existing owner rule controls visibility changes.
Sharing does not introduce chat-specific viewer or editor roles.

Private chats execute with their owner's personal context and connections.
Shared chats execute with workspace connections. Credential identity and
resource access are separate: shared work can use a resource only when every
member of its effective audience can access it. Generated resources inherit the
origin's owner, visibility and folder unless an explicit tool input overrides
the default.

Messages retain their author and enter one ordered conversation. Follow-ups
join its current run. Session reuse is tied to the effective audience; a change
ends stale work and discards cached execution context. Visible chat history
remains available under the new access setting. Personal sandbox state and
internal summaries do not become shared execution context.

Visibility field help explains these effects. Folder and team
membership changes still use the common visibility resolver. They do not create
a separate chat permission system.
