
CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer, _reason text, _source text DEFAULT 'system', _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_level integer; new_level integer; new_xp integer; target_id uuid;
BEGIN
  -- When invoked by a signed-in user, always scope to that user; ignore any supplied id.
  target_id := COALESCE(auth.uid(), _user_id);
  IF target_id IS NULL OR _amount IS NULL OR _amount = 0 THEN RETURN '{}'::jsonb; END IF;
  IF _amount > 5000 THEN RAISE EXCEPTION 'xp amount out of range'; END IF;

  PERFORM public.ensure_user_stats(target_id);
  SELECT level INTO old_level FROM public.user_stats WHERE user_id = target_id;
  UPDATE public.user_stats SET xp = GREATEST(xp + _amount, 0) WHERE user_id = target_id RETURNING xp INTO new_xp;
  new_level := public.level_for_xp(new_xp);
  UPDATE public.user_stats SET level = new_level WHERE user_id = target_id;
  INSERT INTO public.xp_events (user_id, amount, reason, source, metadata)
    VALUES (target_id, _amount, left(COALESCE(_reason,'XP'), 200), left(COALESCE(_source,'system'), 60), COALESCE(_metadata, '{}'::jsonb));
  IF new_level > old_level THEN
    INSERT INTO public.activity_events (user_id, kind, title, description, metadata, xp_awarded)
      VALUES (target_id, 'level_up', 'Reached level ' || new_level, 'Level up!', jsonb_build_object('level', new_level), 0);
  END IF;
  RETURN jsonb_build_object('xp', new_xp, 'level', new_level, 'leveled_up', new_level > old_level, 'previous_level', old_level);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_streak(_user_id uuid, _kind public.streak_kind, _day date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE last_day date; cur integer; longest integer; new_streak integer; target_id uuid; day_used date;
BEGIN
  target_id := COALESCE(auth.uid(), _user_id);
  IF target_id IS NULL THEN RETURN '{}'::jsonb; END IF;
  -- Never allow future-dating a streak.
  day_used := LEAST(COALESCE(_day, CURRENT_DATE), CURRENT_DATE);

  PERFORM public.ensure_user_stats(target_id);
  EXECUTE format('SELECT last_%1$s_date, %1$s_streak, longest_%1$s_streak FROM public.user_stats WHERE user_id = $1', _kind::text)
    INTO last_day, cur, longest USING target_id;

  IF last_day = day_used THEN
    new_streak := GREATEST(cur, 1);
  ELSIF last_day = day_used - 1 THEN
    new_streak := COALESCE(cur, 0) + 1;
  ELSE
    new_streak := 1;
  END IF;
  longest := GREATEST(COALESCE(longest, 0), new_streak);

  EXECUTE format('UPDATE public.user_stats SET %1$s_streak = $2, longest_%1$s_streak = $3, last_%1$s_date = $4 WHERE user_id = $1', _kind::text)
    USING target_id, new_streak, longest, day_used;

  INSERT INTO public.streak_history (user_id, kind, day, streak_value)
    VALUES (target_id, _kind, day_used, new_streak)
    ON CONFLICT (user_id, kind, day) DO UPDATE SET streak_value = EXCLUDED.streak_value;

  RETURN jsonb_build_object('kind', _kind, 'streak', new_streak, 'longest', longest, 'is_new_day', last_day IS DISTINCT FROM day_used);
END;
$$;

CREATE OR REPLACE FUNCTION public.progress_achievement(_user_id uuid, _code text, _progress numeric, _mode text DEFAULT 'set')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.achievements; ua public.user_achievements; newprog numeric; unlocked boolean := false; target_id uuid;
BEGIN
  target_id := COALESCE(auth.uid(), _user_id);
  IF target_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT * INTO a FROM public.achievements WHERE code = _code;
  IF a.code IS NULL THEN RETURN '{}'::jsonb; END IF;

  INSERT INTO public.user_achievements (user_id, achievement_code, progress, target)
    VALUES (target_id, _code, 0, a.target)
    ON CONFLICT (user_id, achievement_code) DO NOTHING;
  SELECT * INTO ua FROM public.user_achievements WHERE user_id = target_id AND achievement_code = _code;

  IF _mode = 'increment' THEN newprog := ua.progress + COALESCE(_progress, 0);
  ELSE newprog := GREATEST(ua.progress, COALESCE(_progress, 0)); END IF;
  newprog := LEAST(GREATEST(newprog, 0), a.target);

  IF ua.unlocked_at IS NULL AND newprog >= a.target THEN
    unlocked := true;
    UPDATE public.user_achievements SET progress = newprog, unlocked_at = now(), target = a.target WHERE id = ua.id;
    UPDATE public.user_stats SET achievements_count = achievements_count + 1 WHERE user_id = target_id;
    PERFORM public.award_xp(target_id, a.xp_reward, 'Achievement: ' || a.title, 'achievement', jsonb_build_object('code', a.code));
    INSERT INTO public.activity_events (user_id, kind, title, description, metadata, xp_awarded)
      VALUES (target_id, 'achievement', a.title, a.description, jsonb_build_object('code', a.code, 'difficulty', a.difficulty), a.xp_reward);
  ELSE
    UPDATE public.user_achievements SET progress = newprog, target = a.target WHERE id = ua.id;
  END IF;

  RETURN jsonb_build_object('code', a.code, 'title', a.title, 'progress', newprog, 'target', a.target, 'unlocked', unlocked, 'xp_reward', a.xp_reward, 'difficulty', a.difficulty, 'icon', a.icon);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_user_stats(uuid) FROM anon, public, authenticated;
