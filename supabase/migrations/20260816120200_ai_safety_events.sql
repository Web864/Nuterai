-- Phase 1: content-free logging for server-side AI health-safety triggers
-- (crisis-tier input short-circuit, medical-tier reinforcement, unsafe-output
-- substitution — see src/lib/health-safety.ts). Deliberately stores only the
-- category and endpoint, never message content, so admins get visibility
-- into trigger volume without a second copy of sensitive health text.

CREATE TABLE public.ai_safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('crisis_input', 'medical_input', 'unsafe_output')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_safety_events_created_at ON public.ai_safety_events (created_at DESC);

ALTER TABLE public.ai_safety_events ENABLE ROW LEVEL SECURITY;
-- No client-facing policies — same reasoning as ai_usage_events. Written by
-- the service role from inside the AI server functions; read by admins via a
-- future admin-panel addition (out of scope for this phase — see final report).
GRANT ALL ON public.ai_safety_events TO service_role;
