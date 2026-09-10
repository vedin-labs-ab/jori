export type Step = {
  action:
    | "click"
    | "fill"
    | "press"
    | "hover"
    | "navigate"
    | "scroll"
    | "back"
    | "reload"
    | "doubleclick"
    | "contextclick"
    | "drag"
  selector?: string
  value?: string
  offset?: { x: number; y: number }
}

export type Scenario = {
  id: string
  title: string
  path: string
  target?: "app" | "fixture"
  mutating: boolean
  anonymous?: boolean
  setup?: Step[]
  steps?: Step[]
  blocked?: string
  responses?: { url: string; body: string; status?: number; delay?: number }[]
  widths?: number[]
}

export type Box = { x: number; y: number; width: number; height: number }
export type NodeSample = {
  uid: number
  selector: string
  text: string
  box: Box
  animation: string
}
export type Snapshot = {
  at: number
  nodes: NodeSample[]
  scroll: { selector: string; top: number; left: number }[]
}
export type Shift = {
  action: string
  at: number
  msAfterAction: number
  value: number
  hadRecentInput: boolean
  sources: { node: string; from: Box; to: Box }[]
}
export type Probe = {
  mark: (label: string) => void
  snapshot: () => Snapshot
  shifts: Shift[]
}

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Browser probe augments the DOM Window interface.
  interface Window {
    __mark: Probe["mark"]
    __layout: Probe
    __layoutRecord?: (entry: Shift) => Promise<void>
  }
}
