import { describeCron } from "../../../contracts/automations/schedule/labels"

export function cronScheduleLabel(cron: string) {
  return describeCron(cron) ?? `${cron} UTC`
}
