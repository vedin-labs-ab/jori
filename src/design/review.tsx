import {
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { Bold, Italic, Underline } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BrandMark } from "@/shared/brand"

const rowClass = "flex flex-wrap items-center gap-3"

export function Review() {
  return (
    <div className="flex min-h-svh p-10">
      <div className="flex min-w-0 flex-col gap-8 text-sm">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <BrandMark />
            <div className="ml-auto flex items-center gap-2">
              <AuthLoading>
                <Button variant="outline" size="sm" disabled>
                  Loading
                </Button>
              </AuthLoading>
              <Unauthenticated>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm">
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Sign up</Button>
                </SignUpButton>
              </Unauthenticated>
              <Authenticated>
                <UserButton />
              </Authenticated>
            </div>
          </div>
          <h1 className="font-medium">Tactile component review</h1>
          <p className="text-muted-foreground">
            Filled controls have a raised same-hue edge that collapses on press.
          </p>
        </div>

        <ReviewSection title="Button — variants">
          <div className={rowClass}>
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </ReviewSection>

        <ReviewSection title="Button — sizes (filled)">
          <div className={rowClass}>
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </ReviewSection>

        <ReviewSection title="Button — secondary sizes">
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
        </ReviewSection>

        <ReviewSection title="Button — disabled">
          <div className={rowClass}>
            <Button disabled>Default</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
          </div>
        </ReviewSection>

        <ReviewSection title="Toggle">
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
        </ReviewSection>

        <ReviewSection title="Toggle group">
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
        </ReviewSection>

        <ReviewSection title="Switch">
          <div className={rowClass}>
            <Switch defaultChecked aria-label="Default on" />
            <Switch aria-label="Default off" />
            <Switch size="sm" defaultChecked aria-label="Small on" />
            <Switch size="sm" aria-label="Small off" />
          </div>
        </ReviewSection>

        <ReviewSection title="Slider">
          <div className={rowClass}>
            <Slider
              defaultValue={[40]}
              max={100}
              step={1}
              className="w-56"
              aria-label="Value"
            />
          </div>
        </ReviewSection>

        <ReviewSection title="Kbd — rank 9">
          <div className={rowClass}>
            <Kbd>⌘</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>Esc</Kbd>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <Button variant="outline" size="sm">
              Search
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>
          </div>
        </ReviewSection>

        <ReviewSection title="Select — rank 7">
          <div className={rowClass}>
            <Select defaultValue="apple">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="blueberry">Blueberry</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">Adjacent button</Button>
          </div>
        </ReviewSection>

        <ReviewSection title="Native select — rank 7">
          <div className={rowClass}>
            <NativeSelect defaultValue="apple">
              <NativeSelectOption value="apple">Apple</NativeSelectOption>
              <NativeSelectOption value="banana">Banana</NativeSelectOption>
              <NativeSelectOption value="blueberry">
                Blueberry
              </NativeSelectOption>
            </NativeSelect>
            <Button variant="outline">Adjacent button</Button>
          </div>
        </ReviewSection>

        <ReviewSection title="Tabs — rank 6">
          <div className={rowClass}>
            <Tabs defaultValue="account" className="w-60">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs defaultValue="account" className="w-60">
              <TabsList variant="line">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </ReviewSection>

        <ReviewSection title="Button group — rank 5">
          <div className={rowClass}>
            <ButtonGroup>
              <Button variant="outline">Day</Button>
              <Button variant="outline">Week</Button>
              <Button variant="outline">Month</Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button variant="outline" size="icon" aria-label="Bold">
                <Bold />
              </Button>
              <Button variant="outline" size="icon" aria-label="Italic">
                <Italic />
              </Button>
              <Button variant="outline" size="icon" aria-label="Underline">
                <Underline />
              </Button>
            </ButtonGroup>
          </div>
        </ReviewSection>
      </div>
    </div>
  )
}

function ReviewSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}
