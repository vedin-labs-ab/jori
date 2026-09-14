import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { readErrorMessage } from "../error"
import {
  type Edit,
  type EditItem,
  type EditKind,
  type EditSurface,
} from "./state"

export type EditPersistence = {
  name: (kind: EditKind, parentId?: string) => string
  onCreate: (kind: EditKind, parentId?: string) => Promise<EditItem>
  onRename: (item: EditItem, name: string) => Promise<unknown>
  onReveal?: (kind: EditKind, parentId?: string) => void
}
type Session = {
  latest: RefObject<EditPersistence>
  finish: RefObject<(() => Promise<boolean>) | undefined>
  busy: RefObject<boolean>
  alive: RefObject<boolean>
  setEdit: Dispatch<SetStateAction<Edit | undefined>>
}
export function useEditController(persistence: EditPersistence) {
  const [edit, setEdit] = useState<Edit>()
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
    save: (item: EditItem, name: string) => latest.current.onRename(item, name),
    begin: (item: EditItem, surface: EditSurface) => {
      void run(session, async () => {
        setEdit({ item, surface })
      })
    },
    create: (
      kind: EditKind,
      parentId: string | undefined,
      surface: EditSurface
    ) => {
      void run(session, () => create(session, kind, parentId, surface))
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
  kind: EditKind,
  parentId: string | undefined,
  surface: EditSurface
) {
  const { latest, setEdit, alive } = session
  const name = latest.current.name(kind, parentId)
  if (surface === "sidebar" && kind !== "folder") {
    latest.current.onReveal?.(kind, parentId)
    surface = "contents"
  }
  setEdit({
    item: { id: "pending", kind, parentId, name },
    surface,
    creating: true,
  })
  try {
    const item = await latest.current.onCreate(kind, parentId)
    if (alive.current) {
      setEdit({ item, surface, created: true })
    }
  } catch (error) {
    if (alive.current) {
      setEdit(undefined)
    }
    toast.error(readErrorMessage(error, `Could not create the ${kind}.`))
  }
}
