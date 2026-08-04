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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          instructions: string | null
          max_score: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          max_score?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          max_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          id: string
          marked_at: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          held_on: string
          id: string
          lecturer_id: string | null
          session_code: string
          title: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          held_on?: string
          id?: string
          lecturer_id?: string | null
          session_code?: string
          title?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          held_on?: string
          id?: string
          lecturer_id?: string | null
          session_code?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_registrations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          registration_date: string
          semester: string
          session: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          registration_date?: string
          semester?: string
          session?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          registration_date?: string
          semester?: string
          session?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department: string | null
          description: string | null
          id: string
          institution_id: string | null
          lecturer_id: string | null
          level: string | null
          semester: string | null
          status: string
          title: string
          units: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          lecturer_id?: string | null
          level?: string | null
          semester?: string | null
          status?: string
          title: string
          units?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          lecturer_id?: string | null
          level?: string | null
          semester?: string | null
          status?: string
          title?: string
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json
          created_at: string
          exam_id: string
          id: string
          score: number | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          exam_id: string
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          exam_id?: string
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_index: number
          exam_id: string
          id: string
          options: Json
          position: number
          prompt: string
        }
        Insert: {
          correct_index?: number
          exam_id: string
          id?: string
          options?: Json
          position?: number
          prompt: string
        }
        Update: {
          correct_index?: number
          exam_id?: string
          id?: string
          options?: Json
          position?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          starts_at: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          starts_at?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount_kobo: number
          created_at: string
          currency: string
          description: string
          due_date: string | null
          id: string
          paystack_reference: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          id?: string
          paystack_reference?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          id?: string
          paystack_reference?: string | null
          status?: string
          student_id?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          country: string | null
          created_at: string
          id: string
          name: string
          onboarding_status: string
          slug: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          name: string
          onboarding_status?: string
          slug?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_status?: string
          slug?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          institution: string
          institution_id: string | null
          matric_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id: string
          institution?: string
          institution_id?: string | null
          matric_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          institution?: string
          institution_id?: string | null
          matric_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_periods: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          opens_at: string
          semester: string
          session: string
          updated_at: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          semester: string
          session: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          semester?: string
          session?: string
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          course_id: string
          created_at: string
          grade: string | null
          id: string
          published: boolean
          score: number
          semester: string | null
          session: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          grade?: string | null
          id?: string
          published?: boolean
          score?: number
          semester?: string | null
          session?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          published?: boolean
          score?: number
          semester?: string | null
          session?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          auth_user_id: string | null
          created_at: string
          department: string | null
          email: string
          faculty: string | null
          full_name: string
          id: string
          level: string | null
          phone: string | null
          profile_photo: string | null
          programme: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          faculty?: string | null
          full_name?: string
          id?: string
          level?: string | null
          phone?: string | null
          profile_photo?: string | null
          programme?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          faculty?: string | null
          full_name?: string
          id?: string
          level?: string | null
          phone?: string | null
          profile_photo?: string | null
          programme?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assignment_id: string
          content: string | null
          feedback: string | null
          file_url: string | null
          id: string
          score: number | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          institution_id: string | null
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          plan: string
          status: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          institution_id?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          institution_id?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          venue: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          venue?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "student" | "lecturer" | "admin"
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
      app_role: ["student", "lecturer", "admin"],
    },
  },
} as const
