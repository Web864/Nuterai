import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowLeft,
  Check,
  Flag,
  Heart,
  MessageCircle,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  activityFeedQueryOptions,
  bucketFriendships,
  commentsQueryOptions,
  friendProfilesQueryOptions,
  friendshipsQueryOptions,
  otherUserId,
  postsFeedQueryOptions,
  searchUsersQueryOptions,
  useCreateComment,
  useCreatePost,
  useDeleteComment,
  useDeletePost,
  useRemoveFriend,
  useReportPost,
  useRespondToFriendRequest,
  useSendFriendRequest,
  useToggleLike,
  type PostWithAuthor,
} from "@/features/community/queries";
import { useGamification } from "@/features/gamification/useGamification";
import { initialsOf, relativeTime } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — NutriAI" },
      { name: "description", content: "Share progress, cheer on friends and see what your circle is achieving." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { userId } = AuthedRoute.useRouteContext();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl tracking-tight">Community</h1>
            <p className="text-sm text-muted-foreground">Share wins, follow friends, stay accountable.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="feed">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto rounded-full">
            <TabsTrigger value="feed" className="rounded-full">Feed</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-full">Activity</TabsTrigger>
            <TabsTrigger value="friends" className="rounded-full">Friends</TabsTrigger>
            <TabsTrigger value="discover" className="rounded-full">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="feed"><PostsTab userId={userId} /></TabsContent>
          <TabsContent value="activity"><ActivityTab /></TabsContent>
          <TabsContent value="friends"><FriendsTab userId={userId} /></TabsContent>
          <TabsContent value="discover"><DiscoverTab userId={userId} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------------------------- posts --------------------------------- */

function PostsTab({ userId }: { userId: string }) {
  const [scope, setScope] = useState<"all" | "friends" | "mine">("all");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("friends");
  const posts = useQuery(postsFeedQueryOptions(userId, scope));
  const create = useCreatePost(userId);
  const { track } = useGamification(userId);

  async function submit() {
    try {
      await create.mutateAsync({ content, visibility });
      setContent("");
      toast.success("Posted");
      void track({ type: "post_created" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish your post");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">Share an update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Crushed leg day, hit my protein target, down 2kg this month…"
            className="min-h-24 rounded-2xl"
            maxLength={2000}
            aria-label="Post content"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger className="w-44 rounded-full" aria-label="Post visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends">Friends only</SelectItem>
                <SelectItem value="private">Only me</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{content.length}/2000</span>
              <Button
                className="rounded-full"
                onClick={submit}
                disabled={!content.trim() || create.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {create.isPending ? "Posting…" : "Post"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(["all", "friends", "mine"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={scope === s ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => setScope(s)}
          >
            {s === "mine" ? "My posts" : s}
          </Button>
        ))}
      </div>

      {posts.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      ) : posts.isError ? (
        <ErrorState message="We couldn't load the feed." onRetry={() => posts.refetch()} />
      ) : !posts.data?.length ? (
        <EmptyState
          icon={<MessageCircle className="h-6 w-6 text-accent" />}
          title="Nothing here yet"
          description="Be the first to share a win — your friends will see it in their feed."
        />
      ) : (
        <div className="space-y-4">
          {posts.data.map((p) => <PostCard key={p.id} post={p} userId={userId} />)}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, userId }: { post: PostWithAuthor; userId: string }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const like = useToggleLike(userId);
  const del = useDeletePost(userId);
  const report = useReportPost(userId);
  const comments = useQuery(commentsQueryOptions(showComments ? post.id : null));
  const createComment = useCreateComment(userId);
  const deleteComment = useDeleteComment();
  const { track } = useGamification(userId);
  const mine = post.user_id === userId;
  const name = post.author?.display_name ?? post.author?.full_name ?? "Athlete";

  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} alt="" />}
            <AvatarFallback>{initialsOf(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {post.author?.username ? (
                <Link
                  to="/u/$username"
                  params={{ username: post.author.username }}
                  className="font-medium text-foreground hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{name}</span>
              )}
              <span className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</span>
              <Badge variant="outline" className="rounded-full text-xs capitalize">{post.visibility}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>
            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                loading="lazy"
                className="mt-3 max-h-80 w-full rounded-2xl object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 border-t border-border/40 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            aria-pressed={post.liked_by_me}
            aria-label={post.liked_by_me ? "Remove like" : "Like post"}
            onClick={() => like.mutate({ postId: post.id, liked: post.liked_by_me })}
          >
            <Heart className={`mr-1.5 h-4 w-4 ${post.liked_by_me ? "fill-current text-destructive" : ""}`} />
            {post.like_count}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setShowComments((v) => !v)}>
            <MessageCircle className="mr-1.5 h-4 w-4" />
            {post.comment_count}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            {mine ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-destructive"
                onClick={() => del.mutate(post.id, { onSuccess: () => toast.success("Post deleted") })}
                aria-label="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                aria-label="Report post"
                onClick={() =>
                  report.mutate(
                    { postId: post.id, reason: "inappropriate" },
                    { onSuccess: () => toast.success("Reported. Thanks for flagging this.") },
                  )
                }
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showComments && (
          <div className="space-y-3 border-t border-border/40 pt-3">
            {comments.isLoading ? (
              <Skeleton className="h-12 rounded-xl" />
            ) : !comments.data?.length ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              comments.data.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-sm">
                  <Avatar className="h-7 w-7">
                    {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} alt="" />}
                    <AvatarFallback className="text-xs">
                      {initialsOf(c.author?.display_name ?? c.author?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {c.author?.display_name ?? c.author?.full_name ?? "Athlete"} · {relativeTime(c.created_at)}
                    </p>
                    <p className="text-foreground">{c.content}</p>
                  </div>
                  {c.user_id === userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      aria-label="Delete comment"
                      onClick={() => deleteComment.mutate({ id: c.id, postId: post.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
            <div className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                className="rounded-full"
                maxLength={1000}
                aria-label="New comment"
              />
              <Button
                size="sm"
                className="rounded-full"
                disabled={!comment.trim() || createComment.isPending}
                onClick={async () => {
                  try {
                    await createComment.mutateAsync({ postId: post.id, content: comment });
                    setComment("");
                    void track({ type: "comment_created" }, { silent: true });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not comment");
                  }
                }}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- activity -------------------------------- */

function ActivityTab() {
  const [friendsOnly, setFriendsOnly] = useState(false);
  const feed = useQuery(activityFeedQueryOptions(friendsOnly));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={friendsOnly ? "outline" : "default"}
          className="rounded-full"
          onClick={() => setFriendsOnly(false)}
        >
          Everyone
        </Button>
        <Button
          size="sm"
          variant={friendsOnly ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setFriendsOnly(true)}
        >
          Friends only
        </Button>
      </div>

      {feed.isLoading ? (
        <Skeleton className="h-40 rounded-3xl" />
      ) : feed.isError ? (
        <ErrorState message="We couldn't load the activity feed." onRetry={() => feed.refetch()} />
      ) : !feed.data?.length ? (
        <EmptyState
          icon={<Activity className="h-6 w-6 text-accent" />}
          title="No activity yet"
          description="Log a meal or a workout and your milestones will show up here."
        />
      ) : (
        <Card className="rounded-3xl border-border/60">
          <CardContent className="divide-y divide-border/40 p-0">
            {feed.data.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <Avatar className="h-9 w-9">
                  {item.avatar_url && <AvatarImage src={item.avatar_url} alt="" />}
                  <AvatarFallback className="text-xs">{initialsOf(item.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.display_name ?? "Athlete"}</span> — {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {relativeTime(item.created_at)}
                    {item.xp_awarded > 0 ? ` · +${item.xp_awarded} XP` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full text-xs capitalize">
                  {String(item.kind).replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------- friends -------------------------------- */

function FriendsTab({ userId }: { userId: string }) {
  const friendships = useQuery(friendshipsQueryOptions(userId));
  const rows = friendships.data ?? [];
  const profiles = useQuery(friendProfilesQueryOptions(userId, rows));
  const buckets = useMemo(() => bucketFriendships(rows, userId), [rows, userId]);
  const respond = useRespondToFriendRequest(userId);
  const remove = useRemoveFriend(userId);
  const { track } = useGamification(userId);

  if (friendships.isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  if (friendships.isError) {
    return <ErrorState message="We couldn't load your friends." onRetry={() => friendships.refetch()} />;
  }

  const nameOf = (id: string) => {
    const p = profiles.data?.[id];
    return p?.display_name ?? p?.full_name ?? "Athlete";
  };

  return (
    <div className="space-y-6">
      <Section title={`Requests (${buckets.incoming.length})`}>
        {!buckets.incoming.length ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          buckets.incoming.map((f) => {
            const id = otherUserId(f, userId);
            return (
              <PersonRow key={f.id} name={nameOf(id)} avatar={profiles.data?.[id]?.avatar_url ?? null} username={profiles.data?.[id]?.username ?? null}>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={async () => {
                    await respond.mutateAsync({ id: f.id, status: "accepted" });
                    toast.success("Friend added");
                    void track({ type: "friend_added", friendCount: buckets.accepted.length + 1 });
                  }}
                >
                  <Check className="mr-1 h-4 w-4" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => respond.mutate({ id: f.id, status: "declined" })}
                >
                  <X className="mr-1 h-4 w-4" /> Decline
                </Button>
              </PersonRow>
            );
          })
        )}
      </Section>

      <Section title={`Friends (${buckets.accepted.length})`}>
        {!buckets.accepted.length ? (
          <p className="text-sm text-muted-foreground">
            No friends yet — head to Discover to find training partners.
          </p>
        ) : (
          buckets.accepted.map((f) => {
            const id = otherUserId(f, userId);
            return (
              <PersonRow key={f.id} name={nameOf(id)} avatar={profiles.data?.[id]?.avatar_url ?? null} username={profiles.data?.[id]?.username ?? null}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-destructive"
                  onClick={() => remove.mutate(f.id, { onSuccess: () => toast.success("Friend removed") })}
                >
                  Remove
                </Button>
              </PersonRow>
            );
          })
        )}
      </Section>

      {buckets.outgoing.length > 0 && (
        <Section title={`Sent (${buckets.outgoing.length})`}>
          {buckets.outgoing.map((f) => {
            const id = otherUserId(f, userId);
            return (
              <PersonRow key={f.id} name={nameOf(id)} avatar={profiles.data?.[id]?.avatar_url ?? null} username={profiles.data?.[id]?.username ?? null}>
                <Badge variant="outline" className="rounded-full">Pending</Badge>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => remove.mutate(f.id)}>
                  Cancel
                </Button>
              </PersonRow>
            );
          })}
        </Section>
      )}
    </div>
  );
}

/* -------------------------------- discover -------------------------------- */

function DiscoverTab({ userId }: { userId: string }) {
  const [q, setQ] = useState("");
  const results = useQuery(searchUsersQueryOptions(q));
  const send = useSendFriendRequest(userId);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or @handle…"
          className="rounded-full pl-11"
          aria-label="Search people"
        />
      </div>

      {q.trim().length < 2 ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-accent" />}
          title="Find your people"
          description="Type at least two characters to search public profiles."
        />
      ) : results.isLoading ? (
        <Skeleton className="h-28 rounded-3xl" />
      ) : results.isError ? (
        <ErrorState message="Search failed." onRetry={() => results.refetch()} />
      ) : !results.data?.length ? (
        <EmptyState
          icon={<Search className="h-6 w-6 text-accent" />}
          title="No matches"
          description="Nobody public matches that search yet."
        />
      ) : (
        <Section title={`${results.data.length} result${results.data.length === 1 ? "" : "s"}`}>
          {results.data.map((r) => (
            <PersonRow
              key={r.user_id}
              name={r.display_name ?? "Athlete"}
              avatar={r.avatar_url}
              username={r.username}
              meta={`Level ${r.level} · ${r.xp.toLocaleString()} XP`}
            >
              {r.friendship_status === "accepted" ? (
                <Badge variant="outline" className="rounded-full">Friends</Badge>
              ) : r.friendship_status === "pending" ? (
                <Badge variant="outline" className="rounded-full">
                  {r.is_requester ? "Requested" : "Awaiting you"}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={send.isPending}
                  onClick={() =>
                    send.mutate(r.user_id, {
                      onSuccess: () => toast.success("Request sent"),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send request"),
                    })
                  }
                >
                  <UserPlus className="mr-1 h-4 w-4" /> Add
                </Button>
              )}
            </PersonRow>
          ))}
        </Section>
      )}
    </div>
  );
}

/* --------------------------------- shared --------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function PersonRow({
  name,
  avatar,
  username,
  meta,
  children,
}: {
  name: string;
  avatar: string | null;
  username: string | null;
  meta?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/40 p-3">
      <Avatar className="h-10 w-10">
        {avatar && <AvatarImage src={avatar} alt="" />}
        <AvatarFallback>{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        {username ? (
          <Link to="/u/$username" params={{ username }} className="font-medium text-foreground hover:underline">
            {name}
          </Link>
        ) : (
          <p className="truncate font-medium text-foreground">{name}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">{meta ?? (username ? `@${username}` : "")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-3xl border-dashed border-border/70 bg-card/50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">{icon}</div>
      <h2 className="mt-4 font-display text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="rounded-3xl border-destructive/30 bg-destructive/5 p-6 text-center">
      <p className="text-sm text-foreground">{message}</p>
      <Button variant="outline" className="mt-4 rounded-full" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
