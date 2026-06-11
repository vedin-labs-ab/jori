import { type Editor } from "@tiptap/react"
import { type MutableRefObject } from "react"
import {
  type ScheduleReadScope,
  type ScheduleSurfaceFormValue,
} from "../surfaces"
import { type ScheduleInstructionsValue } from "./document"
import { type InstructionSuggestionState } from "./suggest"

export type ScheduleInstructionsFieldProps = {
  id: string
  onBlur: () => void
  onValueChange: (value: ScheduleInstructionsValue) => void
  placeholder: string
  readScope: ScheduleReadScope
  surfaces: ScheduleSurfaceFormValue[]
  value: string
}

export type InstructionRefs = {
  editor: MutableRefObject<Editor | null>
  onBlur: MutableRefObject<ScheduleInstructionsFieldProps["onBlur"]>
  onValueChange: MutableRefObject<
    ScheduleInstructionsFieldProps["onValueChange"]
  >
  readScope: MutableRefObject<ScheduleReadScope>
  suggestion: MutableRefObject<InstructionSuggestionState | null>
}
