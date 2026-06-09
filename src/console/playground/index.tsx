import {
  Bell,
  CircleCheck,
  Plus,
  Search,
  Settings2,
  TriangleAlert,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ConsolePage } from "../page"

const buttonVariants = ["default", "secondary", "outline", "ghost"] as const

const componentRows = [
  {
    component: "Button",
    state: "Ready",
    use: "Primary commands and local actions",
  },
  {
    component: "Field",
    state: "Ready",
    use: "Labels, descriptions, and validation copy",
  },
  {
    component: "Tabs",
    state: "Ready",
    use: "Small mode switches inside a page",
  },
] as const

export function Playground() {
  return (
    <ConsolePage>
      {() => (
        <section className="grid gap-6">
          <PageHeader />
          <Tabs defaultValue="components" className="gap-4">
            <TabsList className="w-fit">
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="forms">Forms</TabsTrigger>
              <TabsTrigger value="states">States</TabsTrigger>
            </TabsList>
            <TabsContent
              value="components"
              className="grid gap-4 lg:grid-cols-2"
            >
              <ActionsCard />
              <SelectionCard />
              <ContentCard />
              <TableCard />
            </TabsContent>
            <TabsContent value="forms" className="grid gap-4 lg:grid-cols-2">
              <FormCard />
              <PreferencesCard />
            </TabsContent>
            <TabsContent value="states" className="grid gap-4 lg:grid-cols-2">
              <FeedbackCard />
              <LoadingCard />
            </TabsContent>
          </Tabs>
        </section>
      )}
    </ConsolePage>
  )
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid max-w-2xl gap-1">
        <h1 className="font-medium text-2xl tracking-normal">Playground</h1>
        <p className="text-sm text-muted-foreground">
          A tidy place to try the default UI components before they become
          product screens.
        </p>
      </div>
      <KbdGroup>
        <Kbd>Cmd</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </div>
  )
}

function ActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Buttons, icons, and command density.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant === "default" ? <Plus /> : null}
              {variant}
            </Button>
          ))}
          <Button variant="destructive">
            <TriangleAlert />
            destructive
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="icon" aria-label="Search">
            <Search />
          </Button>
          <Button size="icon" variant="outline" aria-label="Notifications">
            <Bell />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Settings">
            <Settings2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SelectionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selection</CardTitle>
        <CardDescription>Compact controls for local choices.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ToggleGroup defaultValue="preview" type="single" variant="outline">
          <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
          <ToggleGroupItem value="inspect">Inspect</ToggleGroupItem>
          <ToggleGroupItem value="ship">Ship</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Issue</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function ContentCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content</CardTitle>
        <CardDescription>Plain hierarchy for product copy.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1">
          <h2 className="font-medium text-base tracking-normal">
            Review component fit
          </h2>
          <p className="max-w-prose text-muted-foreground text-xs/relaxed">
            Keep patterns scannable and close to the default component behavior.
            Add styling only when the product job calls for it.
          </p>
        </div>
        <Separator />
        <div className="grid gap-2">
          <Progress value={64} />
          <p className="text-muted-foreground text-xs">64% review coverage</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TableCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data</CardTitle>
        <CardDescription>Rows should stay calm and readable.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Use</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {componentRows.map((row) => (
              <TableRow key={row.component}>
                <TableCell className="font-medium">{row.component}</TableCell>
                <TableCell>{row.state}</TableCell>
                <TableCell>{row.use}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function FormCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form</CardTitle>
        <CardDescription>Labels, inputs, and helper text.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="playground-name">Name</FieldLabel>
            <Input id="playground-name" placeholder="Design pass" />
            <FieldDescription>
              Short, specific names scan best.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="playground-type">Surface</FieldLabel>
            <Select defaultValue="console">
              <SelectTrigger id="playground-type">
                <SelectValue placeholder="Choose a surface" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="console">Console</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="playground-notes">Notes</FieldLabel>
            <Textarea
              id="playground-notes"
              placeholder="What should this component prove?"
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function PreferencesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Binary choices and grouped options.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldSet>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox id="playground-density" defaultChecked />
              <FieldContent>
                <FieldTitle>Compact density</FieldTitle>
                <FieldDescription>
                  Useful for console pages with repeated work.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <Switch id="playground-focus" defaultChecked />
              <Label htmlFor="playground-focus">Show focus states</Label>
            </Field>
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function FeedbackCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>Status copy and alert treatment.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Alert>
          <CircleCheck />
          <AlertTitle>Component set is available</AlertTitle>
          <AlertDescription>
            Use this page to compare defaults before adjusting product screens.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Spacing needs review</AlertTitle>
          <AlertDescription>
            Flag layout issues here before they spread into feature work.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading</CardTitle>
        <CardDescription>Skeletons for pending content.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
