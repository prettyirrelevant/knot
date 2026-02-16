import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const TICK_TIMEOUT = api.matches.tickTimeout;

export function useMatchClock(match: {
  _id: Id<"matches">;
  status: string;
  turnDeadlineAt: number;
  config: { turnTimeSec: number };
} | null) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [tickingTimeout, setTickingTimeout] = useState(false);
  const tickTimeout = useMutation(TICK_TIMEOUT);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!match || match.status !== "active") return;
    if (clockMs <= Number(match.turnDeadlineAt)) return;
    if (tickingTimeout) return;

    let cancelled = false;

    setTickingTimeout(true);
    void tickTimeout({ matchId: match._id })
      .catch(() => {
        if (!cancelled) {
          toast.error("Something went wrong with the timer.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTickingTimeout(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clockMs, match, tickTimeout, tickingTimeout]);

  const turnRemainingSec = match
    ? Math.max(0, Math.ceil((Number(match.turnDeadlineAt) - clockMs) / 1000))
    : 0;

  const timerRatio = match
    ? Math.max(
        0,
        Math.min(
          1,
          (Number(match.turnDeadlineAt) - clockMs) / (Number(match.config.turnTimeSec) * 1000),
        ),
      )
    : 0;

  return { clockMs, turnRemainingSec, timerRatio };
}
