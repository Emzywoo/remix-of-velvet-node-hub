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
      earnings_snapshots: {
        Row: {
          created_at: string
          gb_processed: number
          id: string
          jobs_completed: number
          snapshot_date: string
          total_coins: number
          user_id: string
        }
        Insert: {
          created_at?: string
          gb_processed?: number
          id?: string
          jobs_completed?: number
          snapshot_date: string
          total_coins?: number
          user_id: string
        }
        Update: {
          created_at?: string
          gb_processed?: number
          id?: string
          jobs_completed?: number
          snapshot_date?: string
          total_coins?: number
          user_id?: string
        }
        Relationships: []
      }
      network_config: {
        Row: {
          active_miners: number
          base_rate_per_gb: number
          coin_to_usd_rate: number
          id: number
          minimum_payout_usd: number
          monthly_pool_usd: number
        }
        Insert: {
          active_miners?: number
          base_rate_per_gb?: number
          coin_to_usd_rate?: number
          id?: number
          minimum_payout_usd?: number
          monthly_pool_usd?: number
        }
        Update: {
          active_miners?: number
          base_rate_per_gb?: number
          coin_to_usd_rate?: number
          id?: number
          minimum_payout_usd?: number
          monthly_pool_usd?: number
        }
        Relationships: []
      }
      nodes: {
        Row: {
          active_jobs: number
          created_at: string
          cumulative_coins: number
          cumulative_jobs: number
          id: string
          label: string
          last_seen: string | null
          latency_ms: number
          miner_token: string
          region: string
          status: string
          tier: number
          updated_at: string
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          active_jobs?: number
          created_at?: string
          cumulative_coins?: number
          cumulative_jobs?: number
          id?: string
          label?: string
          last_seen?: string | null
          latency_ms?: number
          miner_token: string
          region?: string
          status?: string
          tier?: number
          updated_at?: string
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          active_jobs?: number
          created_at?: string
          cumulative_coins?: number
          cumulative_jobs?: number
          id?: string
          label?: string
          last_seen?: string | null
          latency_ms?: number
          miner_token?: string
          region?: string
          status?: string
          tier?: number
          updated_at?: string
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: []
      }
      payout_methods: {
        Row: {
          created_at: string
          destination: string
          id: string
          is_default: boolean
          method: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination: string
          id?: string
          is_default?: boolean
          method: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          is_default?: boolean
          method?: string
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_usd: number
          created_at: string
          destination: string
          id: string
          method: string
          status: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          destination: string
          id?: string
          method: string
          status?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notify_offline: boolean
          notify_payout: boolean
          notify_tier: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notify_offline?: boolean
          notify_payout?: boolean
          notify_tier?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notify_offline?: boolean
          notify_payout?: boolean
          notify_tier?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard_public: {
        Args: { _scope?: string; _viewer_id: string }
        Returns: {
          country: string
          is_me: boolean
          masked_id: string
          tier: number
          usd: number
          user_id: string
        }[]
      }
      get_network_stats_public: {
        Args: never
        Returns: {
          active_miners: number
          avg_monthly_usd: number
          monthly_pool_usd: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
