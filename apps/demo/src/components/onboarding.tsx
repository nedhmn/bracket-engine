import { Button } from "@repo/design-system/components/button";
import { Code } from "@repo/design-system/components/code";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";

export const REPO_URL = "https://github.com/nedhmn/bracket-engine";

const STEPS = [
  "Pick a format and a player count. Player 1 is the top seed.",
  "Press Play round to fill in random winners, or click a player to pick the winner yourself.",
  "Open Data to see the engine call behind each click, the events it returned, and the tournament as JSON.",
];

export function Onboarding({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6">
        <DialogHeader>
          <DialogTitle className="font-code">tournament-engine demo</DialogTitle>
          <DialogDescription>
            Run a sample tournament and watch the engine handle it.
          </DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3.5">
          {STEPS.map((step, i) => (
            <li key={step} className="grid grid-cols-[1.5rem_1fr] gap-3 text-sm">
              <span className="flex size-6 items-center justify-center rounded-pill border font-code text-xs text-text-muted">
                {i + 1}
              </span>
              <span className="pt-0.5 text-text-primary">{step}</span>
            </li>
          ))}
        </ol>
        <DialogFooter className="items-center border-t pt-5 sm:justify-between">
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Code className="text-xs">npm i tournament-engine</Code>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-sm">
              GitHub
            </a>
          </div>
          <DialogClose asChild>
            <Button size="md" className="w-full sm:w-auto">
              Start
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
