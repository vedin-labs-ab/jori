import {
  type DiscoveryKind,
  type MatchLocation,
} from "../../../contracts/discovery"
import { type Gate } from "../../visibility/sight"
export type Section = { text: string; location: MatchLocation }
export type Source = {
  organizationId: string
  sourceKey: string
  resourceKey: string
  authorityKey: string
  kind: DiscoveryKind
  resourceId: string
  title: string
  resourceName: string
  updatedAt: number
  gate: Gate
  sections: Section[]
  file?: {
    blobKey: string
    name: string
    mimeType: string
    size: number
  }
}
export type Projection = Source & { revision: string }
export const sourceTables = [
  "folders",
  "collections",
  "documents",
  "conversations",
  "messages",
  "jobs",
  "runs",
  "traces",
  "files",
] as const
export type SourceTable = (typeof sourceTables)[number]
