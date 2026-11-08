import { Button } from "@repo/design-system/components/button";
import { CodeBlock } from "@repo/design-system/components/code";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { cn } from "@repo/design-system/lib/utils";
import { type ReactNode, useEffect, useState } from "react";

import { DatabaseIcon } from "./database-icon.tsx";

export const REPO_URL = "https://github.com/nedhmn/bracket-engine";

const INSTALL = "npm i tournament-engine";
const COPIED_MS = 1500;

type Step = {
  alt: string;
  image: string;
  text: ReactNode;
  title: string;
};

const STEPS: Step[] = [
  {
    alt: "The New tournament form with format rows, a player count and the Start tournament button highlighted.",
    image: "configure",
    text: "Choose a format and a player count, then press Start tournament.",
    title: "Pick a format",
  },
  {
    alt: "A Swiss round with a clickable player and the Play round and Play all buttons highlighted.",
    image: "swiss",
    text: "Click a player to pick the winner, or use Play round or Play all.",
    title: "Play the Swiss rounds",
  },
  {
    alt: "A finished match with its Edit button highlighted, next to the Edit dialog with a Clear result button.",
    image: "edit",
    text: "Press Edit on a finished match to change the winner or clear the result.",
    title: "Edit or clear a result",
  },
  {
    alt: "Finished Swiss rounds with the Create top 8 button highlighted and the cut line in the standings.",
    image: "bracket",
    text: "After the last Swiss round, Create top 8 starts a bracket seeded by Swiss rank.",
    title: "Create the top cut",
  },
  {
    alt: "The standings table with the Overall, Swiss and Top cut toggle highlighted.",
    image: "standings",
    text: "Switch between Overall, Swiss and Top cut to see each ranking.",
    title: "Read the standings",
  },
  {
    alt: "The page with the round Data button highlighted at the bottom right.",
    image: "data",
    text: (
      <>
        Open Data with{" "}
        <DatabaseIcon className="inline size-4 -translate-y-px align-middle text-accent" /> at the
        bottom right to see every engine call, the events it returned, and the full state.
      </>
    ),
    title: "Inspect the data",
  },
];

const imageUrl = (step: Step) => `${import.meta.env.BASE_URL}onboarding/${step.image}.webp`;

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const COPY_PATH =
  "M8 4h10a2 2 0 0 1 2 2v10M16 8H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Z";
const CHECK_PATH = "M20 6 9 17l-5-5";

function Install() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const id = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = () => {
    navigator.clipboard.writeText(INSTALL).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <div className="relative">
      <CodeBlock className="pr-12">{INSTALL}</CodeBlock>
      <Button
        variant="ghost"
        aria-label={copied ? "Copied" : "Copy install command"}
        title={copied ? "Copied" : "Copy"}
        className={cn(
          "absolute top-1/2 right-1.5 size-8 -translate-y-1/2 p-0",
          copied ? "text-success" : "text-text-muted",
        )}
        onClick={copy}
      >
        <Icon path={copied ? CHECK_PATH : COPY_PATH} />
      </Button>
    </div>
  );
}

function Walkthrough() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useEffect(() => {
    for (const s of STEPS) {
      new Image().src = imageUrl(s);
    }
  }, []);

  return (
    <>
      <DialogTitle className="pr-8 font-code text-sm text-text-muted">How it works</DialogTitle>
      <img
        src={imageUrl(step)}
        alt={step.alt}
        width={1280}
        height={800}
        className="aspect-[16/10] w-full rounded-md border bg-bg-elevated object-cover object-top"
      />
      <div className="grid gap-1.5">
        <h3 className="text-lg font-medium">{step.title}</h3>
        <DialogDescription className="min-h-[3lh] text-sm text-text-secondary sm:min-h-[1lh]">
          {step.text}
        </DialogDescription>
      </div>
      <Install />
      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span
                key={s.image}
                className={cn(
                  "size-1.5 rounded-pill",
                  i === index ? "bg-accent" : "bg-border-bright",
                )}
              />
            ))}
          </div>
          <span className="font-code text-xs text-text-muted">
            {index + 1} of {STEPS.length}
          </span>
        </div>
        <div className="flex gap-2">
          {index > 0 ? (
            <Button variant="ghost" size="md" onClick={() => setIndex(index - 1)}>
              Back
            </Button>
          ) : null}
          {last ? (
            <DialogClose asChild>
              <Button size="md">Start</Button>
            </DialogClose>
          ) : (
            <Button size="md" onClick={() => setIndex(index + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export function Onboarding({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px] gap-4 p-4 sm:max-w-[880px] sm:p-6">
        <Walkthrough />
      </DialogContent>
    </Dialog>
  );
}
