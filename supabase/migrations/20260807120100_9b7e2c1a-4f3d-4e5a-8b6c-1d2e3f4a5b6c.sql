-- Fix: "Users manage own messages" (FOR ALL) let an authenticated client
-- INSERT a coach_messages row with any role, including 'assistant' or
-- 'system'. src/lib/ai-coach.functions.ts splices stored message history
-- verbatim into the outbound LLM prompt, so a forged 'system' row let a user
-- inject instructions that override the coach's guardrails for their own
-- account. Client inserts are now restricted to role = 'user'; the server
-- function writes assistant replies with the service-role client instead
-- (see ai-coach.functions.ts), which still bypasses RLS via the existing
-- `GRANT ALL ... TO service_role`. Messages are otherwise immutable — no
-- UPDATE policy is granted to authenticated clients.
DROP POLICY IF EXISTS "Users manage own messages" ON public.coach_messages;

CREATE POLICY "read own messages" ON public.coach_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "insert own user messages" ON public.coach_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'user');
CREATE POLICY "delete own messages" ON public.coach_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
