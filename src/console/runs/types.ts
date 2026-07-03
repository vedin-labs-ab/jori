import { type FunctionReturnType } from "convex/server"
import { api } from "../../../convex/_generated/api"

export const pageSize = 25

export const runFilterOptions = [
  { label: "All", value: "all" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Failed", value: "failed" },
  { label: "Stopped", value: "stopped" },
  { label: "Completed", value: "completed" },
] as const

export const approvalFilterOptions = [
  { label: "Any", value: "any" },
  { label: "Needs approval", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "Expired", value: "expired" },
  { label: "Not required", value: "none" },
] as const

export const approvalFilterLabels = Object.fromEntries(
  approvalFilterOptions.map((option) => [option.value, option.label])
) as Record<ApprovalFilter, string>

export type RunFilter = (typeof runFilterOptions)[number]["value"]
export type ApprovalFilter = (typeof approvalFilterOptions)[number]["value"]

export type ExecutionItem = FunctionReturnType<
  typeof api.runs.console.page
>["page"][number]

export type ExecutionStatus = ExecutionItem["status"]
export type ExecutionSource = ExecutionItem["source"]
export type SourceDatum = NonNullable<ExecutionSource["kind"]>
export type ExecutionDetail = ExecutionItem["details"][number]
export type ExecutionDetailType = ExecutionDetail["type"]
export type ExecutionDetailTool = NonNullable<
  ExecutionDetail["groups"]
>[number]["tools"][number]
export type ExecutionApproval = ExecutionItem["approvals"][number]
export type ApprovalState = ExecutionApproval["state"]
export type ExecutionOffer = ExecutionItem["offers"][number]
export type OfferState = ExecutionOffer["state"]
