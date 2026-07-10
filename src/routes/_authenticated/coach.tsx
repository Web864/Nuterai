import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  Leaf,
} from "lucide-react";

import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  threadsQueryOptions,
  messagesQueryOptions,
  useCreateThread,
  useDeleteThread,
  type CoachThread,
} from "@/features/coach/queries";
import { sendCoachMessage } from "@/lib/ai-coach.functions";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachPage,
});

const SUGGESTED = [
  "What should I eat for dinner tonight?",
  "Am I hitting my protein target this week?",
  "Design a 20-min home workout for tomorrow",
  "I'm feeling low-energy — what should I adjust?",
];

function CoachPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const qc = useQueryClient();
  const threadsQ = useQuery(threadsQueryOptions(userId));
  const createThread = useCreateThread(userId);
  const deleteThread = useDeleteThread(userId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CoachThread | null>(null);

  // Auto-select first thread
  useEffect(() => {
    if (!activeId && threadsQ.data && threadsQ.data.length > 0) {
      setActiveId(threadsQ.data[0].id);
    }
  }, [threadsQ.data, activeId]);

  async function handleNewThread() {
    const t = await createThread.mutateAsync(undefined);
    setActiveId(t.id);
  }

  async function handleDelete(t: CoachThread) {
    await deleteThread.mutateAsync(t.id);
    if (activeId === t.id) setActiveId(null);
    setConfirmDelete(null);
    toast.success("Conversation deleted");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-foreground">
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-display text-lg">AI Coach</span>
          </div>
          <Button size="sm" className="rounded-full" onClick={handleNewThread} disabled={createThread.isPending}>
            {createThread.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">New chat</span>
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <Card className="rounded-3xl border-border/60 shadow-soft">
            <CardContent className="p-3">
              <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversations</p>
              <ScrollArea className="h-[calc(100vh-220px)] mt-2">
                <div className="space-y-1">
                  {threadsQ.data?.length === 0 && (
                    <p className="px-2 py-3 text-sm text-muted-foreground">No conversations yet.</p>
                  )}
                  {threadsQ.data?.map((t) => (
                    <div
                      key={t.id}
                      className={`group flex items-center gap-1 rounded-2xl px-2 py-2 text-sm transition-organic ${
                        activeId === t.id ? "bg-secondary text-foreground" : "hover:bg-secondary/50"
                      }`}
                    >
                      <button
                        onClick={() => setActiveId(t.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-medium">{t.title}</p>
                        {t.last_message_preview && (
                          <p className="truncate text-xs text-muted-foreground">{t.last_message_preview}</p>
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t)}
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1 hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* Main */}
        <section>
          {activeId ? (
            <ChatPanel threadId={activeId} userId={userId} onDeleted={() => setActiveId(null)} />
          ) : (
            <EmptyState onStart={handleNewThread} loading={createThread.isPending} />
          )}
        </section>
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove "{confirmDelete?.title}" and all its messages.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <Card className="rounded-3xl border-dashed border-border/70 bg-card/50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
        <Sparkles className="h-6 w-6 text-accent" />
      </div>
      <h2 className="mt-4 font-display text-2xl">Meet your AI coach</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Ask anything about your nutrition, workouts, or wellbeing. Your coach knows your profile, goals, and recent activity.
      </p>
      <Button size="lg" className="mt-6 rounded-full" onClick={onStart} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />}
        Start a conversation
      </Button>
    </Card>
  );
}

function ChatPanel({ threadId, userId, onDeleted }: { threadId: string; userId: string; onDeleted: () => void }) {
  const qc = useQueryClient();
  const messagesQ = useQuery(messagesQueryOptions(threadId));
  const send = useServerFn(sendCoachMessage);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messagesQ.data, sending]);

  const messages = messagesQ.data ?? [];
  const isEmpty = messages.length === 0;

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    // Optimistic append
    qc.setQueryData(["coach-messages", threadId], (old: unknown) => {
      const list = Array.isArray(old) ? old : [];
      return [
        ...list,
        {
          id: `tmp-${Date.now()}`,
          thread_id: threadId,
          user_id: userId,
          role: "user",
          content,
          created_at: new Date().toISOString(),
          model: null,
          tokens_in: null,
          tokens_out: null,
        },
      ];
    });
    try {
      await send({ data: { thread_id: threadId, message: content } });
      await qc.invalidateQueries({ queryKey: ["coach-messages", threadId] });
      await qc.invalidateQueries({ queryKey: ["coach-threads", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
      // rollback optimistic
      await qc.invalidateQueries({ queryKey: ["coach-messages", threadId] });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft flex flex-col h-[calc(100vh-160px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <h3 className="mt-3 font-display text-xl">How can I help today?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try one of these to get started:</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 max-w-2xl w-full">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-left text-sm transition-organic hover:border-accent/40 hover:bg-secondary/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Coach is thinking…
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach anything…"
            rows={1}
            className="min-h-[44px] max-h-40 resize-none rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            aria-label="Message"
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-2xl" disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-2 text-[10px] text-muted-foreground">
          AI can be inaccurate. Not medical advice.
        </p>
      </div>
    </Card>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:font-display dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
