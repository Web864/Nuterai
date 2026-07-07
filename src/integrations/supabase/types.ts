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
      sex_type: "male" | "female" | "other" | "prefer_not_to_say"
      unit_system: "metric" | "imperial"
      workout_experience: "none" | "beginner" | "intermediate" | "advanced"
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
      sex_type: ["male", "female", "other", "prefer_not_to_say"],
      unit_system: ["metric", "imperial"],
      workout_experience: ["none", "beginner", "intermediate", "advanced"],
    },
  },
} as const
