import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trackEvent, type TrackEvent, type TrackResult } from "./track";
import { STREAK_LABELS } from "@/lib/gamification";

/**
 * Hook that exposes a `track` function for gamified actions and surfaces
 * XP / level-up / achievement-unlock feedback via toasts.
 */
export function useGamification(userId: string | undefined) {
  const qc = useQueryClient();

  const track = useCallback(
    async (event: TrackEvent, opts?: { silent?: boolean }): Promise<TrackResult | null> => {
      if (!userId) return null;
      const result = await trackEvent(userId, event);

      if (!opts?.silent) {
        if (result.xp > 0) {
          toast.success(`+${result.xp} XP`, {
            description: result.award?.leveled_up
              ? `Level up! You're now level ${result.award.level}.`
              : undefined,
            duration: result.award?.leveled_up ? 6000 : 2500,
          });
        }
        if (result.streak && result.streak.isNewDay && result.streak.streak > 1) {
          toast(
            `🔥 ${result.streak.streak}-day ${STREAK_LABELS[result.streak.kind].toLowerCase()} streak`,
            {
              duration: 3500,
            },
          );
        }
        for (const a of result.unlocked) {
          toast.success(`🏆 Achievement unlocked — ${a.title}`, {
            description: `+${a.xp_reward} XP · ${a.difficulty}`,
            duration: 6000,
          });
        }
      }

      // Refresh everything the reward touched.
      qc.invalidateQueries({ queryKey: ["stats", userId] });
      qc.invalidateQueries({ queryKey: ["xp-history", userId] });
      if (result.unlocked.length) {
        qc.invalidateQueries({ queryKey: ["achievements", userId] });
      }
      if (result.streak) {
        qc.invalidateQueries({ queryKey: ["streak-history", userId] });
      }
      qc.invalidateQueries({ queryKey: ["activity-feed"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });

      return result;
    },
    [userId, qc],
  );

  return { track };
}

/**
 * Mounted once in the authenticated layout: records the daily check-in streak
 * and awards the daily login XP a single time per calendar day per device.
 */
export function useDailyCheckIn(userId: string | undefined) {
  const { track } = useGamification(userId);
  const done = useRef(false);

  useEffect(() => {
    if (!userId || done.current) return;
    const key = `nutriai:checkin:${userId}`;
    const today = new Date().toDateString();
    let last: string | null = null;
    try {
      last = window.localStorage.getItem(key);
    } catch {
      /* storage unavailable — fall through and let the RPC dedupe by date */
    }
    if (last === today) {
      done.current = true;
      return;
    }
    done.current = true;
    void track({ type: "daily_login" }, { silent: true }).then(() => {
      try {
        window.localStorage.setItem(key, today);
      } catch {
        /* ignore */
      }
    });
  }, [userId, track]);
}
