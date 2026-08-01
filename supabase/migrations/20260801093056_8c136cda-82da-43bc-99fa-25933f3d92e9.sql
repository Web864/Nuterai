
-- ============ ENUMS ============
CREATE TYPE public.friendship_status AS ENUM ('pending','accepted','declined','blocked');
CREATE TYPE public.activity_kind AS ENUM ('workout','meal','weight','achievement','streak','personal_best','level_up','post');
CREATE TYPE public.achievement_category AS ENUM ('nutrition','workout','hydration','consistency','community','milestone');
CREATE TYPE public.achievement_difficulty AS ENUM ('bronze','silver','gold','platinum');
CREATE TYPE public.streak_kind AS ENUM ('workout','nutrition','water','login','coach','reminder');
CREATE TYPE public.post_visibility AS ENUM ('public','friends','private');
CREATE TYPE public.report_status AS ENUM ('open','reviewed','dismissed');

-- ============ PROFILE EXTENSIONS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stats boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_achievements boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_friend_requests boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- ============ FRIENDSHIPS ============
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id, status);
CREATE INDEX friendships_requester_idx ON public.friendships (requester_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = _a AND f.addressee_id = _b) OR (f.requester_id = _b AND f.addressee_id = _a))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_profile_public(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT p.is_public FROM public.profiles p WHERE p.id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.can_view_user(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _target
      OR public.is_profile_public(_target)
      OR public.are_friends(_viewer, _target);
$$;

CREATE POLICY "own friendships read" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "send friend request" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "respond to friendship" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "remove friendship" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- profiles: allow discovery of public profiles and friends
CREATE POLICY "Read public or friend profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.can_view_user(auth.uid(), id));

-- ============ USER STATS (XP / LEVEL / STREAKS) ============
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  workout_streak integer NOT NULL DEFAULT 0,
  nutrition_streak integer NOT NULL DEFAULT 0,
  water_streak integer NOT NULL DEFAULT 0,
  login_streak integer NOT NULL DEFAULT 0,
  coach_streak integer NOT NULL DEFAULT 0,
  reminder_streak integer NOT NULL DEFAULT 0,
  longest_workout_streak integer NOT NULL DEFAULT 0,
  longest_nutrition_streak integer NOT NULL DEFAULT 0,
  longest_water_streak integer NOT NULL DEFAULT 0,
  longest_login_streak integer NOT NULL DEFAULT 0,
  longest_coach_streak integer NOT NULL DEFAULT 0,
  longest_reminder_streak integer NOT NULL DEFAULT 0,
  last_workout_date date,
  last_nutrition_date date,
  last_water_date date,
  last_login_date date,
  last_coach_date date,
  last_reminder_date date,
  posts_count integer NOT NULL DEFAULT 0,
  achievements_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_stats_xp_idx ON public.user_stats (xp DESC);
GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read visible stats" ON public.user_stats FOR SELECT TO authenticated
  USING (public.can_view_user(auth.uid(), user_id));
CREATE POLICY "insert own stats" ON public.user_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own stats" ON public.user_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ XP EVENTS ============
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xp_events_user_idx ON public.xp_events (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own xp" ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own xp" ON public.xp_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ STREAK HISTORY ============
CREATE TABLE public.streak_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.streak_kind NOT NULL,
  day date NOT NULL,
  streak_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, day)
);
CREATE INDEX streak_history_user_idx ON public.streak_history (user_id, kind, day DESC);
GRANT SELECT, INSERT, UPDATE ON public.streak_history TO authenticated;
GRANT ALL ON public.streak_history TO service_role;
ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read visible streaks" ON public.streak_history FOR SELECT TO authenticated
  USING (public.can_view_user(auth.uid(), user_id));
CREATE POLICY "insert own streaks" ON public.streak_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own streaks" ON public.streak_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ACHIEVEMENTS CATALOG ============
CREATE TABLE public.achievements (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category public.achievement_category NOT NULL,
  difficulty public.achievement_difficulty NOT NULL DEFAULT 'bronze',
  xp_reward integer NOT NULL DEFAULT 50,
  target numeric NOT NULL DEFAULT 1,
  icon text NOT NULL DEFAULT 'trophy',
  is_secret boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.achievements TO anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements readable" ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code text NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0,
  target numeric NOT NULL DEFAULT 1,
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_code)
);
CREATE INDEX user_achievements_user_idx ON public.user_achievements (user_id, unlocked_at DESC NULLS LAST);
GRANT SELECT, INSERT, UPDATE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read visible achievements" ON public.user_achievements FOR SELECT TO authenticated
  USING (public.can_view_user(auth.uid(), user_id));
CREATE POLICY "insert own achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own achievements" ON public.user_achievements FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ POSTS ============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  kind public.activity_kind NOT NULL DEFAULT 'post',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility public.post_visibility NOT NULL DEFAULT 'friends',
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_user_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_post(_viewer uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
      AND (p.user_id = _viewer
        OR (NOT p.is_hidden AND (
             (p.visibility = 'public' AND public.is_profile_public(p.user_id))
          OR (p.visibility = 'friends' AND public.are_friends(_viewer, p.user_id))
        )))
  );
$$;

CREATE POLICY "read visible posts" ON public.posts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (NOT is_hidden AND (
         (visibility = 'public' AND public.is_profile_public(user_id))
      OR (visibility = 'friends' AND public.are_friends(auth.uid(), user_id))
    ))
  );
CREATE POLICY "create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own posts" ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LIKES ============
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX post_likes_post_idx ON public.post_likes (post_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read likes on visible posts" ON public.post_likes FOR SELECT TO authenticated
  USING (public.can_view_post(auth.uid(), post_id));
CREATE POLICY "like visible posts" ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post(auth.uid(), post_id));
CREATE POLICY "update own like" ON public.post_likes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "remove own like" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COMMENTS ============
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments on visible posts" ON public.post_comments FOR SELECT TO authenticated
  USING (public.can_view_post(auth.uid(), post_id));
CREATE POLICY "comment on visible posts" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post(auth.uid(), post_id));
CREATE POLICY "update own comment" ON public.post_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REPORTS ============
CREATE TABLE public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);
GRANT SELECT, INSERT ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own reports" ON public.post_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own report" ON public.post_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- ============ ACTIVITY EVENTS ============
CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.activity_kind NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_user_idx ON public.activity_events (user_id, created_at DESC);
CREATE INDEX activity_events_created_idx ON public.activity_events (created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read visible activity" ON public.activity_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id) OR public.is_profile_public(user_id));
CREATE POLICY "insert own activity" ON public.activity_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own activity" ON public.activity_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COUNTER TRIGGERS ============
CREATE OR REPLACE FUNCTION public.sync_post_counters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER post_likes_counter AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_counters();
CREATE TRIGGER post_comments_counter AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_counters();

CREATE TRIGGER friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER post_comments_updated_at BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_stats_updated_at BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_achievements_updated_at BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ XP / LEVEL FUNCTIONS ============
-- Level N requires 100 * (N-1) * N / 2 cumulative XP (100, 300, 600, 1000, ...)
CREATE OR REPLACE FUNCTION public.xp_for_level(_level integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT GREATEST(_level - 1, 0) * _level * 50;
$$;

CREATE OR REPLACE FUNCTION public.level_for_xp(_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT GREATEST(1, FLOOR((1 + SQRT(1 + (GREATEST(_xp,0)::numeric / 12.5))) / 2)::int);
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_stats(_user_id uuid)
RETURNS public.user_stats LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.user_stats;
BEGIN
  INSERT INTO public.user_stats (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO s FROM public.user_stats WHERE user_id = _user_id;
  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer, _reason text, _source text DEFAULT 'system', _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_level integer; new_level integer; new_xp integer;
BEGIN
  IF _user_id IS NULL OR _amount IS NULL OR _amount = 0 THEN RETURN '{}'::jsonb; END IF;
  PERFORM public.ensure_user_stats(_user_id);
  SELECT level INTO old_level FROM public.user_stats WHERE user_id = _user_id;
  UPDATE public.user_stats SET xp = GREATEST(xp + _amount, 0) WHERE user_id = _user_id
    RETURNING xp INTO new_xp;
  new_level := public.level_for_xp(new_xp);
  UPDATE public.user_stats SET level = new_level WHERE user_id = _user_id;
  INSERT INTO public.xp_events (user_id, amount, reason, source, metadata)
    VALUES (_user_id, _amount, _reason, _source, COALESCE(_metadata, '{}'::jsonb));
  IF new_level > old_level THEN
    INSERT INTO public.activity_events (user_id, kind, title, description, metadata, xp_awarded)
      VALUES (_user_id, 'level_up', 'Reached level ' || new_level, 'Level up!', jsonb_build_object('level', new_level), 0);
  END IF;
  RETURN jsonb_build_object('xp', new_xp, 'level', new_level, 'leveled_up', new_level > old_level, 'previous_level', old_level);
END;
$$;

-- Record a streak-eligible action for a given day; returns updated streak info.
CREATE OR REPLACE FUNCTION public.record_streak(_user_id uuid, _kind public.streak_kind, _day date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE last_day date; cur integer; longest integer; new_streak integer; col text;
BEGIN
  PERFORM public.ensure_user_stats(_user_id);
  EXECUTE format('SELECT last_%1$s_date, %1$s_streak, longest_%1$s_streak FROM public.user_stats WHERE user_id = $1', _kind::text)
    INTO last_day, cur, longest USING _user_id;

  IF last_day = _day THEN
    new_streak := GREATEST(cur, 1);
  ELSIF last_day = _day - 1 THEN
    new_streak := COALESCE(cur, 0) + 1;
  ELSE
    new_streak := 1;
  END IF;
  longest := GREATEST(COALESCE(longest, 0), new_streak);

  EXECUTE format('UPDATE public.user_stats SET %1$s_streak = $2, longest_%1$s_streak = $3, last_%1$s_date = $4 WHERE user_id = $1', _kind::text)
    USING _user_id, new_streak, longest, _day;

  INSERT INTO public.streak_history (user_id, kind, day, streak_value)
    VALUES (_user_id, _kind, _day, new_streak)
    ON CONFLICT (user_id, kind, day) DO UPDATE SET streak_value = EXCLUDED.streak_value;

  RETURN jsonb_build_object('kind', _kind, 'streak', new_streak, 'longest', longest, 'is_new_day', last_day IS DISTINCT FROM _day);
END;
$$;

-- Progress an achievement; unlocks + awards XP when the target is met.
CREATE OR REPLACE FUNCTION public.progress_achievement(_user_id uuid, _code text, _progress numeric, _mode text DEFAULT 'set')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.achievements; ua public.user_achievements; newprog numeric; unlocked boolean := false;
BEGIN
  SELECT * INTO a FROM public.achievements WHERE code = _code;
  IF a.code IS NULL THEN RETURN '{}'::jsonb; END IF;

  INSERT INTO public.user_achievements (user_id, achievement_code, progress, target)
    VALUES (_user_id, _code, 0, a.target)
    ON CONFLICT (user_id, achievement_code) DO NOTHING;
  SELECT * INTO ua FROM public.user_achievements WHERE user_id = _user_id AND achievement_code = _code;

  IF _mode = 'increment' THEN newprog := ua.progress + _progress; ELSE newprog := GREATEST(ua.progress, _progress); END IF;
  newprog := LEAST(newprog, a.target);

  IF ua.unlocked_at IS NULL AND newprog >= a.target THEN
    unlocked := true;
    UPDATE public.user_achievements SET progress = newprog, unlocked_at = now(), target = a.target
      WHERE id = ua.id;
    UPDATE public.user_stats SET achievements_count = achievements_count + 1 WHERE user_id = _user_id;
    PERFORM public.award_xp(_user_id, a.xp_reward, 'Achievement: ' || a.title, 'achievement', jsonb_build_object('code', a.code));
    INSERT INTO public.activity_events (user_id, kind, title, description, metadata, xp_awarded)
      VALUES (_user_id, 'achievement', a.title, a.description, jsonb_build_object('code', a.code, 'difficulty', a.difficulty), a.xp_reward);
  ELSE
    UPDATE public.user_achievements SET progress = newprog, target = a.target WHERE id = ua.id;
  END IF;

  RETURN jsonb_build_object('code', a.code, 'title', a.title, 'progress', newprog, 'target', a.target, 'unlocked', unlocked, 'xp_reward', a.xp_reward, 'difficulty', a.difficulty, 'icon', a.icon);
END;
$$;

-- ============ LEADERBOARDS ============
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _scope text DEFAULT 'global',      -- 'global' | 'friends'
  _metric text DEFAULT 'xp',         -- 'xp' | 'workout_streak' | 'nutrition_streak' | 'login_streak'
  _window text DEFAULT 'all',        -- 'week' | 'month' | 'all'
  _limit integer DEFAULT 25
)
RETURNS TABLE (
  user_id uuid, display_name text, avatar_url text, username text,
  level integer, value numeric, rank bigint, is_self boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); since timestamptz;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  since := CASE _window WHEN 'week' THEN now() - interval '7 days' WHEN 'month' THEN now() - interval '30 days' ELSE NULL END;

  RETURN QUERY
  WITH audience AS (
    SELECT p.id FROM public.profiles p
    WHERE (p.id = me)
       OR (_scope = 'friends' AND public.are_friends(me, p.id))
       OR (_scope = 'global' AND p.is_public AND p.show_stats)
  ),
  scored AS (
    SELECT a.id AS uid,
           CASE
             WHEN _metric = 'xp' AND since IS NOT NULL THEN
               COALESCE((SELECT SUM(x.amount) FROM public.xp_events x WHERE x.user_id = a.id AND x.created_at >= since), 0)::numeric
             WHEN _metric = 'xp' THEN COALESCE(s.xp, 0)::numeric
             WHEN _metric = 'workout_streak' THEN COALESCE(s.workout_streak, 0)::numeric
             WHEN _metric = 'nutrition_streak' THEN COALESCE(s.nutrition_streak, 0)::numeric
             WHEN _metric = 'login_streak' THEN COALESCE(s.login_streak, 0)::numeric
             ELSE COALESCE(s.xp, 0)::numeric
           END AS val,
           COALESCE(s.level, 1) AS lvl
    FROM audience a LEFT JOIN public.user_stats s ON s.user_id = a.id
  )
  SELECT sc.uid,
         COALESCE(pr.display_name, pr.full_name, 'Athlete') AS display_name,
         pr.avatar_url,
         pr.username,
         sc.lvl,
         sc.val,
         RANK() OVER (ORDER BY sc.val DESC, sc.uid) AS rank,
         sc.uid = me AS is_self
  FROM scored sc JOIN public.profiles pr ON pr.id = sc.uid
  ORDER BY sc.val DESC, sc.uid
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- ============ USER SEARCH ============
CREATE OR REPLACE FUNCTION public.search_users(_q text, _limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, display_name text, username text, avatar_url text, bio text,
  level integer, xp integer, friendship_status text, is_requester boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL OR _q IS NULL OR length(trim(_q)) < 2 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id,
         COALESCE(p.display_name, p.full_name, 'Athlete'),
         p.username,
         p.avatar_url,
         p.bio,
         COALESCE(s.level, 1),
         COALESCE(s.xp, 0),
         f.status::text,
         COALESCE(f.requester_id = me, false)
  FROM public.profiles p
  LEFT JOIN public.user_stats s ON s.user_id = p.id
  LEFT JOIN public.friendships f
    ON (f.requester_id = me AND f.addressee_id = p.id) OR (f.addressee_id = me AND f.requester_id = p.id)
  WHERE p.id <> me
    AND p.is_public
    AND (p.username ILIKE '%' || _q || '%' OR p.display_name ILIKE '%' || _q || '%' OR p.full_name ILIKE '%' || _q || '%')
  ORDER BY COALESCE(s.xp, 0) DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- ============ FEED ============
CREATE OR REPLACE FUNCTION public.get_activity_feed(_limit integer DEFAULT 50, _friends_only boolean DEFAULT false)
RETURNS TABLE (
  id uuid, user_id uuid, display_name text, username text, avatar_url text,
  kind public.activity_kind, title text, description text, metadata jsonb,
  xp_awarded integer, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT e.id, e.user_id,
         COALESCE(p.display_name, p.full_name, 'Athlete'), p.username, p.avatar_url,
         e.kind, e.title, e.description, e.metadata, e.xp_awarded, e.created_at
  FROM public.activity_events e
  JOIN public.profiles p ON p.id = e.user_id
  WHERE e.user_id = me
     OR public.are_friends(me, e.user_id)
     OR (NOT _friends_only AND p.is_public)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- ============ SEED ACHIEVEMENTS ============
INSERT INTO public.achievements (code, title, description, category, difficulty, xp_reward, target, icon, is_secret, sort_order) VALUES
('first_meal','First Bite','Log your first meal','nutrition','bronze',50,1,'utensils',false,10),
('meals_25','Meal Prepper','Log 25 meals','nutrition','silver',150,25,'utensils',false,11),
('meals_100','Nutrition Nerd','Log 100 meals','nutrition','gold',400,100,'utensils',false,12),
('macro_day','Macro Master','Hit your calorie target within 5% for a day','nutrition','silver',120,1,'target',false,13),
('protein_week','Protein Pro','Hit your protein target 7 days in a row','nutrition','gold',300,7,'beef',false,14),
('first_workout','Day One','Complete your first workout','workout','bronze',50,1,'dumbbell',false,20),
('workouts_10','Getting Strong','Complete 10 workouts','workout','silver',150,10,'dumbbell',false,21),
('workouts_50','Iron Habit','Complete 50 workouts','workout','gold',500,50,'dumbbell',false,22),
('workouts_100','Centurion','Complete 100 workouts','workout','platinum',1000,100,'dumbbell',false,23),
('workout_streak_7','Week Warrior','7-day workout streak','workout','silver',200,7,'flame',false,24),
('workout_streak_30','Unstoppable','30-day workout streak','workout','platinum',900,30,'flame',false,25),
('personal_best','Personal Best','Set a new personal record','workout','silver',150,1,'trophy',false,26),
('first_water','Hydration Start','Log water for the first time','hydration','bronze',30,1,'droplets',false,30),
('water_goal_day','Well Hydrated','Hit your daily water goal','hydration','bronze',60,1,'droplets',false,31),
('water_streak_7','Hydration Hero','Hit your water goal 7 days in a row','hydration','gold',300,7,'droplets',false,32),
('first_weight','Baseline','Log your first weight entry','milestone','bronze',40,1,'scale',false,40),
('weight_5','Steady Tracker','Log 5 weight entries','milestone','silver',120,5,'scale',false,41),
('weight_goal','Goal Crusher','Reach your target weight','milestone','platinum',1200,1,'target',false,42),
('first_coach','Ask the Coach','Send your first message to the AI coach','consistency','bronze',50,1,'sparkles',false,50),
('coach_25','Coachable','Send 25 messages to the AI coach','consistency','silver',180,25,'sparkles',false,51),
('first_scan','Scanner Rookie','Use the food scanner for the first time','consistency','bronze',50,1,'camera',false,52),
('scans_20','Scan Master','Scan 20 foods','consistency','silver',200,20,'camera',false,53),
('first_reminder','Stay on Track','Create your first reminder','consistency','bronze',40,1,'bell',false,54),
('reminder_streak_7','Punctual','Complete reminders 7 days in a row','consistency','gold',260,7,'bell',false,55),
('login_streak_7','Showing Up','Open NutriAI 7 days in a row','consistency','silver',150,7,'calendar',false,56),
('login_streak_30','Devoted','Open NutriAI 30 days in a row','consistency','platinum',800,30,'calendar',false,57),
('first_post','Say Hello','Share your first post','community','bronze',60,1,'message-circle',false,60),
('first_friend','Better Together','Make your first friend','community','bronze',80,1,'users',false,61),
('friends_10','Squad Goals','Connect with 10 friends','community','gold',350,10,'users',false,62),
('likes_50','Crowd Favourite','Receive 50 likes on your posts','community','gold',300,50,'heart',false,63),
('night_owl','Night Owl','Log something between 1am and 4am','milestone','silver',120,1,'moon',true,70),
('level_10','Double Digits','Reach level 10','milestone','gold',400,1,'award',false,71),
('level_25','Elite','Reach level 25','milestone','platinum',1500,1,'award',false,72)
ON CONFLICT (code) DO NOTHING;
