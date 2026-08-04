import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Friendship = Tables<"friendships">;
export type Post = Tables<"posts">;
export type PostComment = Tables<"post_comments">;
export type ActivityEvent = Tables<"activity_events">;

export type PublicProfile = Pick<
  Tables<"profiles">,
  | "id"
  | "display_name"
  | "full_name"
  | "username"
  | "avatar_url"
  | "bio"
  | "city"
  | "country"
  | "is_public"
  | "show_stats"
  | "show_achievements"
  | "allow_friend_requests"
  | "created_at"
>;

const PROFILE_COLS =
  "id, display_name, full_name, username, avatar_url, bio, city, country, is_public, show_stats, show_achievements, allow_friend_requests, created_at";

export type PostWithAuthor = Post & {
  author: PublicProfile | null;
  liked_by_me: boolean;
};

export type SearchResult = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  friendship_status: string | null;
  is_requester: boolean;
};

export type FeedItem = {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  kind: ActivityEvent["kind"];
  title: string;
  description: string | null;
  metadata: unknown;
  xp_awarded: number;
  created_at: string;
};

/* -------------------------------- profiles -------------------------------- */

export const publicProfileByIdQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PublicProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const publicProfileByUsernameQueryOptions = (username: string) =>
  queryOptions({
    queryKey: ["public-profile-username", username.toLowerCase()],
    enabled: !!username,
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .ilike("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function useUpdatePublicProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"profiles">) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select(PROFILE_COLS)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["public-profile", userId] });
    },
  });
}

/** Checks whether a handle is free (case-insensitive). */
export async function isUsernameAvailable(username: string, selfId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .limit(1);
  if (error) throw error;
  return !data?.length || data[0]!.id === selfId;
}

/* ------------------------------- friendships ------------------------------ */

export const friendshipsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["friendships", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Friendship[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Profiles for every user the current user has any friendship row with. */
export const friendProfilesQueryOptions = (
  userId: string | undefined,
  friendships: Friendship[],
) => {
  const ids = friendships
    .map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id))
    .filter(Boolean);
  return queryOptions({
    queryKey: ["friend-profiles", userId, [...ids].sort().join(",")],
    enabled: !!userId,
    queryFn: async (): Promise<Record<string, PublicProfile>> => {
      if (!ids.length) return {};
      const { data, error } = await supabase.from("profiles").select(PROFILE_COLS).in("id", ids);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.id, p]));
    },
  });
};

export const searchUsersQueryOptions = (q: string) =>
  queryOptions({
    queryKey: ["search-users", q.trim().toLowerCase()],
    enabled: q.trim().length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase.rpc("search_users", { _q: q.trim(), _limit: 20 });
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
  });

export function useSendFriendRequest(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      if (addresseeId === userId) throw new Error("You cannot add yourself.");
      // Re-use an existing row in either direction rather than creating duplicates.
      const { data: existing, error: exErr } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`,
        )
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing) {
        if (existing.status === "accepted") throw new Error("You are already friends.");
        if (existing.requester_id === userId) {
          const { error } = await supabase
            .from("friendships")
            .update({ status: "pending" })
            .eq("id", existing.id);
          if (error) throw error;
          return existing.id;
        }
        // They already invited us — accept instead.
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      }

      const { data, error } = await supabase
        .from("friendships")
        .insert({ requester_id: userId, addressee_id: addresseeId, status: "pending" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships", userId] });
      qc.invalidateQueries({ queryKey: ["search-users"] });
    },
  });
}

export function useRespondToFriendRequest(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "accepted" | "declined" | "blocked";
    }) => {
      const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships", userId] });
      qc.invalidateQueries({ queryKey: ["activity-feed"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useRemoveFriend(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships", userId] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

/* ---------------------------------- posts --------------------------------- */

export const postsFeedQueryOptions = (
  userId: string | undefined,
  scope: "all" | "friends" | "mine",
) =>
  queryOptions({
    queryKey: ["posts", userId, scope],
    enabled: !!userId,
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!userId) return [];
      let q = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (scope === "mine") q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      const posts = data ?? [];
      if (!posts.length) return [];

      const authorIds = [...new Set(posts.map((p) => p.user_id))];
      const [authors, likes, friendRows] = await Promise.all([
        supabase.from("profiles").select(PROFILE_COLS).in("id", authorIds),
        supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in(
            "post_id",
            posts.map((p) => p.id),
          ),
        scope === "friends"
          ? supabase
              .from("friendships")
              .select("requester_id, addressee_id")
              .eq("status", "accepted")
          : Promise.resolve({ data: null, error: null } as const),
      ]);
      if (authors.error) throw authors.error;
      if (likes.error) throw likes.error;

      const byId = new Map((authors.data ?? []).map((a) => [a.id, a]));
      const likedSet = new Set((likes.data ?? []).map((l) => l.post_id));

      let filtered = posts;
      if (scope === "friends" && friendRows.data) {
        const friendIds = new Set(
          friendRows.data.map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id)),
        );
        filtered = posts.filter((p) => friendIds.has(p.user_id) || p.user_id === userId);
      }

      return filtered.map((p) => ({
        ...p,
        author: byId.get(p.user_id) ?? null,
        liked_by_me: likedSet.has(p.id),
      }));
    },
  });

export const userPostsQueryOptions = (targetUserId: string | undefined) =>
  queryOptions({
    queryKey: ["user-posts", targetUserId],
    enabled: !!targetUserId,
    queryFn: async (): Promise<Post[]> => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

export function useCreatePost(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      content: string;
      visibility: Post["visibility"];
      kind?: Post["kind"];
      image_url?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      const content = input.content.trim();
      if (content.length < 1) throw new Error("Write something first.");
      if (content.length > 2000) throw new Error("Posts are limited to 2000 characters.");
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content,
          visibility: input.visibility,
          kind: input.kind ?? "post",
          image_url: input.image_url ?? null,
          metadata: (input.metadata ?? {}) as never,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("user_stats")
        .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts", userId] });
      qc.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });
}

export function useUpdatePost(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"posts"> }) => {
      const { error } = await supabase.from("posts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts", userId] });
    },
  });
}

export function useDeletePost(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts", userId] });
    },
  });
}

export function useToggleLike(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: userId, reaction: "like" });
      if (error && error.code !== "23505") throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export const commentsQueryOptions = (postId: string | null) =>
  queryOptions({
    queryKey: ["comments", postId],
    enabled: !!postId,
    queryFn: async (): Promise<Array<PostComment & { author: PublicProfile | null }>> => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const { data: authors, error: aErr } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .in("id", ids);
      if (aErr) throw aErr;
      const byId = new Map((authors ?? []).map((a) => [a.id, a]));
      return rows.map((r) => ({ ...r, author: byId.get(r.user_id) ?? null }));
    },
  });

export function useCreateComment(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const body = content.trim();
      if (!body) throw new Error("Write a comment first.");
      if (body.length > 1000) throw new Error("Comments are limited to 1000 characters.");
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: userId, content: body });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; postId: string }) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useReportPost(userId: string) {
  return useMutation({
    mutationFn: async ({
      postId,
      reason,
      details,
    }: {
      postId: string;
      reason: string;
      details?: string;
    }) => {
      const { error } = await supabase
        .from("post_reports")
        .insert({ post_id: postId, reporter_id: userId, reason, details: details ?? null });
      if (error && error.code !== "23505") throw error;
    },
  });
}

/* -------------------------------- activity -------------------------------- */

export const activityFeedQueryOptions = (friendsOnly: boolean, limit = 50) =>
  queryOptions({
    queryKey: ["activity-feed", friendsOnly, limit],
    queryFn: async (): Promise<FeedItem[]> => {
      const { data, error } = await supabase.rpc("get_activity_feed", {
        _limit: limit,
        _friends_only: friendsOnly,
      });
      if (error) throw error;
      return (data ?? []) as FeedItem[];
    },
    staleTime: 30_000,
  });

export const userActivityQueryOptions = (targetUserId: string | undefined, limit = 20) =>
  queryOptions({
    queryKey: ["user-activity", targetUserId, limit],
    enabled: !!targetUserId,
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ------------------------------ derived views ----------------------------- */

export type FriendBuckets = {
  accepted: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  blocked: Friendship[];
};

export function bucketFriendships(rows: Friendship[], userId: string): FriendBuckets {
  return {
    accepted: rows.filter((r) => r.status === "accepted"),
    incoming: rows.filter((r) => r.status === "pending" && r.addressee_id === userId),
    outgoing: rows.filter((r) => r.status === "pending" && r.requester_id === userId),
    blocked: rows.filter((r) => r.status === "blocked"),
  };
}

export function otherUserId(f: Friendship, userId: string): string {
  return f.requester_id === userId ? f.addressee_id : f.requester_id;
}
