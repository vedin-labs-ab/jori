import { MessageCircleQuestionMark } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const requestAddress = "hello@usejori.com"
const requestSubject = "Playbook request"

/** The catalog's open end: dashed, the way this system already marks
 *  something that is not there yet. Requests go to a person, not a form,
 *  because at this stage every request is a conversation we want. */
export function MorePlaybooks() {
  return (
    <Card className="flex flex-col border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestionMark className="size-4 text-muted-foreground" />
          More on the way
        </CardTitle>
        <CardDescription>
          The catalog grows one proven playbook at a time. Tell us what your
          team keeps doing by hand, and we'll tell you if Jori can take it over.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Button asChild variant="outline">
          <a
            href={`mailto:${requestAddress}?subject=${encodeURIComponent(requestSubject)}`}
          >
            Request a playbook
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
