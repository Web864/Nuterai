/**
 * React Query bindings for the admin API. All data flows through server
 * functions so the service-role key never reaches the browser.
 */

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminAuditLog,
  adminListAchievements,
  adminListReports,
  adminListSettings,
  adminListUsers,
  adminModeratePost,
  adminOverview,
  adminSetRole,
  adminSetUserVisibility,
  adminUpdateAchievement,
  adminUpdateSetting,
  adminUserDetail,
  adminWhoAmI,
} from "@/lib/admin.functions";

export const adminWhoAmIQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "whoami"],
    queryFn: () => adminWhoAmI(),
    staleTime: 60_000,
  });

export const adminOverviewQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverview(),
    staleTime: 30_000,
  });

export const adminUsersQueryOptions = (q: string, offset: number) =>
  queryOptions({
    queryKey: ["admin", "users", q, offset],
    queryFn: () => adminListUsers({ data: { q: q || undefined, limit: 25, offset } }),
    staleTime: 15_000,
  });

export const adminUserDetailQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminUserDetail({ data: { userId: userId as string } }),
    enabled: Boolean(userId),
  });

export const adminReportsQueryOptions = (status: "open" | "reviewed" | "dismissed" | "all") =>
  queryOptions({
    queryKey: ["admin", "reports", status],
    queryFn: () => adminListReports({ data: { status } }),
  });

export const adminAchievementsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "achievements"],
    queryFn: () => adminListAchievements(),
  });

export const adminSettingsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "settings"],
    queryFn: () => adminListSettings(),
  });

export const adminAuditQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "audit"],
    queryFn: () => adminAuditLog({ data: { limit: 100 } }),
  });

function useAdminMutation<TInput>(
  fn: (input: { data: TInput }) => Promise<unknown>,
  invalidate: string[][],
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => fn({ data: input }),
    onSuccess: () => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: key });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message || "Action failed"),
  });
}

export function useAdminSetRole() {
  const fn = useServerFn(adminSetRole);
  return useAdminMutation<{ userId: string; role: "admin" | "moderator" | "user"; grant: boolean }>(
    fn as never,
    [
      ["admin", "users"],
      ["admin", "user"],
      ["admin", "audit"],
    ],
    "Role updated",
  );
}

export function useAdminSetVisibility() {
  const fn = useServerFn(adminSetUserVisibility);
  return useAdminMutation<{ userId: string; isPublic: boolean }>(
    fn as never,
    [
      ["admin", "users"],
      ["admin", "user"],
      ["admin", "audit"],
    ],
    "Profile visibility updated",
  );
}

export function useAdminModeratePost() {
  const fn = useServerFn(adminModeratePost);
  return useAdminMutation<{
    postId: string;
    reportId?: string;
    action: "hide" | "unhide" | "delete" | "dismiss";
  }>(
    fn as never,
    [
      ["admin", "reports"],
      ["admin", "audit"],
      ["admin", "overview"],
    ],
    "Moderation applied",
  );
}

export function useAdminUpdateAchievement() {
  const fn = useServerFn(adminUpdateAchievement);
  return useAdminMutation<{
    code: string;
    title: string;
    description: string;
    xp_reward: number;
    target: number;
    is_secret: boolean;
  }>(
    fn as never,
    [
      ["admin", "achievements"],
      ["admin", "audit"],
    ],
    "Achievement saved",
  );
}

export function useAdminUpdateSetting() {
  const fn = useServerFn(adminUpdateSetting);
  return useAdminMutation<{ key: string; value: Record<string, unknown> }>(
    fn as never,
    [["admin", "settings"], ["admin", "audit"], ["app-settings"]],
    "Setting saved",
  );
}
