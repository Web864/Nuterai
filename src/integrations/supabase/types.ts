export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          code: string
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["achievement_difficulty"]
          icon: string
          is_secret: boolean
          sort_order: number
          target: number
          title: string
          xp_reward: number
        }
        Insert: {
          category: Database["public"]["Enums"]["achievement_category"]
          code: string
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["achievement_difficulty"]
          icon?: string
          is_secret?: boolean
          sort_order?: number
          target?: number
          title: string
          xp_reward?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          code?: string
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["achievement_difficulty"]
          icon?: string
          is_secret?: boolean
          sort_order?: number
          target?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          metadata: Json
          title: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["activity_kind"]
          metadata?: Json
          title: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          metadata?: Json
          title?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model: string | null
          role: Database["public"]["Enums"]["coach_role"]
          thread_id: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          model?: string | null
          role: Database["public"]["Enums"]["coach_role"]
          thread_id: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: Database["public"]["Enums"]["coach_role"]
          thread_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "coach_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          muscle_group: string | null
          name: string
          order_index: number
          reps: number
          session_id: string
          sets: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          muscle_group?: string | null
          name: string
          order_index?: number
          reps?: number
          session_id: string
          sets?: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          muscle_group?: string | null
          name?: string
          order_index?: number
          reps?: number
          session_id?: string
          sets?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      meal_entries: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          ai_raw: Json | null
          barcode: string | null
          brand: string | null
          calories_kcal: number
          carbs_g: number
          created_at: string
          description: string | null
          fat_g: number
          fiber_g: number
          id: string
          image_url: string | null
          logged_at: string
          logged_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          protein_g: number
          serving_qty: number
          serving_unit: string | null
          sodium_mg: number | null
          source: Database["public"]["Enums"]["meal_source"]
          sugar_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_raw?: Json | null
          barcode?: string | null
          brand?: string | null
          calories_kcal?: number
          carbs_g?: number
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          id?: string
          image_url?: string | null
          logged_at?: string
          logged_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name: string
          protein_g?: number
          serving_qty?: number
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: Database["public"]["Enums"]["meal_source"]
          sugar_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_raw?: Json | null
          barcode?: string | null
          brand?: string | null
          calories_kcal?: number
          carbs_g?: number
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          id?: string
          image_url?: string | null
          logged_at?: string
          logged_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name?: string
          protein_g?: number
          serving_qty?: number
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: Database["public"]["Enums"]["meal_source"]
          sugar_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action: Database["public"]["Enums"]["notification_action"]
          body: string | null
          created_at: string
          delivered_at: string | null
          id: string
          read_at: string | null
          reminder_id: string | null
          scheduled_for: string
          title: string
          type: Database["public"]["Enums"]["reminder_type"]
          user_id: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["notification_action"]
          body?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          reminder_id?: string | null
          scheduled_for: string
          title: string
          type?: Database["public"]["Enums"]["reminder_type"]
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["notification_action"]
          body?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          reminder_id?: string | null
          scheduled_for?: string
          title?: string
          type?: Database["public"]["Enums"]["reminder_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comment_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_hidden: boolean
          kind: Database["public"]["Enums"]["activity_kind"]
          like_count: number
          metadata: Json
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          comment_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          kind?: Database["public"]["Enums"]["activity_kind"]
          like_count?: number
          metadata?: Json
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          comment_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          kind?: Database["public"]["Enums"]["activity_kind"]
          like_count?: number
          metadata?: Json
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_friend_requests: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_public: boolean
          language: string | null
          locale: string | null
          notification_sound: boolean
          notifications_enabled: boolean
          onboarding_completed: boolean
          phone: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          religion: string | null
          show_achievements: boolean
          show_stats: boolean
          timezone: string | null
          units: Database["public"]["Enums"]["unit_system"]
          updated_at: string
          username: string | null
        }
        Insert: {
          allow_friend_requests?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_public?: boolean
          language?: string | null
          locale?: string | null
          notification_sound?: boolean
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          religion?: string | null
          show_achievements?: boolean
          show_stats?: boolean
          timezone?: string | null
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          allow_friend_requests?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_public?: boolean
          language?: string | null
          locale?: string | null
          notification_sound?: boolean
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          religion?: string | null
          show_achievements?: boolean
          show_stats?: boolean
          timezone?: string | null
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          days_of_week: number[]
          id: string
          is_active: boolean
          is_recurring: boolean
          message: string | null
          metadata: Json
          one_time_at: string | null
          snooze_until: string | null
          times: string[]
          timezone: string
          title: string
          type: Database["public"]["Enums"]["reminder_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          message?: string | null
          metadata?: Json
          one_time_at?: string | null
          snooze_until?: string | null
          times?: string[]
          timezone?: string
          title: string
          type?: Database["public"]["Enums"]["reminder_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          message?: string | null
          metadata?: Json
          one_time_at?: string | null
          snooze_until?: string | null
          times?: string[]
          timezone?: string
          title?: string
          type?: Database["public"]["Enums"]["reminder_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_history: {
        Row: {
          created_at: string
          day: string
          id: string
          kind: Database["public"]["Enums"]["streak_kind"]
          streak_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          kind: Database["public"]["Enums"]["streak_kind"]
          streak_value?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          kind?: Database["public"]["Enums"]["streak_kind"]
          streak_value?: number
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_code: string
          created_at: string
          id: string
          progress: number
          target: number
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          created_at?: string
          id?: string
          progress?: number
          target?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          created_at?: string
          id?: string
          progress?: number
          target?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_code_fkey"
            columns: ["achievement_code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
        ]
      }
      user_goals: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          age: number | null
          alcohol: boolean | null
          allergies: string[] | null
          birth_date: string | null
          bmr_kcal: number | null
          body_fat_pct: number | null
          budget_currency: string | null
          carbs_g: number | null
          cooking_skill: Database["public"]["Enums"]["cooking_skill"] | null
          created_at: string
          current_weight_kg: number | null
          daily_calorie_target: number | null
          daily_food_budget: number | null
          daily_water_ml: number | null
          diet_preference: Database["public"]["Enums"]["diet_preference"] | null
          fat_g: number | null
          fiber_g: number | null
          fitness_goal: Database["public"]["Enums"]["fitness_goal"] | null
          gym_access: Database["public"]["Enums"]["gym_access"] | null
          height_cm: number | null
          kitchen_equipment: string[] | null
          medical_conditions: string[] | null
          office_end: string | null
          office_start: string | null
          pace_kg_per_week: number | null
          protein_g: number | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          sleep_time: string | null
          smoking: boolean | null
          stress_level: number | null
          target_timeline_weeks: number | null
          target_weight_kg: number | null
          tdee_kcal: number | null
          updated_at: string
          user_id: string
          wake_time: string | null
          water_target_ml: number | null
          workout_experience:
            | Database["public"]["Enums"]["workout_experience"]
            | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          alcohol?: boolean | null
          allergies?: string[] | null
          birth_date?: string | null
          bmr_kcal?: number | null
          body_fat_pct?: number | null
          budget_currency?: string | null
          carbs_g?: number | null
          cooking_skill?: Database["public"]["Enums"]["cooking_skill"] | null
          created_at?: string
          current_weight_kg?: number | null
          daily_calorie_target?: number | null
          daily_food_budget?: number | null
          daily_water_ml?: number | null
          diet_preference?:
            | Database["public"]["Enums"]["diet_preference"]
            | null
          fat_g?: number | null
          fiber_g?: number | null
          fitness_goal?: Database["public"]["Enums"]["fitness_goal"] | null
          gym_access?: Database["public"]["Enums"]["gym_access"] | null
          height_cm?: number | null
          kitchen_equipment?: string[] | null
          medical_conditions?: string[] | null
          office_end?: string | null
          office_start?: string | null
          pace_kg_per_week?: number | null
          protein_g?: number | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          sleep_time?: string | null
          smoking?: boolean | null
          stress_level?: number | null
          target_timeline_weeks?: number | null
          target_weight_kg?: number | null
          tdee_kcal?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
          water_target_ml?: number | null
          workout_experience?:
            | Database["public"]["Enums"]["workout_experience"]
            | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          alcohol?: boolean | null
          allergies?: string[] | null
          birth_date?: string | null
          bmr_kcal?: number | null
          body_fat_pct?: number | null
          budget_currency?: string | null
          carbs_g?: number | null
          cooking_skill?: Database["public"]["Enums"]["cooking_skill"] | null
          created_at?: string
          current_weight_kg?: number | null
          daily_calorie_target?: number | null
          daily_food_budget?: number | null
          daily_water_ml?: number | null
          diet_preference?:
            | Database["public"]["Enums"]["diet_preference"]
            | null
          fat_g?: number | null
          fiber_g?: number | null
          fitness_goal?: Database["public"]["Enums"]["fitness_goal"] | null
          gym_access?: Database["public"]["Enums"]["gym_access"] | null
          height_cm?: number | null
          kitchen_equipment?: string[] | null
          medical_conditions?: string[] | null
          office_end?: string | null
          office_start?: string | null
          pace_kg_per_week?: number | null
          protein_g?: number | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          sleep_time?: string | null
          smoking?: boolean | null
          stress_level?: number | null
          target_timeline_weeks?: number | null
          target_weight_kg?: number | null
          tdee_kcal?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
          water_target_ml?: number | null
          workout_experience?:
            | Database["public"]["Enums"]["workout_experience"]
            | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          achievements_count: number
          coach_streak: number
          created_at: string
          last_coach_date: string | null
          last_login_date: string | null
          last_nutrition_date: string | null
          last_reminder_date: string | null
          last_water_date: string | null
          last_workout_date: string | null
          level: number
          login_streak: number
          longest_coach_streak: number
          longest_login_streak: number
          longest_nutrition_streak: number
          longest_reminder_streak: number
          longest_water_streak: number
          longest_workout_streak: number
          nutrition_streak: number
          posts_count: number
          reminder_streak: number
          updated_at: string
          user_id: string
          water_streak: number
          workout_streak: number
          xp: number
        }
        Insert: {
          achievements_count?: number
          coach_streak?: number
          created_at?: string
          last_coach_date?: string | null
          last_login_date?: string | null
          last_nutrition_date?: string | null
          last_reminder_date?: string | null
          last_water_date?: string | null
          last_workout_date?: string | null
          level?: number
          login_streak?: number
          longest_coach_streak?: number
          longest_login_streak?: number
          longest_nutrition_streak?: number
          longest_reminder_streak?: number
          longest_water_streak?: number
          longest_workout_streak?: number
          nutrition_streak?: number
          posts_count?: number
          reminder_streak?: number
          updated_at?: string
          user_id: string
          water_streak?: number
          workout_streak?: number
          xp?: number
        }
        Update: {
          achievements_count?: number
          coach_streak?: number
          created_at?: string
          last_coach_date?: string | null
          last_login_date?: string | null
          last_nutrition_date?: string | null
          last_reminder_date?: string | null
          last_water_date?: string | null
          last_workout_date?: string | null
          level?: number
          login_streak?: number
          longest_coach_streak?: number
          longest_login_streak?: number
          longest_nutrition_streak?: number
          longest_reminder_streak?: number
          longest_water_streak?: number
          longest_workout_streak?: number
          nutrition_streak?: number
          posts_count?: number
          reminder_streak?: number
          updated_at?: string
          user_id?: string
          water_streak?: number
          workout_streak?: number
          xp?: number
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_at: string
          logged_date: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          logged_at?: string
          logged_date?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_at?: string
          logged_date?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          logged_date: string
          note: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          logged_date?: string
          note?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          logged_date?: string
          note?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_plan_days: {
        Row: {
          created_at: string
          day_index: number
          estimated_minutes: number
          exercises: Json
          focus: Database["public"]["Enums"]["workout_focus"]
          id: string
          plan_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          estimated_minutes?: number
          exercises?: Json
          focus?: Database["public"]["Enums"]["workout_focus"]
          id?: string
          plan_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          estimated_minutes?: number
          exercises?: Json
          focus?: Database["public"]["Enums"]["workout_focus"]
          id?: string
          plan_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          ai_model: string | null
          ai_raw: Json | null
          created_at: string
          days_per_week: number
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_weeks: number
          goal: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          source: Database["public"]["Enums"]["workout_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_raw?: Json | null
          created_at?: string
          days_per_week?: number
          difficulty?: Database["public"]["Enums"]["workout_difficulty"]
          duration_weeks?: number
          goal?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          source?: Database["public"]["Enums"]["workout_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_raw?: Json | null
          created_at?: string
          days_per_week?: number
          difficulty?: Database["public"]["Enums"]["workout_difficulty"]
          duration_weeks?: number
          goal?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["workout_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          calories_kcal: number
          created_at: string
          duration_minutes: number
          exercises: Json
          focus: Database["public"]["Enums"]["workout_focus"]
          id: string
          logged_at: string
          logged_date: string
          name: string
          notes: string | null
          perceived_effort: number | null
          plan_day_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_kcal?: number
          created_at?: string
          duration_minutes?: number
          exercises?: Json
          focus?: Database["public"]["Enums"]["workout_focus"]
          id?: string
          logged_at?: string
          logged_date?: string
          name: string
          notes?: string | null
          perceived_effort?: number | null
          plan_day_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_kcal?: number
          created_at?: string
          duration_minutes?: number
          exercises?: Json
          focus?: Database["public"]["Enums"]["workout_focus"]
          id?: string
          logged_at?: string
          logged_date?: string
          name?: string
          notes?: string | null
          perceived_effort?: number | null
          plan_day_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          reason: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
          source?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      award_xp: {
        Args: {
          _amount: number
          _metadata?: Json
          _reason: string
          _source?: string
          _user_id: string
        }
        Returns: Json
      }
      can_view_post: {
        Args: { _post_id: string; _viewer: string }
        Returns: boolean
      }
      can_view_user: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      ensure_user_stats: {
        Args: { _user_id: string }
        Returns: {
          achievements_count: number
          coach_streak: number
          created_at: string
          last_coach_date: string | null
          last_login_date: string | null
          last_nutrition_date: string | null
          last_reminder_date: string | null
          last_water_date: string | null
          last_workout_date: string | null
          level: number
          login_streak: number
          longest_coach_streak: number
          longest_login_streak: number
          longest_nutrition_streak: number
          longest_reminder_streak: number
          longest_water_streak: number
          longest_workout_streak: number
          nutrition_streak: number
          posts_count: number
          reminder_streak: number
          updated_at: string
          user_id: string
          water_streak: number
          workout_streak: number
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "user_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_activity_feed: {
        Args: { _friends_only?: boolean; _limit?: number }
        Returns: {
          avatar_url: string
          created_at: string
          description: string
          display_name: string
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          metadata: Json
          title: string
          user_id: string
          username: string
          xp_awarded: number
        }[]
      }
      get_leaderboard: {
        Args: {
          _limit?: number
          _metric?: string
          _scope?: string
          _window?: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          is_self: boolean
          level: number
          rank: number
          user_id: string
          username: string
          value: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_profile_public: { Args: { _user_id: string }; Returns: boolean }
      level_for_xp: { Args: { _xp: number }; Returns: number }
      progress_achievement: {
        Args: {
          _code: string
          _mode?: string
          _progress: number
          _user_id: string
        }
        Returns: Json
      }
      record_streak: {
        Args: {
          _day?: string
          _kind: Database["public"]["Enums"]["streak_kind"]
          _user_id: string
        }
        Returns: Json
      }
      search_users: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          friendship_status: string
          is_requester: boolean
          level: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      xp_for_level: { Args: { _level: number }; Returns: number }
    }
    Enums: {
      achievement_category:
        | "nutrition"
        | "workout"
        | "hydration"
        | "consistency"
        | "community"
        | "milestone"
      achievement_difficulty: "bronze" | "silver" | "gold" | "platinum"
      activity_kind:
        | "workout"
        | "meal"
        | "weight"
        | "achievement"
        | "streak"
        | "personal_best"
        | "level_up"
        | "post"
      activity_level:
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active"
      app_role: "admin" | "moderator" | "user"
      coach_role: "user" | "assistant" | "system"
      cooking_skill: "none" | "beginner" | "intermediate" | "advanced"
      diet_preference:
        | "omnivore"
        | "vegetarian"
        | "vegan"
        | "pescatarian"
        | "halal"
        | "kosher"
        | "keto"
        | "mediterranean"
        | "low_carb"
        | "high_protein"
      fitness_goal:
        | "lose_weight"
        | "maintain"
        | "gain_weight"
        | "build_muscle"
        | "improve_health"
        | "boost_energy"
      friendship_status: "pending" | "accepted" | "declined" | "blocked"
      gym_access: "full_gym" | "home_gym" | "basic_equipment" | "no_equipment"
      meal_source:
        | "manual"
        | "ai_text"
        | "ai_photo"
        | "favorite"
        | "ai_photo_scan"
        | "barcode"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      notification_action:
        | "pending"
        | "completed"
        | "snoozed"
        | "dismissed"
        | "missed"
      post_visibility: "public" | "friends" | "private"
      reminder_type:
        | "meal"
        | "workout"
        | "water"
        | "weight"
        | "sleep"
        | "medication"
        | "custom"
      report_status: "open" | "reviewed" | "dismissed"
      sex_type: "male" | "female" | "other" | "prefer_not_to_say"
      streak_kind:
        | "workout"
        | "nutrition"
        | "water"
        | "login"
        | "coach"
        | "reminder"
      unit_system: "metric" | "imperial"
      workout_difficulty: "beginner" | "intermediate" | "advanced"
      workout_experience: "none" | "beginner" | "intermediate" | "advanced"
      workout_focus:
        | "full_body"
        | "upper"
        | "lower"
        | "push"
        | "pull"
        | "legs"
        | "core"
        | "cardio"
        | "hiit"
        | "mobility"
        | "rest"
        | "custom"
      workout_source: "ai" | "manual" | "template"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_category: [
        "nutrition",
        "workout",
        "hydration",
        "consistency",
        "community",
        "milestone",
      ],
      achievement_difficulty: ["bronze", "silver", "gold", "platinum"],
      activity_kind: [
        "workout",
        "meal",
        "weight",
        "achievement",
        "streak",
        "personal_best",
        "level_up",
        "post",
      ],
      activity_level: [
        "sedentary",
        "light",
        "moderate",
        "active",
        "very_active",
      ],
      app_role: ["admin", "moderator", "user"],
      coach_role: ["user", "assistant", "system"],
      cooking_skill: ["none", "beginner", "intermediate", "advanced"],
      diet_preference: [
        "omnivore",
        "vegetarian",
        "vegan",
        "pescatarian",
        "halal",
        "kosher",
        "keto",
        "mediterranean",
        "low_carb",
        "high_protein",
      ],
      fitness_goal: [
        "lose_weight",
        "maintain",
        "gain_weight",
        "build_muscle",
        "improve_health",
        "boost_energy",
      ],
      friendship_status: ["pending", "accepted", "declined", "blocked"],
      gym_access: ["full_gym", "home_gym", "basic_equipment", "no_equipment"],
      meal_source: [
        "manual",
        "ai_text",
        "ai_photo",
        "favorite",
        "ai_photo_scan",
        "barcode",
      ],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      notification_action: [
        "pending",
        "completed",
        "snoozed",
        "dismissed",
        "missed",
      ],
      post_visibility: ["public", "friends", "private"],
      reminder_type: [
        "meal",
        "workout",
        "water",
        "weight",
        "sleep",
        "medication",
        "custom",
      ],
      report_status: ["open", "reviewed", "dismissed"],
      sex_type: ["male", "female", "other", "prefer_not_to_say"],
      streak_kind: [
        "workout",
        "nutrition",
        "water",
        "login",
        "coach",
        "reminder",
      ],
      unit_system: ["metric", "imperial"],
      workout_difficulty: ["beginner", "intermediate", "advanced"],
      workout_experience: ["none", "beginner", "intermediate", "advanced"],
      workout_focus: [
        "full_body",
        "upper",
        "lower",
        "push",
        "pull",
        "legs",
        "core",
        "cardio",
        "hiit",
        "mobility",
        "rest",
        "custom",
      ],
      workout_source: ["ai", "manual", "template"],
    },
  },
} as const
