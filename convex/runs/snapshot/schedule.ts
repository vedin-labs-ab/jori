import { describeCron } from "../../../contracts/jobs/schedule/labels"

export function cronScheduleLabel(cron: string) {
  return describeCron(cron) ?? `${cron} UTC`
}
