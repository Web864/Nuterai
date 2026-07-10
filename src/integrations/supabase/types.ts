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
      meal_entries: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          ai_raw: Json | null
          calories_kcal: number
          carbs_g: number
          created_at: string
          description: string | null
          fat_g: number
          fiber_g: number
          id: string
          logged_at: string
          logged_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          protein_g: number
          serving_qty: number
          serving_unit: string | null
          source: Database["public"]["Enums"]["meal_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_raw?: Json | null
          calories_kcal?: number
          carbs_g?: number
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          id?: string
          logged_at?: string
          logged_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name: string
          protein_g?: number
          serving_qty?: number
          serving_unit?: string | null
          source?: Database["public"]["Enums"]["meal_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_raw?: Json | null
          calories_kcal?: number
          carbs_g?: number
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          id?: string
          logged_at?: string
          logged_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name?: string
          protein_g?: number
          serving_qty?: number
          serving_unit?: string | null
          source?: Database["public"]["Enums"]["meal_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          language: string | null
          locale: string | null
          onboarding_completed: boolean
          phone: string | null
          religion: string | null
          units: Database["public"]["Enums"]["unit_system"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          locale?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          religion?: string | null
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          locale?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          religion?: string | null
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
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
      gym_access: "full_gym" | "home_gym" | "basic_equipment" | "no_equipment"
      meal_source: "manual" | "ai_text" | "ai_photo" | "favorite"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      sex_type: "male" | "female" | "other" | "prefer_not_to_say"
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
      gym_access: ["full_gym", "home_gym", "basic_equipment", "no_equipment"],
      meal_source: ["manual", "ai_text", "ai_photo", "favorite"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      sex_type: ["male", "female", "other", "prefer_not_to_say"],
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
