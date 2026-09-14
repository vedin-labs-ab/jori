import { type RefObject, useEffect, useRef, useState } from "react"
import { readErrorMessage, showErrorToast } from "../error"

export type NameInputProps = {
  scrollBlock?: ScrollLogicalPosition
  initialName: string
  onClose: (restoreFocus: boolean) => void
  onSave: (name: string) => Promise<unknown>
  register: (finish: (() => Promise<boolean>) | undefined) => void
}
type InputState = {
  name: string
  error?: string
  saving: boolean
}
type SaveSession = {
  latest: RefObject<NameInputProps & { name: string }>
  pending: Promise<boolean> | undefined
  finished: boolean
  mounted: boolean
  setState: (patch: Partial<InputState>) => void
}
export function useNameInput(props: NameInputProps) {
  const [state, setState] = useState<InputState>({
    name: props.initialName,
    saving: false,
  })
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef({ ...props, name: state.name })
  latest.current = { ...props, name: state.name }
  const [session] = useState<SaveSession>(() => ({
    latest,
    pending: undefined,
    finished: false,
    mounted: true,
    setState: (patch) => setState((current) => ({ ...current, ...patch })),
  }))
  const [commit] = useState(
    () =>
      (restoreFocus = false) =>
        commitName(session, restoreFocus)
  )
  useEffect(() => {
    session.mounted = true
    const frame = requestAnimationFrame(() => {
      input.current?.focus({ preventScroll: true })
      input.current?.select()
      input.current?.scrollIntoView?.({
        block: props.scrollBlock ?? "nearest",
        inline: "nearest",
        behavior: "instant",
      })
    })
    props.register(commit)
    return () => {
      session.mounted = false
      cancelAnimationFrame(frame)
      props.register(undefined)
    }
  }, [commit, props.register, props.scrollBlock, session])
  return {
    ...state,
    input,
    commit,
    change: (name: string) => session.setState({ name, error: undefined }),
    cancel: () => {
      if (session.pending !== undefined) {
        return
      }
      session.finished = true
      props.onClose(true)
    },
  }
}
function commitName(
  session: SaveSession,
  restoreFocus: boolean
): Promise<boolean> {
  if (session.finished) {
    return Promise.resolve(true)
  }
  if (session.pending !== undefined) {
    return session.pending
  }
  const { name, initialName, onClose } = session.latest.current
  const value = name.trim()
  if (!value) {
    session.setState({
      error: "Enter a name, or press Escape to keep the previous name.",
    })
    return Promise.resolve(false)
  }
  if (value === initialName) {
    session.finished = true
    onClose(restoreFocus)
    return Promise.resolve(true)
  }
  session.setState({ saving: true })
  session.pending = persistName(session, value, restoreFocus)
  return session.pending
}
async function persistName(
  session: SaveSession,
  value: string,
  restoreFocus: boolean
) {
  try {
    await session.latest.current.onSave(value)
    session.finished = true
    if (session.mounted) {
      session.latest.current.onClose(restoreFocus)
    }
    return true
  } catch (cause) {
    if (session.mounted) {
      session.setState({
        error: readErrorMessage(cause, "Could not save the name. Try again."),
      })
    } else {
      showErrorToast(cause, `Could not rename to "${value}".`)
    }
    return false
  } finally {
    session.pending = undefined
    if (session.mounted) {
      session.setState({ saving: false })
    }
  }
}
