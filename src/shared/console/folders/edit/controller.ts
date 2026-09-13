import { availableFolderName } from "@contracts/folders/name"
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { readErrorMessage } from "../../error"
import { type FolderSummary } from "../tree"
import { type FolderEdit, type FolderSurface } from "./state"

export type FolderPersistence = {
  folders: readonly FolderSummary[]
  onCreate: (parentId?: string) => Promise<FolderSummary>
  onRename: (folderId: string, name: string) => Promise<unknown>
}
type Session = {
  latest: RefObject<FolderPersistence>
  finish: RefObject<(() => Promise<boolean>) | undefined>
  busy: RefObject<boolean>
  alive: RefObject<boolean>
  setEdit: Dispatch<SetStateAction<FolderEdit | undefined>>
}
export function useFolderController(persistence: FolderPersistence) {
  const [edit, setEdit] = useState<FolderEdit>()
  const latest = useRef(persistence)
  latest.current = persistence
  const finish = useRef<(() => Promise<boolean>) | undefined>(undefined)
  const busy = useRef(false)
  const alive = useRef(true)
  const [actions] = useState(() =>
    actionsFor({ latest, finish, busy, alive, setEdit })
  )
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return { ...actions, edit }
}
function actionsFor(session: Session) {
  const { finish, latest, setEdit } = session
  return {
    register: (handler: (() => Promise<boolean>) | undefined) => {
      finish.current = handler
    },
    claim: (target: string) =>
      setEdit((current) =>
        current && !current.target ? { ...current, target } : current
      ),
    close: () => setEdit(undefined),
    save: (folderId: string, name: string) =>
      latest.current.onRename(folderId, name),
    begin: (folder: FolderSummary, surface: FolderSurface) => {
      void run(session, async () => {
        setEdit({ folder, surface })
      })
    },
    create: (parentId: string | undefined, surface: FolderSurface) => {
      void run(session, () => create(session, parentId, surface))
    },
  }
}
async function run(session: Session, action: () => Promise<void>) {
  if (session.busy.current) {
    return
  }
  session.busy.current = true
  try {
    if (session.finish.current && !(await session.finish.current())) {
      return
    }
    if (session.alive.current) {
      await action()
    }
  } finally {
    session.busy.current = false
  }
}
async function create(
  session: Session,
  parentId: string | undefined,
  surface: FolderSurface
) {
  const { latest, setEdit, alive } = session
  const names = latest.current.folders
    .filter((f) => f.parentId === parentId)
    .map((f) => f.name)
  const name = availableFolderName(names)
  setEdit({
    folder: { folderId: "pending", parentId, name },
    surface,
    creating: true,
  })
  try {
    const folder = await latest.current.onCreate(parentId)
    if (alive.current) {
      setEdit({ folder, surface })
    }
  } catch (error) {
    if (alive.current) {
      setEdit(undefined)
    }
    toast.error(readErrorMessage(error, "Could not create the folder."))
  }
}
