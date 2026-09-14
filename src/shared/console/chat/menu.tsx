import { MaterialFilingItems } from "../materials/actions"
import { materialOwner } from "../materials/owners"
import { TitleMenuContent } from "../menu"
import { MenuProvenance } from "../menu/provenance"

export function ChatTitleMenu({
  conversation,
  onAccess,
  onMoveToFolder,
  onUnfile,
}: {
  conversation: {
    ownerId?: string
    ownerName?: string
    ownerImage?: string
    updatedAt: number
  }
  onAccess: () => void
  onMoveToFolder: () => void
  onUnfile?: () => void
}) {
  return (
    <TitleMenuContent
      lead={
        <MenuProvenance
          owner={materialOwner(conversation)}
          updatedAt={conversation.updatedAt}
        />
      }
    >
      <MaterialFilingItems
        onAccess={onAccess}
        onMoveToFolder={onMoveToFolder}
        onUnfile={onUnfile}
      />
    </TitleMenuContent>
  )
}
