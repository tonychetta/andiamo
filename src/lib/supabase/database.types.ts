// AUTO-GENERATED from the Supabase schema. Do not edit by hand.
// Regenerate after schema changes (Supabase MCP: generate_typescript_types).

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
      artists: {
        Row: {
          artist_name: string
          city: string | null
          coach_id: string | null
          country: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["artist_status"]
          subscription_status: string | null
          tier: Database["public"]["Enums"]["artist_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_name?: string
          city?: string | null
          coach_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["artist_status"]
          subscription_status?: string | null
          tier?: Database["public"]["Enums"]["artist_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_name?: string
          city?: string | null
          coach_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["artist_status"]
          subscription_status?: string | null
          tier?: Database["public"]["Enums"]["artist_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_active_artist: {
        Row: {
          artist_id: string
          coach_user_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          coach_user_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          coach_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_active_artist_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_coaches: {
        Row: {
          artist_id: string
          coach_id: string
          created_at: string
        }
        Insert: {
          artist_id: string
          coach_id: string
          created_at?: string
        }
        Update: {
          artist_id?: string
          coach_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_coaches_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_coaches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          bio: string | null
          certified_at: string | null
          created_at: string
          genre_experience: string[]
          id: string
          is_producer: boolean
          non_circumvention_agreement_signed_at: string | null
          philosophy: string | null
          production_credits: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certified_at?: string | null
          created_at?: string
          genre_experience?: string[]
          id?: string
          is_producer?: boolean
          non_circumvention_agreement_signed_at?: string | null
          philosophy?: string | null
          production_credits?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certified_at?: string | null
          created_at?: string
          genre_experience?: string[]
          id?: string
          is_producer?: boolean
          non_circumvention_agreement_signed_at?: string | null
          philosophy?: string | null
          production_credits?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_links: {
        Row: {
          artist_id: string
          comments: number | null
          content_piece_id: string
          created_at: string
          id: string
          likes: number | null
          platform: string
          saves: number | null
          shares: number | null
          updated_at: string
          url: string
          views: number | null
        }
        Insert: {
          artist_id: string
          comments?: number | null
          content_piece_id: string
          created_at?: string
          id?: string
          likes?: number | null
          platform?: string
          saves?: number | null
          shares?: number | null
          updated_at?: string
          url?: string
          views?: number | null
        }
        Update: {
          artist_id?: string
          comments?: number | null
          content_piece_id?: string
          created_at?: string
          id?: string
          likes?: number | null
          platform?: string
          saves?: number | null
          shares?: number | null
          updated_at?: string
          url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_links_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_piece_types: {
        Row: {
          artist_id: string
          content_piece_id: string
          tag_id: string
        }
        Insert: {
          artist_id: string
          content_piece_id: string
          tag_id: string
        }
        Update: {
          artist_id?: string
          content_piece_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_piece_types_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_piece_types_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_type_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pieces: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          song_id: string | null
          song_sections: string[]
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          song_id?: string | null
          song_sections?: string[]
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          song_id?: string | null
          song_sections?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_type_tags: {
        Row: {
          artist_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          artist_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          artist_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          artist_id: string
          category: Database["public"]["Enums"]["goal_category"]
          completed_at: string | null
          created_at: string
          description: string
          display_order: number
          id: string
          is_completed: boolean
          updated_at: string
          vision_id: string
        }
        Insert: {
          artist_id: string
          category: Database["public"]["Enums"]["goal_category"]
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_completed?: boolean
          updated_at?: string
          vision_id: string
        }
        Update: {
          artist_id?: string
          category?: Database["public"]["Enums"]["goal_category"]
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_completed?: boolean
          updated_at?: string
          vision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "visions"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          billing_bypass: boolean
          coach_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          tier: Database["public"]["Enums"]["artist_tier"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          billing_bypass?: boolean
          coach_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["artist_tier"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          billing_bypass?: boolean
          coach_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["artist_tier"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          artist_id: string
          completed_at: string | null
          created_at: string
          description: string
          display_order: number
          goal_id: string
          id: string
          is_completed: boolean
          is_next_milestone: boolean
          started_at: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          goal_id: string
          id?: string
          is_completed?: boolean
          is_next_milestone?: boolean
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          goal_id?: string
          id?: string
          is_completed?: boolean
          is_next_milestone?: boolean
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          email: string | null
          id: string
          name: string
          profile_picture_url: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          email?: string | null
          id: string
          name?: string
          profile_picture_url?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          profile_picture_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          artist_id: string
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          artist_id: string
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          artist_id?: string
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      release_templates: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          phases: Json
          template_type: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          phases?: Json
          template_type: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          phases?: Json
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_templates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      release_tasks: {
        Row: {
          artist_id: string
          assigned_to: Database["public"]["Enums"]["release_assignee"]
          completed_at: string | null
          created_at: string
          description: string
          display_order: number
          due_date: string | null
          id: string
          is_completed: boolean
          is_custom: boolean
          offset_days: number
          phase_group: string
          phase_label: string
          release_id: string
          updated_at: string
          week_title: string
        }
        Insert: {
          artist_id: string
          assigned_to?: Database["public"]["Enums"]["release_assignee"]
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          due_date?: string | null
          id?: string
          is_completed?: boolean
          is_custom?: boolean
          offset_days?: number
          phase_group?: string
          phase_label?: string
          release_id: string
          updated_at?: string
          week_title?: string
        }
        Update: {
          artist_id?: string
          assigned_to?: Database["public"]["Enums"]["release_assignee"]
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          due_date?: string | null
          id?: string
          is_completed?: boolean
          is_custom?: boolean
          offset_days?: number
          phase_group?: string
          phase_label?: string
          release_id?: string
          updated_at?: string
          week_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_tasks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_tasks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          mgmt_link: string | null
          notes: string | null
          parent_release_id: string | null
          release_date: string
          release_type: Database["public"]["Enums"]["release_type"]
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          mgmt_link?: string | null
          notes?: string | null
          parent_release_id?: string | null
          release_date: string
          release_type?: Database["public"]["Enums"]["release_type"]
          title?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          mgmt_link?: string | null
          notes?: string | null
          parent_release_id?: string | null
          release_date?: string
          release_type?: Database["public"]["Enums"]["release_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_parent_release_id_fkey"
            columns: ["parent_release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      results_entries: {
        Row: {
          artist_id: string
          created_at: string
          entry_date: string
          id: string
          metric_key: string
          song_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          entry_date: string
          id?: string
          metric_key: string
          song_id?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          metric_key?: string
          song_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_entries_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_entries_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          original_release_date: string | null
          release_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          original_release_date?: string | null
          release_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          original_release_date?: string | null
          release_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          artist_id: string
          assigned_coach_id: string | null
          assigned_to: Database["public"]["Enums"]["task_assignee"]
          completed_at: string | null
          created_at: string
          description: string
          display_order: number
          id: string
          is_completed: boolean
          is_recurring: boolean
          milestone_id: string | null
          on_wtf: boolean
          parent_task_id: string | null
          push_reason: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          wtf_priority: boolean
        }
        Insert: {
          artist_id: string
          assigned_coach_id?: string | null
          assigned_to?: Database["public"]["Enums"]["task_assignee"]
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_completed?: boolean
          is_recurring?: boolean
          milestone_id?: string | null
          on_wtf?: boolean
          parent_task_id?: string | null
          push_reason?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wtf_priority?: boolean
        }
        Update: {
          artist_id?: string
          assigned_coach_id?: string | null
          assigned_to?: Database["public"]["Enums"]["task_assignee"]
          completed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_completed?: boolean
          is_recurring?: boolean
          milestone_id?: string | null
          on_wtf?: boolean
          parent_task_id?: string | null
          push_reason?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wtf_priority?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_builder_transcripts: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          messages: Json
          vision_id: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          messages?: Json
          vision_id?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          messages?: Json
          vision_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_builder_transcripts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_builder_transcripts_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "visions"
            referencedColumns: ["id"]
          },
        ]
      }
      visions: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_current: boolean
          statement_text: string
          updated_at: string
          version: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_current?: boolean
          statement_text?: string
          updated_at?: string
          version?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_current?: boolean
          statement_text?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "visions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      wtfs: {
        Row: {
          artist_id: string
          created_at: string
          generated_at: string
          id: string
          payload: Json
          status: string
          week_start: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          generated_at?: string
          id?: string
          payload?: Json
          status?: string
          week_start: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          payload?: Json
          status?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "wtfs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_artist_id: { Args: never; Returns: string }
    }
    Enums: {
      account_type: "artist" | "coach"
      artist_status:
        | "awaiting_match"
        | "active"
        | "graduated"
        | "paused"
        | "departed"
      artist_tier: "free" | "self_serve" | "diy" | "dwy"
      goal_category:
        | "revenue_generating"
        | "audience_size"
        | "team"
        | "catalog"
        | "recognition_awards"
      release_assignee: "artist" | "producer" | "both" | "unassigned"
      release_type: "single" | "project"
      task_assignee: "artist" | "coach" | "both"
      task_status: "pending" | "completed" | "pushed" | "complete_and_push"
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
      account_type: ["artist", "coach"],
      artist_status: [
        "awaiting_match",
        "active",
        "graduated",
        "paused",
        "departed",
      ],
      artist_tier: ["free", "self_serve", "diy", "dwy"],
      goal_category: [
        "revenue_generating",
        "audience_size",
        "team",
        "catalog",
        "recognition_awards",
      ],
      release_assignee: ["artist", "producer", "both", "unassigned"],
      release_type: ["single", "project"],
      task_assignee: ["artist", "coach", "both"],
      task_status: ["pending", "completed", "pushed", "complete_and_push"],
    },
  },
} as const
