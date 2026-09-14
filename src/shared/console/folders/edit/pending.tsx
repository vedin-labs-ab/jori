import { PendingItemName } from "../../edit/pending"

export function PendingFolderName({ name }: { name: string }) {
  return <PendingItemName item={{ kind: "folder", name }} sidebar />
}
