import { createFileRoute } from "@tanstack/react-router"
import { Bold, Italic, Underline } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const Route = createFileRoute("/")({ component: App })

const sectionClass = "flex flex-col gap-2"
const titleClass = "text-xs font-medium text-muted-foreground"
const rowClass = "flex flex-wrap items-center gap-3"

function App() {
  return (
    <div className="flex min-h-svh p-10">
      <div className="flex min-w-0 flex-col gap-8 text-sm">
        <div>
          <h1 className="font-medium">Tactile component review</h1>
          <p className="text-muted-foreground">
            Filled controls have a raised same-hue edge that collapses on press.
          </p>
        </div>

        <section className={sectionClass}>
          <h2 className={titleClass}>Button — variants</h2>
          <div className={rowClass}>
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Button — sizes (filled)</h2>
          <div className={rowClass}>
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Button — secondary sizes</h2>
          <div className={rowClass}>
            <Button variant="secondary" size="xs">
              Extra small
            </Button>
            <Button variant="secondary" size="sm">
              Small
            </Button>
            <Button variant="secondary" size="default">
              Default
            </Button>
            <Button variant="secondary" size="lg">
              Large
            </Button>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Button — disabled</h2>
          <div className={rowClass}>
            <Button disabled>Default</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Toggle</h2>
          <div className={rowClass}>
            <Toggle aria-label="Bold">
              <Bold />
            </Toggle>
            <Toggle aria-label="Italic" defaultPressed>
              <Italic />
            </Toggle>
            <Toggle variant="outline" aria-label="Underline">
              <Underline />
            </Toggle>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Toggle group</h2>
          <div className={rowClass}>
            <ToggleGroup type="multiple" defaultValue={["bold"]}>
              <ToggleGroupItem value="bold" aria-label="Bold">
                <Bold />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Italic />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <Underline />
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup type="single" variant="outline" defaultValue="italic">
              <ToggleGroupItem value="bold" aria-label="Bold">
                <Bold />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Italic />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <Underline />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Switch</h2>
          <div className={rowClass}>
            <Switch defaultChecked aria-label="Default on" />
            <Switch aria-label="Default off" />
            <Switch size="sm" defaultChecked aria-label="Small on" />
            <Switch size="sm" aria-label="Small off" />
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>Slider</h2>
          <div className={rowClass}>
            <Slider
              defaultValue={[40]}
              max={100}
              step={1}
              className="w-56"
              aria-label="Value"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
