-- Fix: "respond to friendship" allowed either party to flip a friendship's
-- status, so a requester could self-accept their own pending request and
-- gain friend-only visibility into the addressee's data without any action
-- by the addressee. Only the addressee may respond to a request; the
-- requester can still cancel it via the existing "remove friendship" DELETE
-- policy.
DROP POLICY IF EXISTS "respond to friendship" ON public.friendships;
CREATE POLICY "respond to friendship" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);
