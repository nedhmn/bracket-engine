import { Badge } from "@repo/design-system/components/badge";
import type { Phase, Tournament } from "tournament-engine";

type Status = Phase["status"] | Tournament["status"];

const TONES: Record<Status, "neutral" | "accent" | "success"> = {
  pending: "neutral",
  underway: "accent",
  complete: "success",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge tone={TONES[status]} mono>
      {status}
    </Badge>
  );
}
