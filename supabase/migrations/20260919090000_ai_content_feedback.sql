CREATE TABLE public.ai_content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_message_id UUID NOT NULL REFERENCES public.coach_messages(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'report')),
  category TEXT CHECK (category IN ('unsafe_advice', 'incorrect_information', 'offensive_inappropriate', 'medical_concern', 'other')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_content_feedback_report_category_check CHECK (feedback_type <> 'report' OR category IS NOT NULL)
);

CREATE INDEX ai_content_feedback_user_created_idx ON public.ai_content_feedback (user_id, created_at DESC);
CREATE INDEX ai_content_feedback_message_idx ON public.ai_content_feedback (coach_message_id);
ALTER TABLE public.ai_content_feedback ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.ai_content_feedback TO authenticated;
GRANT ALL ON public.ai_content_feedback TO service_role;

CREATE POLICY "Users read own AI feedback" ON public.ai_content_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users submit feedback for own assistant messages" ON public.ai_content_feedback FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.coach_messages message
      WHERE message.id = coach_message_id AND message.user_id = auth.uid() AND message.role = 'assistant'
    )
  );