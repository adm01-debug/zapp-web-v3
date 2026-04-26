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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          abandoned_at: string
          attempt_count: number
          contact_id: string
          created_at: string
          currency: string
          external_cart_id: string | null
          id: string
          items: Json
          last_attempt_at: string | null
          metadata: Json | null
          recovered_at: string | null
          recovery_value: number | null
          source: string
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          abandoned_at?: string
          attempt_count?: number
          contact_id: string
          created_at?: string
          currency?: string
          external_cart_id?: string | null
          id?: string
          items?: Json
          last_attempt_at?: string | null
          metadata?: Json | null
          recovered_at?: string | null
          recovery_value?: number | null
          source?: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          abandoned_at?: string
          attempt_count?: number
          contact_id?: string
          created_at?: string
          currency?: string
          external_cart_id?: string | null
          id?: string
          items?: Json
          last_attempt_at?: string | null
          metadata?: Json | null
          recovered_at?: string | null
          recovery_value?: number | null
          source?: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          earned_at: string
          id: string
          profile_id: string
          xp_earned: number
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          earned_at?: string
          id?: string
          profile_id: string
          xp_earned?: number
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          earned_at?: string
          id?: string
          profile_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          skill_level: number | null
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          skill_level?: number | null
          skill_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          skill_level?: number | null
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_stats: {
        Row: {
          achievements_count: number
          avg_response_time_seconds: number | null
          best_streak: number
          conversations_resolved: number
          created_at: string
          current_streak: number
          customer_satisfaction_score: number | null
          id: string
          level: number
          messages_received: number
          messages_sent: number
          profile_id: string
          updated_at: string
          xp: number
        }
        Insert: {
          achievements_count?: number
          avg_response_time_seconds?: number | null
          best_streak?: number
          conversations_resolved?: number
          created_at?: string
          current_streak?: number
          customer_satisfaction_score?: number | null
          id?: string
          level?: number
          messages_received?: number
          messages_sent?: number
          profile_id: string
          updated_at?: string
          xp?: number
        }
        Update: {
          achievements_count?: number
          avg_response_time_seconds?: number | null
          best_streak?: number
          conversations_resolved?: number
          created_at?: string
          current_streak?: number
          customer_satisfaction_score?: number | null
          id?: string
          level?: number
          messages_received?: number
          messages_sent?: number
          profile_id?: string
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_visibility_grants: {
        Row: {
          agent_id: string
          can_see_agent_id: string
          created_at: string
          granted_by: string | null
          id: string
        }
        Insert: {
          agent_id: string
          can_see_agent_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          can_see_agent_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_visibility_grants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_visibility_grants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_visibility_grants_can_see_agent_id_fkey"
            columns: ["can_see_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_visibility_grants_can_see_agent_id_fkey"
            columns: ["can_see_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_visibility_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_visibility_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_contact_pauses: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          paused_by: string | null
          paused_until: string
          reason: string | null
          remote_jid: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          paused_by?: string | null
          paused_until: string
          reason?: string | null
          remote_jid: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          paused_by?: string | null
          paused_until?: string
          reason?: string | null
          remote_jid?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_contact_pauses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_contact_pauses_paused_by_fkey"
            columns: ["paused_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_contact_pauses_paused_by_fkey"
            columns: ["paused_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          name: string
          started_at: string
          traffic_split: number
          updated_at: string
          variant_a_id: string
          variant_b_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          started_at?: string
          traffic_split?: number
          updated_at?: string
          variant_a_id: string
          variant_b_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          started_at?: string
          traffic_split?: number
          updated_at?: string
          variant_a_id?: string
          variant_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_experiments_variant_a_id_fkey"
            columns: ["variant_a_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_experiments_variant_b_id_fkey"
            columns: ["variant_b_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_knowledge: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_knowledge_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_runs: {
        Row: {
          agent_id: string
          confidence: number | null
          contact_remote_jid: string
          created_at: string
          decision: Database["public"]["Enums"]["ai_agent_decision"]
          error_message: string | null
          escalation_reason: string | null
          experiment_id: string | null
          human_feedback: string | null
          human_feedback_at: string | null
          human_feedback_by: string | null
          human_feedback_note: string | null
          id: string
          input_tokens: number | null
          instance_name: string | null
          latency_ms: number | null
          metadata: Json | null
          model_used: string | null
          output_tokens: number | null
          reply_content: string | null
          total_tokens: number | null
          trigger_message_id: string | null
          turns_count: number | null
          variant: string | null
        }
        Insert: {
          agent_id: string
          confidence?: number | null
          contact_remote_jid: string
          created_at?: string
          decision: Database["public"]["Enums"]["ai_agent_decision"]
          error_message?: string | null
          escalation_reason?: string | null
          experiment_id?: string | null
          human_feedback?: string | null
          human_feedback_at?: string | null
          human_feedback_by?: string | null
          human_feedback_note?: string | null
          id?: string
          input_tokens?: number | null
          instance_name?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          model_used?: string | null
          output_tokens?: number | null
          reply_content?: string | null
          total_tokens?: number | null
          trigger_message_id?: string | null
          turns_count?: number | null
          variant?: string | null
        }
        Update: {
          agent_id?: string
          confidence?: number | null
          contact_remote_jid?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["ai_agent_decision"]
          error_message?: string | null
          escalation_reason?: string | null
          experiment_id?: string | null
          human_feedback?: string | null
          human_feedback_at?: string | null
          human_feedback_by?: string | null
          human_feedback_note?: string | null
          id?: string
          input_tokens?: number | null
          instance_name?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          model_used?: string | null
          output_tokens?: number | null
          reply_content?: string | null
          total_tokens?: number | null
          trigger_message_id?: string | null
          turns_count?: number | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_runs_human_feedback_by_fkey"
            columns: ["human_feedback_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_runs_human_feedback_by_fkey"
            columns: ["human_feedback_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          auto_pause_on_degradation: boolean
          business_hours_only: boolean
          created_at: string
          created_by: string | null
          daily_token_budget: number
          description: string | null
          escalation_keywords: string[]
          forbidden_topics: string[]
          id: string
          instance_name: string | null
          intent_keywords: string[]
          is_active: boolean
          max_turns: number
          min_confidence: number
          min_seconds_between_replies: number
          mode: Database["public"]["Enums"]["ai_agent_mode"]
          model: string
          name: string
          persona: string
          priority: number
          queue_id: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          auto_pause_on_degradation?: boolean
          business_hours_only?: boolean
          created_at?: string
          created_by?: string | null
          daily_token_budget?: number
          description?: string | null
          escalation_keywords?: string[]
          forbidden_topics?: string[]
          id?: string
          instance_name?: string | null
          intent_keywords?: string[]
          is_active?: boolean
          max_turns?: number
          min_confidence?: number
          min_seconds_between_replies?: number
          mode?: Database["public"]["Enums"]["ai_agent_mode"]
          model?: string
          name: string
          persona?: string
          priority?: number
          queue_id?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          auto_pause_on_degradation?: boolean
          business_hours_only?: boolean
          created_at?: string
          created_by?: string | null
          daily_token_budget?: number
          description?: string | null
          escalation_keywords?: string[]
          forbidden_topics?: string[]
          id?: string
          instance_name?: string | null
          intent_keywords?: string[]
          is_active?: boolean
          max_turns?: number
          min_confidence?: number
          min_seconds_between_replies?: number
          mode?: Database["public"]["Enums"]["ai_agent_mode"]
          model?: string
          name?: string
          persona?: string
          priority?: number
          queue_id?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_autonomous_resolutions: {
        Row: {
          confidence: number | null
          contact_id: string
          created_at: string
          csat_completed_at: string | null
          csat_feedback: string | null
          csat_rating: number | null
          customer_confirmed: boolean | null
          flow_id: string | null
          id: string
          matched_article: string | null
          messages_count: number | null
          resolution_message: string | null
          resolved_at: string | null
          state: string
          transfer_reason: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          contact_id: string
          created_at?: string
          csat_completed_at?: string | null
          csat_feedback?: string | null
          csat_rating?: number | null
          customer_confirmed?: boolean | null
          flow_id?: string | null
          id?: string
          matched_article?: string | null
          messages_count?: number | null
          resolution_message?: string | null
          resolved_at?: string | null
          state?: string
          transfer_reason?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          contact_id?: string
          created_at?: string
          csat_completed_at?: string | null
          csat_feedback?: string | null
          csat_rating?: number | null
          customer_confirmed?: boolean | null
          flow_id?: string | null
          id?: string
          matched_article?: string | null
          messages_count?: number | null
          resolution_message?: string | null
          resolved_at?: string | null
          state?: string
          transfer_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_autonomous_resolutions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_autonomous_resolutions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_tags: {
        Row: {
          confidence: number | null
          contact_id: string
          created_at: string | null
          id: string
          source: string | null
          tag_name: string
        }
        Insert: {
          confidence?: number | null
          contact_id: string
          created_at?: string | null
          id?: string
          source?: string | null
          tag_name: string
        }
        Update: {
          confidence?: number | null
          contact_id?: string
          created_at?: string | null
          id?: string
          source?: string | null
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          api_endpoint: string | null
          api_key_secret_name: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          model: string | null
          name: string
          provider_type: Database["public"]["Enums"]["ai_provider_type"]
          system_prompt: string | null
          updated_at: string
          use_for: string[]
        }
        Insert: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          model?: string | null
          name: string
          provider_type?: Database["public"]["Enums"]["ai_provider_type"]
          system_prompt?: string | null
          updated_at?: string
          use_for?: string[]
        }
        Update: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          model?: string | null
          name?: string
          provider_type?: Database["public"]["Enums"]["ai_provider_type"]
          system_prompt?: string | null
          updated_at?: string
          use_for?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "ai_providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          profile_id: string | null
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          profile_id?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          profile_id?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_countries: {
        Row: {
          added_by: string | null
          country_code: string
          country_name: string
          created_at: string
          id: string
        }
        Insert: {
          added_by?: string | null
          country_code: string
          country_name: string
          created_at?: string
          id?: string
        }
        Update: {
          added_by?: string | null
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      audio_memes: {
        Row: {
          audio_url: string
          category: string
          created_at: string
          duration_seconds: number | null
          id: string
          is_favorite: boolean
          name: string
          uploaded_by: string | null
          use_count: number
        }
        Insert: {
          audio_url: string
          category?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_favorite?: boolean
          name: string
          uploaded_by?: string | null
          use_count?: number
        }
        Update: {
          audio_url?: string
          category?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_favorite?: boolean
          name?: string
          uploaded_by?: string | null
          use_count?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      auto_close_config: {
        Row: {
          close_message: string | null
          created_at: string
          id: string
          inactivity_hours: number
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          close_message?: string | null
          created_at?: string
          id?: string
          inactivity_hours?: number
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          close_message?: string | null
          created_at?: string
          id?: string
          inactivity_hours?: number
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_close_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_close_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          actions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          trigger_config: Json
          trigger_count: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      away_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_enabled: boolean | null
          updated_at: string
          whatsapp_connection_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          whatsapp_connection_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "away_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "away_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "away_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "away_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_countries: {
        Row: {
          blocked_by: string | null
          country_code: string
          country_name: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          is_permanent: boolean | null
          last_attempt_at: string | null
          reason: string
          request_count: number | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          is_permanent?: boolean | null
          last_attempt_at?: string | null
          reason: string
          request_count?: number | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_permanent?: boolean | null
          last_attempt_at?: string | null
          reason?: string
          request_count?: number | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          close_time: string | null
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
          updated_at: string
          whatsapp_connection_id: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string
          whatsapp_connection_id: string
        }
        Update: {
          close_time?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          contact_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          recording_url: string | null
          started_at: string
          status: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id?: string | null
          answered_at?: string | null
          contact_id?: string | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ab_variants: {
        Row: {
          campaign_id: string
          created_at: string
          delivered_count: number | null
          id: string
          is_winner: boolean | null
          media_url: string | null
          message_content: string
          read_count: number | null
          response_count: number | null
          send_count: number | null
          variant_name: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivered_count?: number | null
          id?: string
          is_winner?: boolean | null
          media_url?: string | null
          message_content: string
          read_count?: number | null
          response_count?: number | null
          send_count?: number | null
          variant_name?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivered_count?: number | null
          id?: string
          is_winner?: boolean | null
          media_url?: string | null
          message_content?: string
          read_count?: number | null
          response_count?: number | null
          send_count?: number | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ab_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          description: string | null
          failed_count: number
          id: string
          media_url: string | null
          message_content: string
          message_type: string
          name: string
          read_count: number
          scheduled_at: string | null
          send_interval_seconds: number | null
          sent_count: number
          started_at: string | null
          status: string
          target_filter: Json | null
          target_type: string
          total_contacts: number
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          description?: string | null
          failed_count?: number
          id?: string
          media_url?: string | null
          message_content: string
          message_type?: string
          name: string
          read_count?: number
          scheduled_at?: string | null
          send_interval_seconds?: number | null
          sent_count?: number
          started_at?: string | null
          status?: string
          target_filter?: Json | null
          target_type?: string
          total_contacts?: number
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          description?: string | null
          failed_count?: number
          id?: string
          media_url?: string | null
          message_content?: string
          message_type?: string
          name?: string
          read_count?: number
          scheduled_at?: string | null
          send_interval_seconds?: number | null
          sent_count?: number
          started_at?: string | null
          status?: string
          target_filter?: Json | null
          target_type?: string
          total_contacts?: number
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_recovery_attempts: {
        Row: {
          attempt_number: number
          cart_id: string
          channel: string
          clicked: boolean | null
          created_at: string
          delivered: boolean | null
          id: string
          message_content: string | null
          opened: boolean | null
          outcome: string | null
          responded: boolean | null
          response_at: string | null
          sent_at: string
          template_id: string | null
        }
        Insert: {
          attempt_number: number
          cart_id: string
          channel?: string
          clicked?: boolean | null
          created_at?: string
          delivered?: boolean | null
          id?: string
          message_content?: string | null
          opened?: boolean | null
          outcome?: string | null
          responded?: boolean | null
          response_at?: string | null
          sent_at?: string
          template_id?: string | null
        }
        Update: {
          attempt_number?: number
          cart_id?: string
          channel?: string
          clicked?: boolean | null
          created_at?: string
          delivered?: boolean | null
          id?: string
          message_content?: string | null
          opened?: boolean | null
          outcome?: string | null
          responded?: boolean | null
          response_at?: string | null
          sent_at?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_recovery_attempts_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "abandoned_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_recovery_templates: {
        Row: {
          channel: string
          conversion_count: number
          created_at: string
          created_by: string | null
          discount_code: string | null
          discount_percent: number | null
          id: string
          is_active: boolean
          language: string
          message_content: string
          name: string
          stage: string
          updated_at: string
          use_count: number
        }
        Insert: {
          channel?: string
          conversion_count?: number
          created_at?: string
          created_by?: string | null
          discount_code?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          language?: string
          message_content: string
          name: string
          stage: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          channel?: string
          conversion_count?: number
          created_at?: string
          created_by?: string | null
          discount_code?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          language?: string
          message_content?: string
          name?: string
          stage?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_recovery_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_recovery_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_connections: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          config: Json | null
          created_at: string
          created_by: string | null
          credentials: Json | null
          external_account_id: string | null
          external_page_id: string | null
          id: string
          is_active: boolean | null
          name: string
          status: string
          updated_at: string
          webhook_url: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          config?: Json | null
          created_at?: string
          created_by?: string | null
          credentials?: Json | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          config?: Json | null
          created_at?: string
          created_by?: string | null
          credentials?: Json | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_provider_routes: {
        Row: {
          channel_connection_id: string | null
          created_at: string
          current_provider_id: string | null
          fallback_provider_id: string | null
          id: string
          primary_provider_id: string
          switched_at: string | null
          switched_reason: string | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_connection_id?: string | null
          created_at?: string
          current_provider_id?: string | null
          fallback_provider_id?: string | null
          id?: string
          primary_provider_id: string
          switched_at?: string | null
          switched_reason?: string | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_connection_id?: string | null
          created_at?: string
          current_provider_id?: string | null
          fallback_provider_id?: string | null
          id?: string
          primary_provider_id?: string
          switched_at?: string | null
          switched_reason?: string | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_provider_routes_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_current_provider_id_fkey"
            columns: ["current_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_fallback_provider_id_fkey"
            columns: ["fallback_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_provider_routes_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_queues: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          priority: number
          queue_id: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          queue_id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          queue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_queues_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "service_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_queues_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_routing_rules: {
        Row: {
          channel_connection_id: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          conditions: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          priority: number | null
          queue_id: string | null
        }
        Insert: {
          channel_connection_id?: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          queue_id?: string | null
        }
        Update: {
          channel_connection_id?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          queue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_routing_rules_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_routing_rules_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_routing_rules_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_executions: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          current_node_id: string | null
          error_message: string | null
          flow_id: string
          id: string
          started_at: string
          status: string
          variables: Json | null
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          started_at?: string
          status?: string
          variables?: Json | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          started_at?: string
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          edges: Json
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          nodes: Json
          trigger_type: string
          trigger_value: string | null
          updated_at: string
          variables: Json | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          nodes?: Json
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
          variables?: Json | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          nodes?: Json
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
          variables?: Json | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      client_wallet_rules: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_wallet_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wallet_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wallet_rules_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wallet_rules_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wallet_rules_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wallet_rules_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_action_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          instance: string
          metadata: Json | null
          request_id: string | null
          status: string
          triggered_by: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          instance: string
          metadata?: Json | null
          request_id?: string | null
          status?: string
          triggered_by?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          instance?: string
          metadata?: Json | null
          request_id?: string | null
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      connection_alert_preferences: {
        Row: {
          alert_on_degraded: boolean
          alert_on_disconnected: boolean
          created_at: string
          email_enabled: boolean
          id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_on_degraded?: boolean
          alert_on_disconnected?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_on_degraded?: boolean
          alert_on_disconnected?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connection_health_logs: {
        Row: {
          checked_at: string
          connection_id: string
          error_message: string | null
          id: string
          instance_id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          connection_id: string
          error_message?: string | null
          id?: string
          instance_id: string
          response_time_ms?: number | null
          status?: string
        }
        Update: {
          checked_at?: string
          connection_id?: string
          error_message?: string | null
          id?: string
          instance_id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_health_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_health_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_health_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_health_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_recovery_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          error_message: string | null
          id: string
          instance_id: string
          instance_name: string | null
          success: boolean
          triggered_by: string
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id: string
          instance_name?: string | null
          success?: boolean
          triggered_by?: string
        }
        Update: {
          attempted_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string
          instance_name?: string | null
          success?: boolean
          triggered_by?: string
        }
        Relationships: []
      }
      connection_status_audit: {
        Row: {
          avg_latency_ms: number | null
          connected_count: number
          created_at: string
          created_by: string | null
          disconnected_count: number
          id: string
          new_status: string
          online: boolean
          pending_count: number
          previous_status: string | null
          trigger_reason: string
        }
        Insert: {
          avg_latency_ms?: number | null
          connected_count?: number
          created_at?: string
          created_by?: string | null
          disconnected_count?: number
          id?: string
          new_status: string
          online: boolean
          pending_count?: number
          previous_status?: string | null
          trigger_reason: string
        }
        Update: {
          avg_latency_ms?: number | null
          connected_count?: number
          created_at?: string
          created_by?: string | null
          disconnected_count?: number
          id?: string
          new_status?: string
          online?: boolean
          pending_count?: number
          previous_status?: string | null
          trigger_reason?: string
        }
        Relationships: []
      }
      contact_custom_fields: {
        Row: {
          contact_id: string
          created_at: string
          field_name: string
          field_type: string
          field_value: string | null
          id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          field_name: string
          field_type?: string
          field_value?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          field_name?: string
          field_type?: string
          field_value?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_custom_fields_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          author_id: string
          contact_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          contact_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_purchases: {
        Row: {
          amount: number | null
          contact_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          deal_id: string | null
          description: string | null
          id: string
          purchase_type: string | null
          purchased_at: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          purchase_type?: string | null
          purchased_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          purchase_type?: string | null
          purchased_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_purchases_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_purchases_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          ai_priority: string | null
          ai_sentiment: string | null
          assigned_to: string | null
          avatar_url: string | null
          channel_connection_id: string | null
          channel_type: string | null
          company: string | null
          consent_status: string | null
          contact_type: string | null
          created_at: string
          email: string | null
          group_category: string | null
          id: string
          job_title: string | null
          lead_origin: string | null
          lead_score: number | null
          name: string
          nickname: string | null
          notes: string | null
          phone: string
          queue_id: string | null
          risk_score: number | null
          surname: string | null
          tags: string[] | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          ai_priority?: string | null
          ai_sentiment?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          channel_connection_id?: string | null
          channel_type?: string | null
          company?: string | null
          consent_status?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          group_category?: string | null
          id?: string
          job_title?: string | null
          lead_origin?: string | null
          lead_score?: number | null
          name: string
          nickname?: string | null
          notes?: string | null
          phone: string
          queue_id?: string | null
          risk_score?: number | null
          surname?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          ai_priority?: string | null
          ai_sentiment?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          channel_connection_id?: string | null
          channel_type?: string | null
          company?: string | null
          consent_status?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          group_category?: string | null
          id?: string
          job_title?: string | null
          lead_origin?: string | null
          lead_score?: number | null
          name?: string
          nickname?: string | null
          notes?: string | null
          phone?: string
          queue_id?: string | null
          risk_score?: number | null
          surname?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_analyses: {
        Row: {
          analyzed_by: string | null
          contact_id: string
          created_at: string
          customer_satisfaction: number | null
          department: string | null
          id: string
          key_points: string[] | null
          message_count: number | null
          next_steps: string[] | null
          relationship_type: string | null
          sentiment: string
          sentiment_score: number | null
          status: string
          summary: string
          topics: string[] | null
          urgency: string | null
        }
        Insert: {
          analyzed_by?: string | null
          contact_id: string
          created_at?: string
          customer_satisfaction?: number | null
          department?: string | null
          id?: string
          key_points?: string[] | null
          message_count?: number | null
          next_steps?: string[] | null
          relationship_type?: string | null
          sentiment?: string
          sentiment_score?: number | null
          status?: string
          summary: string
          topics?: string[] | null
          urgency?: string | null
        }
        Update: {
          analyzed_by?: string | null
          contact_id?: string
          created_at?: string
          customer_satisfaction?: number | null
          department?: string | null
          id?: string
          key_points?: string[] | null
          message_count?: number | null
          next_steps?: string[] | null
          relationship_type?: string | null
          sentiment?: string
          sentiment_score?: number | null
          status?: string
          summary?: string
          topics?: string[] | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analyses_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_analyses_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_analyses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_closures: {
        Row: {
          classification: string | null
          close_reason: string
          closed_by: string | null
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          outcome: string | null
        }
        Insert: {
          classification?: string | null
          close_reason: string
          closed_by?: string | null
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          classification?: string | null
          close_reason?: string
          closed_by?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_closures_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_events: {
        Row: {
          contact_id: string
          created_at: string
          event_type: string
          from_agent_id: string | null
          from_queue_id: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          performed_by: string | null
          provider_message_log_id: string | null
          thread_id: string | null
          to_agent_id: string | null
          to_queue_id: string | null
          trace_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_type: string
          from_agent_id?: string | null
          from_queue_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          performed_by?: string | null
          provider_message_log_id?: string | null
          thread_id?: string | null
          to_agent_id?: string | null
          to_queue_id?: string | null
          trace_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_type?: string
          from_agent_id?: string | null
          from_queue_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          performed_by?: string | null
          provider_message_log_id?: string | null
          thread_id?: string | null
          to_agent_id?: string | null
          to_queue_id?: string | null
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_from_queue_id_fkey"
            columns: ["from_queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_to_queue_id_fkey"
            columns: ["to_queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_memory: {
        Row: {
          commercial_summary: string | null
          contact_id: string
          created_at: string
          cumulative_summary: string | null
          facts: Json | null
          id: string
          objections_handled: Json | null
          pending_items: Json | null
          promises_made: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commercial_summary?: string | null
          contact_id: string
          created_at?: string
          cumulative_summary?: string | null
          facts?: Json | null
          id?: string
          objections_handled?: Json | null
          pending_items?: Json | null
          promises_made?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commercial_summary?: string | null
          contact_id?: string
          created_at?: string
          cumulative_summary?: string | null
          facts?: Json | null
          id?: string
          objections_handled?: Json | null
          pending_items?: Json | null
          promises_made?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_memory_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_memory_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          created_at: string
          external_actor_id: string | null
          id: string
          joined_at: string
          left_at: string | null
          metadata: Json
          participant_type: string
          profile_id: string | null
          reason_left: string | null
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          external_actor_id?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          metadata?: Json
          participant_type: string
          profile_id?: string | null
          reason_left?: string | null
          role?: string
          thread_id: string
        }
        Update: {
          created_at?: string
          external_actor_id?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          metadata?: Json
          participant_type?: string
          profile_id?: string | null
          reason_left?: string | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_qa_scores: {
        Row: {
          agent_id: string | null
          clarity_score: number | null
          compliance_score: number | null
          contact_id: string
          created_at: string
          efficiency_score: number | null
          empathy_score: number | null
          id: string
          improvements: string[] | null
          message_count: number | null
          model: string | null
          overall_score: number
          resolution_score: number | null
          strengths: string[] | null
          summary: string | null
          tone_score: number | null
        }
        Insert: {
          agent_id?: string | null
          clarity_score?: number | null
          compliance_score?: number | null
          contact_id: string
          created_at?: string
          efficiency_score?: number | null
          empathy_score?: number | null
          id?: string
          improvements?: string[] | null
          message_count?: number | null
          model?: string | null
          overall_score: number
          resolution_score?: number | null
          strengths?: string[] | null
          summary?: string | null
          tone_score?: number | null
        }
        Update: {
          agent_id?: string | null
          clarity_score?: number | null
          compliance_score?: number | null
          contact_id?: string
          created_at?: string
          efficiency_score?: number | null
          empathy_score?: number | null
          id?: string
          improvements?: string[] | null
          message_count?: number | null
          model?: string | null
          overall_score?: number
          resolution_score?: number | null
          strengths?: string[] | null
          summary?: string | null
          tone_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_qa_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_qa_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sla: {
        Row: {
          contact_id: string | null
          created_at: string
          first_message_at: string
          first_response_at: string | null
          first_response_breached: boolean | null
          id: string
          resolution_breached: boolean | null
          resolved_at: string | null
          sla_configuration_id: string | null
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          first_message_at?: string
          first_response_at?: string | null
          first_response_breached?: boolean | null
          id?: string
          resolution_breached?: boolean | null
          resolved_at?: string | null
          sla_configuration_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          first_message_at?: string
          first_response_at?: string | null
          first_response_breached?: boolean | null
          id?: string
          resolution_breached?: boolean | null
          resolved_at?: string | null
          sla_configuration_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sla_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sla_sla_configuration_id_fkey"
            columns: ["sla_configuration_id"]
            isOneToOne: false
            referencedRelation: "sla_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_snoozes: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          reason: string | null
          snooze_until: string
          snoozed_by: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          reason?: string | null
          snooze_until: string
          snoozed_by: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          snooze_until?: string
          snoozed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_snoozes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_snoozes_snoozed_by_fkey"
            columns: ["snoozed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_snoozes_snoozed_by_fkey"
            columns: ["snoozed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          channel: string
          created_at: string
          external_contact_id: string
          external_conversation_id: string | null
          health_score: number | null
          id: string
          instance_name: string
          last_event_at: string | null
          last_event_type: string | null
          message_count: number
          metadata: Json
          remote_jid: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          external_contact_id: string
          external_conversation_id?: string | null
          health_score?: number | null
          id?: string
          instance_name?: string
          last_event_at?: string | null
          last_event_type?: string | null
          message_count?: number
          metadata?: Json
          remote_jid: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          external_contact_id?: string
          external_conversation_id?: string | null
          health_score?: number | null
          id?: string
          instance_name?: string
          last_event_at?: string | null
          last_event_type?: string | null
          message_count?: number
          metadata?: Json
          remote_jid?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      crisis_room_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          message: string
          metric_name: string
          metric_value: number | null
          severity: string
          threshold: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message: string
          metric_name: string
          metric_value?: number | null
          severity?: string
          threshold?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string
          metric_name?: string
          metric_value?: number | null
          severity?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crisis_room_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_room_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_auto_config: {
        Row: {
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_enabled: boolean | null
          message_template: string | null
          updated_at: string | null
          updated_by: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_enabled?: boolean | null
          message_template?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_enabled?: boolean | null
          message_template?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csat_auto_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_auto_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_auto_config_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_auto_config_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_auto_config_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_auto_config_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_surveys: {
        Row: {
          agent_id: string
          contact_id: string
          conversation_resolved_at: string | null
          created_at: string
          feedback: string | null
          id: string
          rating: number
        }
        Insert: {
          agent_id: string
          contact_id: string
          conversation_resolved_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          rating: number
        }
        Update: {
          agent_id?: string
          contact_id?: string
          conversation_resolved_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "csat_surveys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_surveys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_surveys_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_emojis: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          image_url: string
          is_favorite: boolean | null
          name: string
          updated_at: string | null
          uploaded_by: string | null
          use_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_favorite?: boolean | null
          name: string
          updated_at?: string | null
          uploaded_by?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_favorite?: boolean | null
          name?: string
          updated_at?: string | null
          uploaded_by?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      deal_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          deal_id: string
          description: string | null
          id: string
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          deal_id: string
          description?: string | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          deal_id?: string
          description?: string | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_error_logs: {
        Row: {
          agent_email: string | null
          agent_user_id: string | null
          channel_type: string | null
          context: Json | null
          created_at: string
          error_code: string | null
          error_message: string | null
          failed_message_id: string | null
          http_status: number | null
          id: string
          instance_name: string
          occurred_at: string
          payload: Json | null
          remote_jid: string | null
          retry_count: number
        }
        Insert: {
          agent_email?: string | null
          agent_user_id?: string | null
          channel_type?: string | null
          context?: Json | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          failed_message_id?: string | null
          http_status?: number | null
          id?: string
          instance_name: string
          occurred_at?: string
          payload?: Json | null
          remote_jid?: string | null
          retry_count?: number
        }
        Update: {
          agent_email?: string | null
          agent_user_id?: string | null
          channel_type?: string | null
          context?: Json | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          failed_message_id?: string | null
          http_status?: number | null
          id?: string
          instance_name?: string
          occurred_at?: string
          payload?: Json | null
          remote_jid?: string | null
          retry_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_error_logs_failed_message_id_fkey"
            columns: ["failed_message_id"]
            isOneToOne: false
            referencedRelation: "failed_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_labels: {
        Row: {
          color: string | null
          created_at: string
          gmail_account_id: string
          gmail_label_id: string
          id: string
          label_type: string
          message_count: number
          name: string
          unread_count: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          gmail_account_id: string
          gmail_label_id: string
          id?: string
          label_type?: string
          message_count?: number
          name: string
          unread_count?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          gmail_account_id?: string
          gmail_label_id?: string
          id?: string
          label_type?: string
          message_count?: number
          name?: string
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_labels_gmail_account_id_fkey"
            columns: ["gmail_account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_labels_gmail_account_id_fkey"
            columns: ["gmail_account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          bcc_addresses: string[]
          body_html: string
          body_text: string
          cc_addresses: string[]
          created_at: string
          direction: string
          from_address: string
          from_name: string | null
          gmail_account_id: string
          gmail_message_id: string
          has_attachments: boolean
          id: string
          in_reply_to: string | null
          internal_date: string
          is_read: boolean
          is_starred: boolean
          label_ids: string[]
          references_header: string | null
          reply_to_address: string | null
          snippet: string
          subject: string
          thread_id: string
          to_addresses: string[]
        }
        Insert: {
          bcc_addresses?: string[]
          body_html?: string
          body_text?: string
          cc_addresses?: string[]
          created_at?: string
          direction?: string
          from_address?: string
          from_name?: string | null
          gmail_account_id: string
          gmail_message_id: string
          has_attachments?: boolean
          id?: string
          in_reply_to?: string | null
          internal_date?: string
          is_read?: boolean
          is_starred?: boolean
          label_ids?: string[]
          references_header?: string | null
          reply_to_address?: string | null
          snippet?: string
          subject?: string
          thread_id: string
          to_addresses?: string[]
        }
        Update: {
          bcc_addresses?: string[]
          body_html?: string
          body_text?: string
          cc_addresses?: string[]
          created_at?: string
          direction?: string
          from_address?: string
          from_name?: string | null
          gmail_account_id?: string
          gmail_message_id?: string
          has_attachments?: boolean
          id?: string
          in_reply_to?: string | null
          internal_date?: string
          is_read?: boolean
          is_starred?: boolean
          label_ids?: string[]
          references_header?: string | null
          reply_to_address?: string | null
          snippet?: string
          subject?: string
          thread_id?: string
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_gmail_account_id_fkey"
            columns: ["gmail_account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_gmail_account_id_fkey"
            columns: ["gmail_account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          gmail_account_id: string
          gmail_thread_id: string
          id: string
          is_important: boolean
          is_starred: boolean
          is_unread: boolean
          label_ids: string[]
          last_message_at: string
          message_count: number
          priority: string
          snippet: string
          status: string
          subject: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          gmail_account_id: string
          gmail_thread_id: string
          id?: string
          is_important?: boolean
          is_starred?: boolean
          is_unread?: boolean
          label_ids?: string[]
          last_message_at?: string
          message_count?: number
          priority?: string
          snippet?: string
          status?: string
          subject?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          gmail_account_id?: string
          gmail_thread_id?: string
          id?: string
          is_important?: boolean
          is_starred?: boolean
          is_unread?: boolean
          label_ids?: string[]
          last_message_at?: string
          message_count?: number
          priority?: string
          snippet?: string
          status?: string
          subject?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_gmail_account_id_fkey"
            columns: ["gmail_account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_gmail_account_id_fkey"
            columns: ["gmail_account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string
          data: Json
          entity_id: string
          entity_type: string
          id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          data?: Json
          entity_id: string
          entity_type: string
          id?: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          data?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          version_number?: number
        }
        Relationships: []
      }
      evolution_fallback_events: {
        Row: {
          action: string
          created_at: string
          endpoint: string
          fallback_target: string
          id: string
          instance: string | null
          mode: string
          primary_ms: number | null
          reason: string
          status: number
          ts: string
        }
        Insert: {
          action: string
          created_at?: string
          endpoint: string
          fallback_target: string
          id?: string
          instance?: string | null
          mode?: string
          primary_ms?: number | null
          reason: string
          status: number
          ts?: string
        }
        Update: {
          action?: string
          created_at?: string
          endpoint?: string
          fallback_target?: string
          id?: string
          instance?: string | null
          mode?: string
          primary_ms?: number | null
          reason?: string
          status?: number
          ts?: string
        }
        Relationships: []
      }
      evolution_incidents: {
        Row: {
          created_at: string
          details: Json | null
          http_status: number | null
          id: string
          incident_type: string
          instance_name: string
          source: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          http_status?: number | null
          id?: string
          incident_type: string
          instance_name: string
          source: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          http_status?: number | null
          id?: string
          incident_type?: string
          instance_name?: string
          source?: string
        }
        Relationships: []
      }
      evolution_retry_metrics: {
        Row: {
          action: string
          attempt_count: number
          created_at: string
          final_http_status: number | null
          final_status: string
          id: string
          idempotency_key: string | null
          instance_name: string | null
          method: string
          retry_reasons: Json
          total_duration_ms: number | null
        }
        Insert: {
          action: string
          attempt_count: number
          created_at?: string
          final_http_status?: number | null
          final_status: string
          id?: string
          idempotency_key?: string | null
          instance_name?: string | null
          method: string
          retry_reasons?: Json
          total_duration_ms?: number | null
        }
        Update: {
          action?: string
          attempt_count?: number
          created_at?: string
          final_http_status?: number | null
          final_status?: string
          id?: string
          idempotency_key?: string | null
          instance_name?: string | null
          method?: string
          retry_reasons?: Json
          total_duration_ms?: number | null
        }
        Relationships: []
      }
      evolution_send_idempotency: {
        Row: {
          created_at: string
          expires_at: string
          external_message_id: string | null
          http_status: number
          idem_key: string
          instance_name: string
          path: string
          response: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string
          external_message_id?: string | null
          http_status?: number
          idem_key: string
          instance_name: string
          path: string
          response: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          external_message_id?: string | null
          http_status?: number
          idem_key?: string
          instance_name?: string
          path?: string
          response?: Json
        }
        Relationships: []
      }
      failed_messages: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          http_status: number | null
          id: string
          idempotency_key: string | null
          instance_name: string
          last_attempt_at: string | null
          last_retry_reason: string | null
          max_retries: number
          next_attempt_at: string | null
          payload: Json
          remote_jid: string | null
          retry_count: number
          status: string
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          instance_name: string
          last_attempt_at?: string | null
          last_retry_reason?: string | null
          max_retries?: number
          next_attempt_at?: string | null
          payload: Json
          remote_jid?: string | null
          retry_count?: number
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          instance_name?: string
          last_attempt_at?: string | null
          last_retry_reason?: string | null
          max_retries?: number
          next_attempt_at?: string | null
          payload?: Json
          remote_jid?: string | null
          retry_count?: number
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      favorite_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_templates: {
        Row: {
          created_at: string
          id: string
          template_id: string
          template_source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          template_source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          template_source?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          metadata: Json
          name: string
          rollout_percent: number
          target_emails: string[]
          target_roles: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          metadata?: Json
          name: string
          rollout_percent?: number
          target_emails?: string[]
          target_roles?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          metadata?: Json
          name?: string
          rollout_percent?: number
          target_emails?: string[]
          target_roles?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_executions: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
          current_step: number | null
          id: string
          next_step_at: string | null
          sequence_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          current_step?: number | null
          id?: string
          next_step_at?: string | null
          sequence_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          current_step?: number | null
          id?: string
          next_step_at?: string | null
          sequence_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_executions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "followup_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_sequences: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_event: string
          updated_at: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_event?: string
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_event?: string
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_sequences_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_sequences_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_sequences_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_sequences_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_steps: {
        Row: {
          created_at: string | null
          delay_hours: number
          id: string
          is_active: boolean | null
          message_template: string
          message_type: string
          sequence_id: string
          step_order: number
        }
        Insert: {
          created_at?: string | null
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          message_template: string
          message_type?: string
          sequence_id: string
          step_order?: number
        }
        Update: {
          created_at?: string | null
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          message_template?: string
          message_type?: string
          sequence_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "followup_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "followup_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_blocking_settings: {
        Row: {
          created_at: string
          id: string
          mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      gmail_accounts: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          email_address: string
          id: string
          is_active: boolean
          last_error: string | null
          last_sync_at: string | null
          refresh_token_encrypted: string | null
          sync_status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          email_address: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          sync_status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          email_address?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          sync_status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals_configurations: {
        Row: {
          created_at: string
          daily_target: number
          goal_type: string
          id: string
          is_active: boolean | null
          monthly_target: number
          profile_id: string | null
          queue_id: string | null
          updated_at: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          daily_target?: number
          goal_type: string
          id?: string
          is_active?: boolean | null
          monthly_target?: number
          profile_id?: string | null
          queue_id?: string | null
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          daily_target?: number
          goal_type?: string
          id?: string
          is_active?: boolean | null
          monthly_target?: number
          profile_id?: string | null
          queue_id?: string | null
          updated_at?: string
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_configurations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_configurations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_configurations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      hmac_selftest_audit: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          executed_by: string | null
          good_accepted: boolean | null
          id: string
          instance: string | null
          message: string | null
          ok: boolean
          tampered_rejected: boolean | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          executed_by?: string | null
          good_accepted?: boolean | null
          id?: string
          instance?: string | null
          message?: string | null
          ok: boolean
          tampered_rejected?: boolean | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          executed_by?: string | null
          good_accepted?: boolean | null
          id?: string
          instance?: string | null
          message?: string | null
          ok?: boolean
          tampered_rejected?: boolean | null
        }
        Relationships: []
      }
      instance_auth_events: {
        Row: {
          created_at: string
          detail: string | null
          http_status: number | null
          id: string
          instance_name: string
          reason: string
          source: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          http_status?: number | null
          id?: string
          instance_name: string
          reason: string
          source: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          http_status?: number | null
          id?: string
          instance_name?: string
          reason?: string
          source?: string
        }
        Relationships: []
      }
      instance_processing_pauses: {
        Row: {
          auto_paused: boolean
          created_at: string
          id: string
          instance_name: string
          investigated_at: string | null
          investigated_by: string | null
          investigation_notes: string | null
          paused_by: string | null
          paused_until: string
          reason: string
          trigger_count: number
          updated_at: string
        }
        Insert: {
          auto_paused?: boolean
          created_at?: string
          id?: string
          instance_name: string
          investigated_at?: string | null
          investigated_by?: string | null
          investigation_notes?: string | null
          paused_by?: string | null
          paused_until: string
          reason: string
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          auto_paused?: boolean
          created_at?: string
          id?: string
          instance_name?: string
          investigated_at?: string | null
          investigated_by?: string | null
          investigation_notes?: string | null
          paused_by?: string | null
          paused_until?: string
          reason?: string
          trigger_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      integration_health_log: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          integration_key: string
          latency_ms: number | null
          metadata: Json | null
          status: string
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          integration_key: string
          latency_ms?: number | null
          metadata?: Json | null
          status: string
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          integration_key?: string
          latency_ms?: number | null
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      kb_article_chunks: {
        Row: {
          article_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          token_count: number | null
        }
        Insert: {
          article_id: string
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
        }
        Update: {
          article_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          helpful_count: number
          id: string
          language: string
          not_helpful_count: number
          published_at: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          category?: string
          content: string
          created_at?: string
          excerpt?: string | null
          helpful_count?: number
          id?: string
          language?: string
          not_helpful_count?: number
          published_at?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          helpful_count?: number
          id?: string
          language?: string
          not_helpful_count?: number
          published_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      kb_search_logs: {
        Row: {
          clicked_article_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          query: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          clicked_article_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          query: string
          results_count?: number
          user_id?: string | null
        }
        Update: {
          clicked_article_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          query?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_search_logs_clicked_article_id_fkey"
            columns: ["clicked_article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          embedding_status: string | null
          embedding_updated_at: string | null
          id: string
          is_published: boolean | null
          search_vector: unknown
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          embedding_status?: string | null
          embedding_updated_at?: string | null
          id?: string
          is_published?: boolean | null
          search_vector?: unknown
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          embedding_status?: string | null
          embedding_updated_at?: string | null
          id?: string
          is_published?: boolean | null
          search_vector?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_files: {
        Row: {
          article_id: string | null
          created_at: string | null
          extracted_text: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          processing_status: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          processing_status?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          processing_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_files_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          id: string
          ip_address: string | null
          last_attempt_at: string
          locked_until: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          locked_until?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          locked_until?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      mcp_clients: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_used_at: string | null
          last_used_ip: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          contact_id: string | null
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_global: boolean | null
          shortcut: string | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          agent_id: string | null
          channel_connection_id: string | null
          channel_type: string | null
          contact_id: string | null
          content: string
          created_at: string
          error_code: string | null
          error_reason: string | null
          external_id: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean
          is_read: boolean | null
          media_url: string | null
          message_type: string
          request_id: string | null
          retry_attempt: number | null
          retry_total: number | null
          sender: string
          status: string | null
          status_updated_at: string | null
          transcription: string | null
          transcription_status: string | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id?: string | null
          channel_connection_id?: string | null
          channel_type?: string | null
          contact_id?: string | null
          content: string
          created_at?: string
          error_code?: string | null
          error_reason?: string | null
          external_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string
          request_id?: string | null
          retry_attempt?: number | null
          retry_total?: number | null
          sender: string
          status?: string | null
          status_updated_at?: string | null
          transcription?: string | null
          transcription_status?: string | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string | null
          channel_connection_id?: string | null
          channel_type?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string
          error_code?: string | null
          error_reason?: string | null
          external_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string
          request_id?: string | null
          retry_attempt?: number | null
          retry_total?: number | null
          sender?: string
          status?: string | null
          status_updated_at?: string | null
          transcription?: string | null
          transcription_status?: string | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_capi_events: {
        Row: {
          action_source: string | null
          contact_id: string | null
          created_at: string | null
          custom_data: Json | null
          event_name: string
          event_source_url: string | null
          event_time: string | null
          id: string
          meta_response: Json | null
          pixel_id: string | null
          sent_to_meta: boolean | null
        }
        Insert: {
          action_source?: string | null
          contact_id?: string | null
          created_at?: string | null
          custom_data?: Json | null
          event_name: string
          event_source_url?: string | null
          event_time?: string | null
          id?: string
          meta_response?: Json | null
          pixel_id?: string | null
          sent_to_meta?: boolean | null
        }
        Update: {
          action_source?: string | null
          contact_id?: string | null
          created_at?: string | null
          custom_data?: Json | null
          event_name?: string
          event_source_url?: string | null
          event_time?: string | null
          id?: string
          meta_response?: Json | null
          pixel_id?: string | null
          sent_to_meta?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_capi_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_sessions: {
        Row: {
          created_at: string
          expires_at: string
          factor_id: string
          id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          factor_id: string
          id?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          factor_id?: string
          id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_invitations: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          id: string
          responded: boolean
          response_id: string | null
          sent_at: string
        }
        Insert: {
          channel?: string
          contact_id: string
          created_at?: string
          id?: string
          responded?: boolean
          response_id?: string | null
          sent_at?: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          id?: string
          responded?: boolean
          response_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_invitations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_invitations_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "nps_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_surveys: {
        Row: {
          agent_id: string | null
          contact_id: string
          created_at: string
          feedback: string | null
          id: string
          score: number
          survey_type: string
        }
        Insert: {
          agent_id?: string | null
          contact_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          score: number
          survey_type?: string
        }
        Update: {
          agent_id?: string | null
          contact_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number
          survey_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_surveys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_surveys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_surveys_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      number_reputation: {
        Row: {
          complaints_count: number
          created_at: string
          daily_limit: number | null
          failures_today: number
          health_score: number
          id: string
          last_reset_at: string | null
          messages_sent_today: number
          updated_at: string
          warmup_day: number | null
          warmup_status: string
          whatsapp_connection_id: string
        }
        Insert: {
          complaints_count?: number
          created_at?: string
          daily_limit?: number | null
          failures_today?: number
          health_score?: number
          id?: string
          last_reset_at?: string | null
          messages_sent_today?: number
          updated_at?: string
          warmup_day?: number | null
          warmup_status?: string
          whatsapp_connection_id: string
        }
        Update: {
          complaints_count?: number
          created_at?: string
          daily_limit?: number | null
          failures_today?: number
          health_score?: number
          id?: string
          last_reset_at?: string | null
          messages_sent_today?: number
          updated_at?: string
          warmup_day?: number | null
          warmup_status?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "number_reputation_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "number_reputation_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "number_reputation_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "number_reputation_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          created_at: string
          dispatched_at: string | null
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          status: string
          trace_id: string | null
          updated_at: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempts?: number
          created_at?: string
          dispatched_at?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          status?: string
          trace_id?: string | null
          updated_at?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempts?: number
          created_at?: string
          dispatched_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: string
          trace_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      passkey_credentials: {
        Row: {
          backed_up: boolean | null
          counter: number
          created_at: string
          credential_id: string
          device_type: string | null
          friendly_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string
          credential_id: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_id: string | null
          description: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_url: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          created_at: string
          dom_nodes: number | null
          dom_ready: number | null
          fcp: number | null
          id: string
          memory_total: number | null
          memory_used: number | null
          network_type: string | null
          overall_score: number | null
          page_load: number | null
          profile_id: string
          rtt: number | null
          ttfb: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          dom_nodes?: number | null
          dom_ready?: number | null
          fcp?: number | null
          id?: string
          memory_total?: number | null
          memory_used?: number | null
          network_type?: string | null
          overall_score?: number | null
          page_load?: number | null
          profile_id: string
          rtt?: number | null
          ttfb?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          dom_nodes?: number | null
          dom_ready?: number | null
          fcp?: number | null
          id?: string
          memory_total?: number | null
          memory_used?: number | null
          network_type?: string | null
          overall_score?: number | null
          page_load?: number | null
          profile_id?: string
          rtt?: number | null
          ttfb?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pinned_conversations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          pinned_by: string
          position: number
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          pinned_by: string
          position?: number
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          pinned_by?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pinned_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_conversations_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_conversations_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          retailer_id: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          retailer_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          retailer_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_level: string | null
          avatar_url: string | null
          birthday: string | null
          can_download: boolean
          created_at: string
          department: string | null
          department_id: string | null
          email: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          max_chats: number | null
          name: string
          nickname: string | null
          permissions: Json | null
          phone: string | null
          role: string | null
          session_invalidated_at: string | null
          signature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          avatar_url?: string | null
          birthday?: string | null
          can_download?: boolean
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          max_chats?: number | null
          name: string
          nickname?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          session_invalidated_at?: string | null
          signature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          avatar_url?: string | null
          birthday?: string | null
          can_download?: boolean
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          max_chats?: number | null
          name?: string
          nickname?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          session_invalidated_at?: string | null
          signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_configs: {
        Row: {
          auth_token: string | null
          base_url: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_error: string | null
          last_ping_at: string | null
          last_ping_latency_ms: number | null
          name: string
          priority: number
          provider_type: Database["public"]["Enums"]["provider_type"]
          status: string
          updated_at: string
        }
        Insert: {
          auth_token?: string | null
          base_url: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_ping_at?: string | null
          last_ping_latency_ms?: number | null
          name: string
          priority?: number
          provider_type: Database["public"]["Enums"]["provider_type"]
          status?: string
          updated_at?: string
        }
        Update: {
          auth_token?: string | null
          base_url?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_ping_at?: string | null
          last_ping_latency_ms?: number | null
          name?: string
          priority?: number
          provider_type?: Database["public"]["Enums"]["provider_type"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_message_log: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_status: string
          direction: string
          error_code: string | null
          error_message: string | null
          external_contact_id: string | null
          external_message_id: string | null
          http_status: number | null
          id: string
          idempotency_key: string
          instance_name: string
          metadata: Json
          payload: Json
          payload_hash: string
          persisted_at: string | null
          provider: string
          received_at: string
          remote_jid: string
          routed_at: string | null
          thread_id: string | null
          trace_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          external_contact_id?: string | null
          external_message_id?: string | null
          http_status?: number | null
          id?: string
          idempotency_key: string
          instance_name: string
          metadata?: Json
          payload: Json
          payload_hash: string
          persisted_at?: string | null
          provider: string
          received_at?: string
          remote_jid: string
          routed_at?: string | null
          thread_id?: string | null
          trace_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          external_contact_id?: string | null
          external_message_id?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string
          instance_name?: string
          metadata?: Json
          payload?: Json
          payload_hash?: string
          persisted_at?: string | null
          provider?: string
          received_at?: string
          remote_jid?: string
          routed_at?: string | null
          thread_id?: string | null
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_message_log_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_session_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          latency_ms: number | null
          level: string
          message: string | null
          payload: Json | null
          provider_id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          latency_ms?: number | null
          level?: string
          message?: string | null
          payload?: Json | null
          provider_id: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          latency_ms?: number | null
          level?: string
          message?: string | null
          payload?: Json | null
          provider_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_session_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "provider_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_sessions: {
        Row: {
          channel_connection_id: string | null
          ended_at: string | null
          id: string
          last_heartbeat_at: string | null
          metadata: Json
          provider_id: string
          started_at: string
          status: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_connection_id?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string | null
          metadata?: Json
          provider_id: string
          started_at?: string
          status?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_connection_id?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string | null
          metadata?: Json
          provider_id?: string
          started_at?: string
          status?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_sessions_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sessions_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sessions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sessions_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sessions_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sessions_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sessions_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      proxy_alerts: {
        Row: {
          details: Json | null
          id: number
          kind: string
          sample_size: number
          severity: string
          threshold: number
          ts: string
          value: number
          window_minutes: number
        }
        Insert: {
          details?: Json | null
          id?: number
          kind: string
          sample_size: number
          severity: string
          threshold: number
          ts?: string
          value: number
          window_minutes: number
        }
        Update: {
          details?: Json | null
          id?: number
          kind?: string
          sample_size?: number
          severity?: string
          threshold?: number
          ts?: string
          value?: number
          window_minutes?: number
        }
        Relationships: []
      }
      proxy_metrics: {
        Row: {
          cid: string | null
          err_code: string | null
          err_msg: string | null
          id: number
          ms: number
          ok: boolean
          op: string
          pg_timeout: boolean
          rid: string | null
          status: number
          target: string
          timeout_fired: boolean
          ts: string
        }
        Insert: {
          cid?: string | null
          err_code?: string | null
          err_msg?: string | null
          id?: number
          ms: number
          ok: boolean
          op: string
          pg_timeout?: boolean
          rid?: string | null
          status: number
          target: string
          timeout_fired?: boolean
          ts?: string
        }
        Update: {
          cid?: string | null
          err_code?: string | null
          err_msg?: string | null
          id?: number
          ms?: number
          ok?: boolean
          op?: string
          pg_timeout?: boolean
          rid?: string | null
          status?: number
          target?: string
          timeout_fired?: boolean
          ts?: string
        }
        Relationships: []
      }
      qa_evaluations: {
        Row: {
          agent_id: string | null
          ai_auto_score: number | null
          ai_suggestions: Json | null
          contact_id: string
          created_at: string
          evaluated_at: string | null
          feedback: string | null
          id: string
          max_possible_score: number | null
          reviewer_id: string | null
          scorecard_id: string | null
          scores: Json
          status: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          ai_auto_score?: number | null
          ai_suggestions?: Json | null
          contact_id: string
          created_at?: string
          evaluated_at?: string | null
          feedback?: string | null
          id?: string
          max_possible_score?: number | null
          reviewer_id?: string | null
          scorecard_id?: string | null
          scores?: Json
          status?: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          ai_auto_score?: number | null
          ai_suggestions?: Json | null
          contact_id?: string
          created_at?: string
          evaluated_at?: string | null
          feedback?: string | null
          id?: string
          max_possible_score?: number | null
          reviewer_id?: string | null
          scorecard_id?: string | null
          scores?: Json
          status?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_evaluations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_evaluations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_evaluations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_evaluations_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_evaluations_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_evaluations_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "qa_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_scorecards: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_score: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_score?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_score?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_scorecards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_scorecards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_attempts: {
        Row: {
          connected_at: string | null
          connection_id: string | null
          connection_name: string | null
          created_at: string
          error_message: string | null
          expired_at: string | null
          id: string
          instance_id: string
          metadata: Json | null
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          connection_id?: string | null
          connection_name?: string | null
          created_at?: string
          error_message?: string | null
          expired_at?: string | null
          id?: string
          instance_id: string
          metadata?: Json | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          connection_id?: string | null
          connection_name?: string | null
          created_at?: string
          error_message?: string | null
          expired_at?: string | null
          id?: string
          instance_id?: string
          metadata?: Json | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_attempts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_attempts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_attempts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_attempts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      query_telemetry: {
        Row: {
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          operation: string
          query_limit: number | null
          query_offset: number | null
          record_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      queue_goals: {
        Row: {
          alerts_enabled: boolean | null
          created_at: string
          id: string
          max_avg_wait_minutes: number | null
          max_messages_pending: number | null
          max_waiting_contacts: number | null
          min_assignment_rate: number | null
          queue_id: string
          updated_at: string
        }
        Insert: {
          alerts_enabled?: boolean | null
          created_at?: string
          id?: string
          max_avg_wait_minutes?: number | null
          max_messages_pending?: number | null
          max_waiting_contacts?: number | null
          min_assignment_rate?: number | null
          queue_id: string
          updated_at?: string
        }
        Update: {
          alerts_enabled?: boolean | null
          created_at?: string
          id?: string
          max_avg_wait_minutes?: number | null
          max_messages_pending?: number | null
          max_waiting_contacts?: number | null
          min_assignment_rate?: number | null
          queue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_goals_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: true
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          profile_id: string
          queue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          profile_id: string
          queue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          profile_id?: string
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_members_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_positions: {
        Row: {
          contact_id: string
          created_at: string | null
          entered_at: string | null
          estimated_wait_minutes: number | null
          id: string
          notified: boolean | null
          position: number
          queue_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          entered_at?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notified?: boolean | null
          position?: number
          queue_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          entered_at?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notified?: boolean | null
          position?: number
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_positions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_positions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_skill_requirements: {
        Row: {
          created_at: string | null
          id: string
          min_level: number | null
          queue_id: string
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_level?: number | null
          queue_id: string
          skill_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          min_level?: number | null
          queue_id?: string
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_skill_requirements_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          auto_rebalance_enabled: boolean
          color: string
          created_at: string
          department_id: string | null
          description: string | null
          distribution_algorithm: string
          id: string
          is_active: boolean | null
          max_concurrent_per_agent: number | null
          max_per_queue_per_agent: number | null
          max_queue_size: number | null
          max_wait_seconds: number | null
          max_wait_time_minutes: number | null
          name: string
          overflow_queue_id: string | null
          paused_at: string | null
          paused_by: string | null
          paused_reason: string | null
          priority: number | null
          routing_weight: number
          sla_priority: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_rebalance_enabled?: boolean
          color?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          distribution_algorithm?: string
          id?: string
          is_active?: boolean | null
          max_concurrent_per_agent?: number | null
          max_per_queue_per_agent?: number | null
          max_queue_size?: number | null
          max_wait_seconds?: number | null
          max_wait_time_minutes?: number | null
          name: string
          overflow_queue_id?: string | null
          paused_at?: string | null
          paused_by?: string | null
          paused_reason?: string | null
          priority?: number | null
          routing_weight?: number
          sla_priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_rebalance_enabled?: boolean
          color?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          distribution_algorithm?: string
          id?: string
          is_active?: boolean | null
          max_concurrent_per_agent?: number | null
          max_per_queue_per_agent?: number | null
          max_queue_size?: number | null
          max_wait_seconds?: number | null
          max_wait_time_minutes?: number | null
          name?: string
          overflow_queue_id?: string | null
          paused_at?: string | null
          paused_by?: string | null
          paused_reason?: string | null
          priority?: number | null
          routing_weight?: number
          sla_priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queues_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_overflow_queue_id_fkey"
            columns: ["overflow_queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_configs: {
        Row: {
          block_duration_minutes: number
          created_at: string
          endpoint_pattern: string
          id: string
          is_active: boolean | null
          max_requests: number
          name: string
          updated_at: string
          window_seconds: number
        }
        Insert: {
          block_duration_minutes?: number
          created_at?: string
          endpoint_pattern: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          name: string
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          block_duration_minutes?: number
          created_at?: string
          endpoint_pattern?: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          name?: string
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          blocked: boolean | null
          city: string | null
          country: string | null
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          is_dismissed: boolean
          profile_id: string
          remind_at: string
          title: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_dismissed?: boolean
          profile_id: string
          remind_at: string
          title: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_dismissed?: boolean
          profile_id?: string
          remind_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reprocess_jobs: {
        Row: {
          action: string
          attempts: number
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          max_attempts: number
          reason: string | null
          requested_by: string | null
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
          target_id: string
          target_kind: string
          trace_id: string | null
          updated_at: string
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          max_attempts?: number
          reason?: string | null
          requested_by?: string | null
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          target_id: string
          target_kind: string
          trace_id?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          max_attempts?: number
          reason?: string | null
          requested_by?: string | null
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          target_id?: string
          target_kind?: string
          trace_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_deals: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          expected_close_date: string | null
          id: string
          lost_at: string | null
          lost_reason: string | null
          notes: string | null
          priority: string | null
          stage_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          value: number | null
          won_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          priority?: string | null
          stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          value?: number | null
          won_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          priority?: string | null
          stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string
          entity_type: string
          filters: Json
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          entities: string[]
          id: string
          last_used_at: string | null
          name: string
          query: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          entities?: string[]
          id?: string
          last_used_at?: string | null
          name: string
          query: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          entities?: string[]
          id?: string
          last_used_at?: string | null
          name?: string
          query?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          media_url: string | null
          message_type: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_configs: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          recipients: string[]
          report_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_report_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          format: string
          frequency: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          recipients: string[]
          report_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          clicked_result_id: string | null
          clicked_result_type: string | null
          created_at: string
          entities: string[]
          id: string
          query: string
          result_count: number
          used_vector: boolean
          user_id: string | null
        }
        Insert: {
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string
          entities?: string[]
          id?: string
          query: string
          result_count?: number
          used_vector?: boolean
          user_id?: string | null
        }
        Update: {
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string
          entities?: string[]
          id?: string
          query?: string
          result_count?: number
          used_vector?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      send_failures: {
        Row: {
          attempts: number
          auto_reconnect_succeeded: boolean | null
          auto_reconnect_tried: boolean
          contact_jid: string
          created_at: string
          error_code: string
          id: string
          instance: string
          request_id: string | null
        }
        Insert: {
          attempts?: number
          auto_reconnect_succeeded?: boolean | null
          auto_reconnect_tried?: boolean
          contact_jid: string
          created_at?: string
          error_code?: string
          id?: string
          instance?: string
          request_id?: string | null
        }
        Update: {
          attempts?: number
          auto_reconnect_succeeded?: boolean | null
          auto_reconnect_tried?: boolean
          contact_jid?: string
          created_at?: string
          error_code?: string
          id?: string
          instance?: string
          request_id?: string | null
        }
        Relationships: []
      }
      service_channels: {
        Row: {
          channel_type: string
          color: string
          created_at: string
          created_by: string | null
          default_queue_id: string | null
          description: string | null
          disabled_at: string | null
          disabled_reason: string | null
          display_name: string | null
          icon: string | null
          id: string
          is_default: boolean
          metadata: Json
          name: string
          paused_at: string | null
          paused_reason: string | null
          routing_mode: string
          status: string
          sticky_enabled: boolean
          sticky_ttl_hours: number
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_type?: string
          color?: string
          created_at?: string
          created_by?: string | null
          default_queue_id?: string | null
          description?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          display_name?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          metadata?: Json
          name: string
          paused_at?: string | null
          paused_reason?: string | null
          routing_mode?: string
          status?: string
          sticky_enabled?: boolean
          sticky_ttl_hours?: number
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_type?: string
          color?: string
          created_at?: string
          created_by?: string | null
          default_queue_id?: string | null
          description?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          display_name?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          metadata?: Json
          name?: string
          paused_at?: string | null
          paused_reason?: string | null
          routing_mode?: string
          status?: string
          sticky_enabled?: boolean
          sticky_ttl_hours?: number
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_channels_default_queue_id_fkey"
            columns: ["default_queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_channels_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_channels_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_channels_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_channels_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_contact_mapping: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          sicoob_singular_id: string
          sicoob_user_id: string
          sicoob_vendedor_id: string
          zappweb_agent_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          sicoob_singular_id: string
          sicoob_user_id: string
          sicoob_vendedor_id: string
          zappweb_agent_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          sicoob_singular_id?: string
          sicoob_user_id?: string
          sicoob_vendedor_id?: string
          zappweb_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_contact_mapping_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_contact_mapping_zappweb_agent_id_fkey"
            columns: ["zappweb_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_contact_mapping_zappweb_agent_id_fkey"
            columns: ["zappweb_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_alert_preferences: {
        Row: {
          alert_first_response: boolean
          alert_resolution: boolean
          created_at: string
          enabled: boolean
          id: string
          severity_breached: boolean
          severity_warning: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_first_response?: boolean
          alert_resolution?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          severity_breached?: boolean
          severity_warning?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_first_response?: boolean
          alert_resolution?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          severity_breached?: boolean
          severity_warning?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sla_alert_thresholds: {
        Row: {
          breached_grace_seconds: number
          created_at: string
          critical_pct: number
          enabled: boolean
          id: string
          scope: string
          scope_id: string | null
          updated_at: string
          updated_by: string | null
          warning_pct: number
        }
        Insert: {
          breached_grace_seconds?: number
          created_at?: string
          critical_pct?: number
          enabled?: boolean
          id?: string
          scope?: string
          scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warning_pct?: number
        }
        Update: {
          breached_grace_seconds?: number
          created_at?: string
          critical_pct?: number
          enabled?: boolean
          id?: string
          scope?: string
          scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warning_pct?: number
        }
        Relationships: []
      }
      sla_configurations: {
        Row: {
          created_at: string
          first_response_minutes: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          priority: string
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          priority?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          priority?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      sla_risk_acknowledgements: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string | null
          contact_id: string
          created_at: string
          first_message_at: string | null
          first_response_at: string | null
          id: string
          kind: string
          note: string | null
          remaining_ms_at_ack: number
          resolved_at: string | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          contact_id: string
          created_at?: string
          first_message_at?: string | null
          first_response_at?: string | null
          id?: string
          kind: string
          note?: string | null
          remaining_ms_at_ack: number
          resolved_at?: string | null
          severity: string
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          contact_id?: string
          created_at?: string
          first_message_at?: string | null
          first_response_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          remaining_ms_at_ack?: number
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_risk_acknowledgements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_rules: {
        Row: {
          agent_id: string | null
          company: string | null
          contact_id: string | null
          contact_type: string | null
          created_at: string
          first_response_minutes: number
          id: string
          is_active: boolean
          job_title: string | null
          metadata: Json | null
          name: string
          priority: number
          queue_id: string | null
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          company?: string | null
          contact_id?: string | null
          contact_type?: string | null
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean
          job_title?: string | null
          metadata?: Json | null
          name: string
          priority?: number
          queue_id?: string | null
          resolution_minutes?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          company?: string | null
          contact_id?: string | null
          contact_type?: string | null
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean
          job_title?: string | null
          metadata?: Json | null
          name?: string
          priority?: number
          queue_id?: string | null
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_rules_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_rules_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_runbook_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          duration_ms: number | null
          id: string
          runbook_id: string
          session_id: string
          target: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          runbook_id: string
          session_id: string
          target?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          runbook_id?: string
          session_id?: string
          target?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stickers: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          image_url: string
          is_favorite: boolean | null
          name: string | null
          owner_id: string | null
          updated_at: string | null
          uploaded_by: string | null
          use_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_favorite?: boolean | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_favorite?: boolean | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stickers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stickers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sticky_assignments: {
        Row: {
          agent_profile_id: string
          channel_connection_id: string | null
          contact_id: string
          created_at: string
          expires_at: string
          id: string
          last_assigned_at: string
          queue_id: string | null
        }
        Insert: {
          agent_profile_id: string
          channel_connection_id?: string | null
          contact_id: string
          created_at?: string
          expires_at?: string
          id?: string
          last_assigned_at?: string
          queue_id?: string | null
        }
        Update: {
          agent_profile_id?: string
          channel_connection_id?: string | null
          contact_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_assigned_at?: string
          queue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sticky_assignments_agent_profile_id_fkey"
            columns: ["agent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_assignments_agent_profile_id_fkey"
            columns: ["agent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_assignments_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_assignments_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_assignments_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      system_event_keys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          grace_until: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          rotated_from_id: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          grace_until?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          rotated_from_id?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          grace_until?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          rotated_from_id?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_event_keys_rotated_from_id_fkey"
            columns: ["rotated_from_id"]
            isOneToOne: false
            referencedRelation: "system_event_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      system_webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          duration_ms: number | null
          error: string | null
          event: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          webhook_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          event: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "system_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      system_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          events: string[]
          failure_count: number
          headers: Json
          id: string
          is_active: boolean
          last_status: string | null
          last_triggered_at: string | null
          name: string
          secret_hmac: string
          success_count: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          failure_count?: number
          headers?: Json
          id?: string
          is_active?: boolean
          last_status?: string | null
          last_triggered_at?: string | null
          name: string
          secret_hmac: string
          success_count?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          failure_count?: number
          headers?: Json
          id?: string
          is_active?: boolean
          last_status?: string | null
          last_triggered_at?: string | null
          name?: string
          secret_hmac?: string
          success_count?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      talkx_blacklist: {
        Row: {
          blocked_by: string | null
          contact_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          contact_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talkx_blacklist_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_blacklist_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_blacklist_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      talkx_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          id: string
          media_type: string | null
          media_url: string | null
          message_template: string
          name: string
          scheduled_at: string | null
          send_interval_max: number
          send_interval_min: number
          sent_count: number
          started_at: string | null
          status: string
          total_recipients: number
          typing_delay_max: number
          typing_delay_min: number
          updated_at: string
          variables_config: Json
          whatsapp_connection_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_template: string
          name: string
          scheduled_at?: string | null
          send_interval_max?: number
          send_interval_min?: number
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          typing_delay_max?: number
          typing_delay_min?: number
          updated_at?: string
          variables_config?: Json
          whatsapp_connection_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_template?: string
          name?: string
          scheduled_at?: string | null
          send_interval_max?: number
          send_interval_min?: number
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          typing_delay_max?: number
          typing_delay_min?: number
          updated_at?: string
          variables_config?: Json
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talkx_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      talkx_recipients: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          personalized_message: string | null
          request_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          personalized_message?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          personalized_message?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talkx_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "talkx_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talkx_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "team_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_edited: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "team_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      template_performance: {
        Row: {
          contact_id: string | null
          got_response: boolean | null
          id: string
          led_to_conversion: boolean | null
          metadata: Json | null
          response_time_seconds: number | null
          sentiment_score: number | null
          template_id: string
          used_at: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          got_response?: boolean | null
          id?: string
          led_to_conversion?: boolean | null
          metadata?: Json | null
          response_time_seconds?: number | null
          sentiment_score?: number | null
          template_id: string
          used_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          got_response?: boolean | null
          id?: string
          led_to_conversion?: boolean | null
          metadata?: Json | null
          response_time_seconds?: number | null
          sentiment_score?: number | null
          template_id?: string
          used_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          messages: Json | null
          profile_id: string
          scenario_name: string
          scenario_type: string | null
          score: number | null
          started_at: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          messages?: Json | null
          profile_id: string
          scenario_name: string
          scenario_type?: string | null
          score?: number | null
          started_at?: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          messages?: Json | null
          profile_id?: string
          scenario_name?: string
          scenario_type?: string | null
          score?: number | null
          started_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          first_seen_at: string
          id: string
          ip_address: string | null
          is_trusted: boolean | null
          last_seen_at: string
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean | null
          last_seen_at?: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean | null
          last_seen_at?: string
          os?: string | null
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_service_accounts: {
        Row: {
          account_email: string
          created_at: string
          id: string
          is_active: boolean
          service_type: Database["public"]["Enums"]["service_account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email: string
          created_at?: string
          id?: string
          is_active?: boolean
          service_type: Database["public"]["Enums"]["service_account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string
          created_at?: string
          id?: string
          is_active?: boolean
          service_type?: Database["public"]["Enums"]["service_account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          device_id: string | null
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_id?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_id?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_assignment_enabled: boolean | null
          auto_assignment_method: string | null
          auto_transcription_enabled: boolean | null
          away_message: string | null
          browser_notifications_enabled: boolean | null
          business_hours_enabled: boolean | null
          business_hours_end: string | null
          business_hours_start: string | null
          closing_message: string | null
          compact_mode: boolean | null
          created_at: string
          goal_sound_type: string | null
          id: string
          inactivity_timeout: number | null
          inbox_filters: Json | null
          language: string | null
          mention_sound_type: string | null
          message_sound_type: string | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sentiment_alert_enabled: boolean | null
          sentiment_alert_threshold: number | null
          sentiment_consecutive_count: number | null
          sla_sound_type: string | null
          sound_enabled: boolean | null
          theme: string | null
          transcription_notification_enabled: boolean | null
          transcription_sound_type: string | null
          tts_speed: number | null
          tts_voice_id: string | null
          updated_at: string
          user_id: string
          welcome_message: string | null
          work_days: number[] | null
        }
        Insert: {
          auto_assignment_enabled?: boolean | null
          auto_assignment_method?: string | null
          auto_transcription_enabled?: boolean | null
          away_message?: string | null
          browser_notifications_enabled?: boolean | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          closing_message?: string | null
          compact_mode?: boolean | null
          created_at?: string
          goal_sound_type?: string | null
          id?: string
          inactivity_timeout?: number | null
          inbox_filters?: Json | null
          language?: string | null
          mention_sound_type?: string | null
          message_sound_type?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sentiment_alert_enabled?: boolean | null
          sentiment_alert_threshold?: number | null
          sentiment_consecutive_count?: number | null
          sla_sound_type?: string | null
          sound_enabled?: boolean | null
          theme?: string | null
          transcription_notification_enabled?: boolean | null
          transcription_sound_type?: string | null
          tts_speed?: number | null
          tts_voice_id?: string | null
          updated_at?: string
          user_id: string
          welcome_message?: string | null
          work_days?: number[] | null
        }
        Update: {
          auto_assignment_enabled?: boolean | null
          auto_assignment_method?: string | null
          auto_transcription_enabled?: boolean | null
          away_message?: string | null
          browser_notifications_enabled?: boolean | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          closing_message?: string | null
          compact_mode?: boolean | null
          created_at?: string
          goal_sound_type?: string | null
          id?: string
          inactivity_timeout?: number | null
          inbox_filters?: Json | null
          language?: string | null
          mention_sound_type?: string | null
          message_sound_type?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sentiment_alert_enabled?: boolean | null
          sentiment_alert_threshold?: number | null
          sentiment_consecutive_count?: number | null
          sla_sound_type?: string | null
          sound_enabled?: boolean | null
          theme?: string | null
          transcription_notification_enabled?: boolean | null
          transcription_sound_type?: string | null
          tts_speed?: number | null
          tts_voice_id?: string | null
          updated_at?: string
          user_id?: string
          welcome_message?: string | null
          work_days?: number[] | null
        }
        Relationships: []
      }
      voice_command_logs: {
        Row: {
          action: string
          created_at: string | null
          data: Json | null
          duration_ms: number | null
          id: string
          response: string | null
          success: boolean | null
          transcript: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          data?: Json | null
          duration_ms?: number | null
          id?: string
          response?: string | null
          success?: boolean | null
          transcript: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          data?: Json | null
          duration_ms?: number | null
          id?: string
          response?: string | null
          success?: boolean | null
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      warroom_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          dismissed_by: string | null
          id: string
          is_read: boolean | null
          message: string
          resolved_at: string | null
          resolved_reason: string | null
          source: string | null
          title: string
        }
        Insert: {
          alert_type?: string
          created_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          resolved_at?: string | null
          resolved_reason?: string | null
          source?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          resolved_at?: string | null
          resolved_reason?: string | null
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "warroom_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warroom_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_event_dedup: {
        Row: {
          event_key: string
          event_type: string
          instance_name: string
          payload_hash: string | null
          received_at: string
        }
        Insert: {
          event_key: string
          event_type: string
          instance_name: string
          payload_hash?: string | null
          received_at?: string
        }
        Update: {
          event_key?: string
          event_type?: string
          instance_name?: string
          payload_hash?: string | null
          received_at?: string
        }
        Relationships: []
      }
      webhook_rate_limits: {
        Row: {
          created_at: string
          event_count: number
          event_type: string
          id: string
          instance_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          event_count?: number
          event_type: string
          id?: string
          instance_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          event_count?: number
          event_type?: string
          id?: string
          instance_id?: string
          window_start?: string
        }
        Relationships: []
      }
      whatsapp_connection_queues: {
        Row: {
          created_at: string
          id: string
          queue_id: string
          whatsapp_connection_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          queue_id: string
          whatsapp_connection_id: string
        }
        Update: {
          created_at?: string
          id?: string
          queue_id?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connection_queues_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connection_queues_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connection_queues_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connection_queues_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connection_queues_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          api_type: string
          battery_level: number | null
          created_at: string
          created_by: string | null
          degraded_at: string | null
          farewell_enabled: boolean | null
          farewell_message: string | null
          health_response_ms: number | null
          health_status: string | null
          id: string
          instance_id: string | null
          is_default: boolean | null
          is_plugged: boolean | null
          last_health_check: string | null
          max_retries: number | null
          metadata: Json
          name: string
          phone_number: string
          qr_code: string | null
          retry_count: number | null
          routing_mode: string
          status: string | null
          updated_at: string
        }
        Insert: {
          api_type?: string
          battery_level?: number | null
          created_at?: string
          created_by?: string | null
          degraded_at?: string | null
          farewell_enabled?: boolean | null
          farewell_message?: string | null
          health_response_ms?: number | null
          health_status?: string | null
          id?: string
          instance_id?: string | null
          is_default?: boolean | null
          is_plugged?: boolean | null
          last_health_check?: string | null
          max_retries?: number | null
          metadata?: Json
          name: string
          phone_number: string
          qr_code?: string | null
          retry_count?: number | null
          routing_mode?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_type?: string
          battery_level?: number | null
          created_at?: string
          created_by?: string | null
          degraded_at?: string | null
          farewell_enabled?: boolean | null
          farewell_message?: string | null
          health_response_ms?: number | null
          health_status?: string | null
          id?: string
          instance_id?: string | null
          is_default?: boolean | null
          is_plugged?: boolean | null
          last_health_check?: string | null
          max_retries?: number | null
          metadata?: Json
          name?: string
          phone_number?: string
          qr_code?: string | null
          retry_count?: number | null
          routing_mode?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          flow_json: Json
          id: string
          name: string
          published_at: string | null
          screens: Json
          status: string | null
          updated_at: string | null
          whatsapp_connection_id: string | null
          whatsapp_flow_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flow_json?: Json
          id?: string
          name: string
          published_at?: string | null
          screens?: Json
          status?: string | null
          updated_at?: string | null
          whatsapp_connection_id?: string | null
          whatsapp_flow_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flow_json?: Json
          id?: string
          name?: string
          published_at?: string | null
          screens?: Json
          status?: string | null
          updated_at?: string | null
          whatsapp_connection_id?: string | null
          whatsapp_flow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flows_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_groups: {
        Row: {
          avatar_url: string | null
          category: string | null
          created_at: string
          description: string | null
          group_id: string
          id: string
          is_admin: boolean | null
          name: string
          participant_count: number | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          is_admin?: boolean | null
          name: string
          participant_count?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          is_admin?: boolean | null
          name?: string
          participant_count?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_groups_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_groups_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_groups_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          buttons: Json | null
          category: string
          content: string
          created_at: string
          created_by: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          language: string
          name: string
          status: string
          updated_at: string
          variables: string[] | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          buttons?: Json | null
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name: string
          status?: string
          updated_at?: string
          variables?: string[] | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          buttons?: Json | null
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name?: string
          status?: string
          updated_at?: string
          variables?: string[] | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      whisper_messages: {
        Row: {
          contact_id: string
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
          target_agent_id: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
          target_agent_id: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
          target_agent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisper_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_messages_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_messages_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      channel_connections_safe: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"] | null
          created_at: string | null
          created_by: string | null
          external_account_id: string | null
          external_page_id: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_type?: Database["public"]["Enums"]["channel_type"] | null
          created_at?: string | null
          created_by?: string | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"] | null
          created_at?: string | null
          created_by?: string | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_accounts_safe: {
        Row: {
          created_at: string | null
          email_address: string | null
          id: string | null
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          sync_status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_address?: string | null
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          sync_status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_address?: string | null
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          sync_status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_requests_safe: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          ip_address: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          ip_address?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          ip_address?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          department: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          department?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          department?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_top_searches_7d: {
        Row: {
          any_vector: boolean | null
          avg_results: number | null
          click_count: number | null
          last_searched_at: string | null
          query: string | null
          search_count: number | null
          zero_result_count: number | null
        }
        Relationships: []
      }
      whatsapp_connections_agent: {
        Row: {
          id: string | null
          is_default: boolean | null
          name: string | null
          phone_number: string | null
          status: string | null
        }
        Insert: {
          id?: string | null
          is_default?: boolean | null
          name?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          is_default?: boolean | null
          name?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_connections_public: {
        Row: {
          id: string | null
          is_default: boolean | null
          name: string | null
          status: string | null
        }
        Insert: {
          id?: string | null
          is_default?: boolean | null
          name?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          is_default?: boolean | null
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_connections_safe: {
        Row: {
          battery_level: number | null
          created_at: string | null
          created_by: string | null
          farewell_enabled: boolean | null
          farewell_message: string | null
          health_response_ms: number | null
          health_status: string | null
          id: string | null
          instance_id: string | null
          is_default: boolean | null
          is_plugged: boolean | null
          last_health_check: string | null
          max_retries: number | null
          name: string | null
          phone_number: string | null
          qr_code: string | null
          retry_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string | null
          created_by?: string | null
          farewell_enabled?: boolean | null
          farewell_message?: string | null
          health_response_ms?: number | null
          health_status?: string | null
          id?: string | null
          instance_id?: never
          is_default?: boolean | null
          is_plugged?: boolean | null
          last_health_check?: string | null
          max_retries?: number | null
          name?: string | null
          phone_number?: string | null
          qr_code?: never
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string | null
          created_by?: string | null
          farewell_enabled?: boolean | null
          farewell_message?: string | null
          health_response_ms?: number | null
          health_status?: string | null
          id?: string | null
          instance_id?: never
          is_default?: boolean | null
          is_plugged?: boolean | null
          last_health_check?: string | null
          max_retries?: number | null
          name?: string | null
          phone_number?: string | null
          qr_code?: never
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_pause_instance_on_auth_spike: {
        Args: {
          p_instance: string
          p_minutes?: number
          p_reason: string
          p_trigger_count: number
        }
        Returns: string
      }
      calculate_level: { Args: { xp_amount: number }; Returns: number }
      can_supervise_profile: {
        Args: { _target_profile_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_see_contact: {
        Args: { _contact_id: string; _user_id: string }
        Returns: boolean
      }
      check_login_rate_limit: {
        Args: { p_email: string; p_ip?: string }
        Returns: Json
      }
      cleanup_connection_status_audit: { Args: never; Returns: number }
      cleanup_dispatch_error_logs: { Args: never; Returns: number }
      cleanup_evolution_fallback_events: { Args: never; Returns: number }
      cleanup_evolution_send_idempotency: { Args: never; Returns: number }
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      cleanup_expired_event_keys: { Args: never; Returns: undefined }
      cleanup_failed_messages: { Args: never; Returns: Json }
      cleanup_health_log: { Args: never; Returns: undefined }
      cleanup_old_connection_action_log: { Args: never; Returns: undefined }
      cleanup_old_evolution_incidents: { Args: never; Returns: number }
      cleanup_old_evolution_retry_metrics: { Args: never; Returns: undefined }
      cleanup_old_failed_messages: { Args: never; Returns: undefined }
      cleanup_old_instance_auth_events: { Args: never; Returns: number }
      cleanup_old_qr_attempts: { Args: never; Returns: undefined }
      cleanup_old_send_failures: { Args: never; Returns: undefined }
      cleanup_proxy_metrics: { Args: never; Returns: undefined }
      cleanup_webhook_deliveries: { Args: never; Returns: undefined }
      cleanup_webhook_event_dedup: { Args: never; Returns: number }
      clear_login_attempts: { Args: { p_email: string }; Returns: undefined }
      contacts_count_by_type: {
        Args: never
        Returns: {
          contact_type: string
          count: number
        }[]
      }
      decrypt_gmail_token: { Args: { p_encrypted: string }; Returns: string }
      encrypt_gmail_token: { Args: { p_token: string }; Returns: string }
      fn_register_sticky_assignment: {
        Args: {
          p_agent_profile_id: string
          p_channel_connection_id?: string
          p_contact_id: string
          p_queue_id?: string
        }
        Returns: string
      }
      fn_resolve_agent_for_routing: {
        Args: {
          p_channel_connection_id?: string
          p_contact_id: string
          p_queue_id?: string
        }
        Returns: Json
      }
      get_channel_credentials: {
        Args: { _connection_id: string }
        Returns: Json
      }
      get_channel_credentials_safe: {
        Args: { p_channel_id: string }
        Returns: Json
      }
      get_connection_instance: {
        Args: { _connection_id: string }
        Returns: string
      }
      get_connection_qr_code: {
        Args: { _connection_id: string }
        Returns: string
      }
      get_own_gmail_accounts: {
        Args: never
        Returns: {
          created_at: string
          email_address: string
          id: string
          is_active: boolean
          last_error: string
          last_sync_at: string
          sync_status: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }[]
      }
      get_own_lockout_status: {
        Args: { p_email: string }
        Returns: {
          attempt_count: number
          locked_until: string
        }[]
      }
      get_own_reset_requests: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "password_reset_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profile_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_profile_role_for_check: {
        Args: { p_user_id: string }
        Returns: {
          access_level: string
          permissions: Json
          role: string
        }[]
      }
      get_reset_requests_safe: {
        Args: never
        Returns: {
          created_at: string
          email: string
          has_token: boolean
          id: string
          ip_address: string
          reason: string
          rejection_reason: string
          reviewed_at: string
          reviewed_by: string
          status: string
          token_expires_at: string
          updated_at: string
          user_agent: string
          user_id: string
        }[]
      }
      get_team_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          department: string
          email: string
          id: string
          is_active: boolean
          job_title: string
          max_chats: number
          name: string
          phone: string
          role: string
          user_id: string
        }[]
      }
      get_user_department: { Args: { _user_id: string }; Returns: string }
      get_visible_agent_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: {
        Args: { check_email: string }
        Returns: {
          attempts: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      is_admin_or_supervisor: { Args: { _user_id: string }; Returns: boolean }
      is_contact_visible_to_user: {
        Args: { _contact_id: string; _user_id: string }
        Returns: boolean
      }
      is_country_allowed: {
        Args: { check_country_code: string }
        Returns: boolean
      }
      is_country_blocked: {
        Args: { check_country_code: string }
        Returns: boolean
      }
      is_feature_enabled: { Args: { p_flag_name: string }; Returns: boolean }
      is_instance_paused: { Args: { p_instance: string }; Returns: boolean }
      is_ip_blocked: { Args: { check_ip: string }; Returns: boolean }
      is_ip_whitelisted: { Args: { check_ip: string }; Returns: boolean }
      is_manager_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_team_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_within_business_hours: {
        Args: { connection_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_audit_event_as: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_pause_investigated: {
        Args: { p_notes?: string; p_pause_id: string }
        Returns: {
          auto_paused: boolean
          created_at: string
          id: string
          instance_name: string
          investigated_at: string | null
          investigated_by: string | null
          investigation_notes: string | null
          paused_by: string | null
          paused_until: string
          reason: string
          trigger_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "instance_processing_pauses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      match_kb_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_language?: string
          query_embedding: string
        }
        Returns: {
          article_category: string
          article_id: string
          article_title: string
          chunk_id: string
          content: string
          similarity: number
        }[]
      }
      pause_instance: {
        Args: {
          p_instance: string
          p_minutes?: number
          p_reason: string
          p_trigger_count?: number
        }
        Returns: string
      }
      reassign_absent_agents: {
        Args: { inactive_minutes?: number }
        Returns: number
      }
      reassign_overloaded_agents: { Args: never; Returns: number }
      record_failed_login: {
        Args: { p_email: string; p_ip_address?: string; p_user_agent?: string }
        Returns: {
          attempts: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      record_login_attempt: {
        Args: {
          p_email: string
          p_ip?: string
          p_success?: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      rpc_disable_service_channel: {
        Args: { p_id: string; p_reason?: string }
        Returns: {
          channel_type: string
          color: string
          created_at: string
          created_by: string | null
          default_queue_id: string | null
          description: string | null
          disabled_at: string | null
          disabled_reason: string | null
          display_name: string | null
          icon: string | null
          id: string
          is_default: boolean
          metadata: Json
          name: string
          paused_at: string | null
          paused_reason: string | null
          routing_mode: string
          status: string
          sticky_enabled: boolean
          sticky_ttl_hours: number
          updated_at: string
          whatsapp_connection_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_channels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_dispatch_error_stats: { Args: { p_hours?: number }; Returns: Json }
      rpc_dlq_abandon: {
        Args: { p_id: string; p_reason: string }
        Returns: boolean
      }
      rpc_dlq_bulk_abandon: {
        Args: { p_ids: string[]; p_reason: string }
        Returns: number
      }
      rpc_dlq_list_audit: {
        Args: { p_action?: string; p_limit?: number; p_offset?: number }
        Returns: {
          action: string
          created_at: string
          details: Json
          entity_id: string
          id: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      rpc_dlq_log_item_action: {
        Args: { p_action: string; p_ids: string[]; p_reason?: string }
        Returns: undefined
      }
      rpc_dlq_log_reprocess_result: {
        Args: {
          p_abandoned?: number
          p_failed?: number
          p_message?: string
          p_processed?: number
          p_source?: string
          p_succeeded?: number
        }
        Returns: undefined
      }
      rpc_dlq_log_reprocess_trigger: {
        Args: { p_source?: string }
        Returns: undefined
      }
      rpc_dlq_retry_now: { Args: { p_id: string }; Returns: boolean }
      rpc_dlq_stats: { Args: never; Returns: Json }
      rpc_enqueue_reprocess: {
        Args: {
          p_action: string
          p_reason?: string
          p_target_id: string
          p_target_kind: string
        }
        Returns: string
      }
      rpc_evolution_fallback_stats: {
        Args: { p_hours?: number }
        Returns: Json
      }
      rpc_instance_auth_event_summary: {
        Args: { p_hours?: number; p_instance?: string }
        Returns: Json
      }
      rpc_instance_auth_event_trend: {
        Args: { p_hours?: number; p_instance?: string }
        Returns: {
          auth_401: number
          auth_403: number
          bucket: string
          instance_name: string
          invalid_signature: number
          total: number
        }[]
      }
      rpc_link_channel_queue: {
        Args: {
          p_channel_id: string
          p_is_active?: boolean
          p_priority?: number
          p_queue_id: string
        }
        Returns: {
          channel_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          priority: number
          queue_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "channel_queues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_list_channel_queues: {
        Args: { p_channel_id: string }
        Returns: {
          is_active: boolean
          is_default: boolean
          name: string
          priority: number
          queue_id: string
          status: string
        }[]
      }
      rpc_list_dispatch_error_logs: {
        Args: {
          p_agent?: string
          p_error_code?: string
          p_from?: string
          p_instance?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_to?: string
        }
        Returns: {
          agent_email: string
          agent_user_id: string
          channel_type: string
          context: Json
          error_code: string
          error_message: string
          failed_message_id: string
          http_status: number
          id: string
          instance_name: string
          occurred_at: string
          payload: Json
          remote_jid: string
          retry_count: number
          total_count: number
        }[]
      }
      rpc_list_eligible_agents: {
        Args: { p_queue_id: string }
        Returns: {
          active_chats: number
          department_id: string
          display_name: string
          is_active: boolean
          max_chats: number
          user_id: string
        }[]
      }
      rpc_list_failed_messages:
        | {
            Args: {
              p_from?: string
              p_instance?: string
              p_limit?: number
              p_offset?: number
              p_search?: string
              p_status?: string
              p_to?: string
            }
            Returns: {
              abandon_reason: string
              abandoned_at: string
              created_at: string
              error_code: string
              error_message: string
              http_status: number
              id: string
              instance_name: string
              max_retries: number
              next_attempt_at: string
              payload: Json
              remote_jid: string
              retry_count: number
              status: string
              succeeded_at: string
              total_count: number
              updated_at: string
            }[]
          }
        | {
            Args: {
              p_from?: string
              p_instance?: string
              p_limit?: number
              p_offset?: number
              p_search?: string
              p_status?: string[]
              p_to?: string
            }
            Returns: {
              created_at: string
              error_code: string
              error_message: string
              http_status: number
              id: string
              instance_name: string
              last_attempt_at: string
              max_retries: number
              next_attempt_at: string
              payload: Json
              remote_jid: string
              retry_count: number
              status: string
              succeeded_at: string
              total_count: number
              updated_at: string
            }[]
          }
      rpc_list_service_channels: {
        Args: { p_channel_type?: string; p_search?: string; p_status?: string }
        Returns: {
          channel_type: string
          color: string
          created_at: string
          created_by: string | null
          default_queue_id: string | null
          description: string | null
          disabled_at: string | null
          disabled_reason: string | null
          display_name: string | null
          icon: string | null
          id: string
          is_default: boolean
          metadata: Json
          name: string
          paused_at: string | null
          paused_reason: string | null
          routing_mode: string
          status: string
          sticky_enabled: boolean
          sticky_ttl_hours: number
          updated_at: string
          whatsapp_connection_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "service_channels"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_log_provider_message: {
        Args: {
          p_direction: string
          p_external_contact_id: string
          p_external_message_id: string
          p_idempotency_key: string
          p_instance_name: string
          p_payload: Json
          p_provider: string
          p_remote_jid: string
          p_thread_id?: string
          p_trace_id?: string
        }
        Returns: string
      }
      rpc_log_search_event: {
        Args: {
          p_entities: string[]
          p_query: string
          p_result_count: number
          p_used_vector: boolean
        }
        Returns: string
      }
      rpc_pause_queue: {
        Args: { p_queue_id: string; p_reason?: string }
        Returns: {
          auto_rebalance_enabled: boolean
          color: string
          created_at: string
          department_id: string | null
          description: string | null
          distribution_algorithm: string
          id: string
          is_active: boolean | null
          max_concurrent_per_agent: number | null
          max_per_queue_per_agent: number | null
          max_queue_size: number | null
          max_wait_seconds: number | null
          max_wait_time_minutes: number | null
          name: string
          overflow_queue_id: string | null
          paused_at: string | null
          paused_by: string | null
          paused_reason: string | null
          priority: number | null
          routing_weight: number
          sla_priority: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "queues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_pause_service_channel: {
        Args: { p_id: string; p_reason?: string }
        Returns: {
          channel_type: string
          color: string
          created_at: string
          created_by: string | null
          default_queue_id: string | null
          description: string | null
          disabled_at: string | null
          disabled_reason: string | null
          display_name: string | null
          icon: string | null
          id: string
          is_default: boolean
          metadata: Json
          name: string
          paused_at: string | null
          paused_reason: string | null
          routing_mode: string
          status: string
          sticky_enabled: boolean
          sticky_ttl_hours: number
          updated_at: string
          whatsapp_connection_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_channels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_pick_next_agent: { Args: { p_queue_id: string }; Returns: string }
      rpc_provider_panel: {
        Args: never
        Returns: {
          base_url: string
          errors_24h: number
          events_24h: number
          is_active: boolean
          last_error: string
          last_ping_at: string
          last_ping_latency_ms: number
          name: string
          open_sessions: number
          priority: number
          provider_id: string
          provider_type: Database["public"]["Enums"]["provider_type"]
          routes_active: number
          routes_fallback: number
          routes_primary: number
          status: string
        }[]
      }
      rpc_provider_session_timeline: {
        Args: {
          p_limit?: number
          p_provider_id?: string
          p_session_id?: string
        }
        Returns: {
          created_at: string
          event: string
          latency_ms: number
          level: string
          log_id: string
          message: string
          provider_id: string
          provider_name: string
          session_id: string
        }[]
      }
      rpc_publish_outbox: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type: string
          p_event_type: string
          p_idempotency_key?: string
          p_payload: Json
          p_trace_id?: string
        }
        Returns: string
      }
      rpc_purge_channel_sticky: { Args: { p_id: string }; Returns: number }
      rpc_queue_rebalance_candidates: {
        Args: { p_limit?: number }
        Returns: {
          contact_id: string
          queue_id: string
          reason: string
          sla_priority: string
          waiting_minutes: number
        }[]
      }
      rpc_queue_sla_panel: {
        Args: {
          p_channel_type?: string
          p_skill_name?: string
          p_sla_status?: string
        }
        Returns: {
          active_agents: number
          at_risk_count: number
          auto_rebalance_enabled: boolean
          breached_count: number
          color: string
          in_progress_count: number
          last_routed_at: string
          max_wait_time_minutes: number
          oldest_wait_minutes: number
          queue_id: string
          queue_name: string
          routing_weight: number
          sla_priority: string
          waiting_count: number
        }[]
      }
      rpc_reactivate_service_channel: {
        Args: { p_id: string }
        Returns: {
          channel_type: string
          color: string
          created_at: string
          created_by: string | null
          default_queue_id: string | null
          description: string | null
          disabled_at: string | null
          disabled_reason: string | null
          display_name: string | null
          icon: string | null
          id: string
          is_default: boolean
          metadata: Json
          name: string
          paused_at: string | null
          paused_reason: string | null
          routing_mode: string
          status: string
          sticky_enabled: boolean
          sticky_ttl_hours: number
          updated_at: string
          whatsapp_connection_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_channels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_record_event_key_usage: {
        Args: { p_key_id: string }
        Returns: undefined
      }
      rpc_record_search_click: {
        Args: { p_query: string; p_result_id: string; p_result_type: string }
        Returns: undefined
      }
      rpc_register_webhook_event: {
        Args: {
          p_event_key: string
          p_event_type: string
          p_instance_name: string
          p_payload_hash?: string
        }
        Returns: boolean
      }
      rpc_resume_queue: {
        Args: { p_queue_id: string }
        Returns: {
          auto_rebalance_enabled: boolean
          color: string
          created_at: string
          department_id: string | null
          description: string | null
          distribution_algorithm: string
          id: string
          is_active: boolean | null
          max_concurrent_per_agent: number | null
          max_per_queue_per_agent: number | null
          max_queue_size: number | null
          max_wait_seconds: number | null
          max_wait_time_minutes: number | null
          name: string
          overflow_queue_id: string | null
          paused_at: string | null
          paused_by: string | null
          paused_reason: string | null
          priority: number | null
          routing_weight: number
          sla_priority: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "queues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_route_incoming_message: {
        Args: { p_connection_id: string; p_contact_id: string }
        Returns: Json
      }
      rpc_search_insights: { Args: { p_days?: number }; Returns: Json }
      rpc_unlink_channel_queue: {
        Args: { p_channel_id: string; p_queue_id: string }
        Returns: boolean
      }
      rpc_upsert_service_channel: {
        Args: {
          p_channel_type?: string
          p_color?: string
          p_default_queue_id?: string
          p_description?: string
          p_display_name?: string
          p_icon?: string
          p_id?: string
          p_is_default?: boolean
          p_name?: string
          p_routing_mode?: string
          p_sticky_enabled?: boolean
          p_sticky_ttl_hours?: number
          p_whatsapp_connection_id?: string
        }
        Returns: {
          channel_type: string
          color: string
          created_at: string
          created_by: string | null
          default_queue_id: string | null
          description: string | null
          disabled_at: string | null
          disabled_reason: string | null
          display_name: string | null
          icon: string | null
          id: string
          is_default: boolean
          metadata: Json
          name: string
          paused_at: string | null
          paused_reason: string | null
          routing_mode: string
          status: string
          sticky_enabled: boolean
          sticky_ttl_hours: number
          updated_at: string
          whatsapp_connection_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_channels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_contacts: {
        Args: {
          company_filter?: string
          contact_type_filter?: string
          date_from?: string
          job_title_filter?: string
          page_offset?: number
          page_size?: number
          search_term?: string
          sort_direction?: string
          sort_field?: string
          tag_filter?: string
        }
        Returns: {
          avatar_url: string
          company: string
          contact_type: string
          created_at: string
          email: string
          id: string
          job_title: string
          name: string
          nickname: string
          notes: string
          phone: string
          surname: string
          tags: string[]
          total_count: number
          updated_at: string
        }[]
      }
      search_knowledge_base: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          category: string
          content: string
          id: string
          rank: number
          tags: string[]
          title: string
        }[]
      }
      search_knowledge_base_rag: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text?: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          tags: string[]
          text_rank: number
          title: string
        }[]
      }
      skill_based_assign: { Args: { p_queue_id: string }; Returns: string }
      unpause_instance: { Args: { p_instance: string }; Returns: number }
      update_own_profile: {
        Args: {
          p_avatar_url?: string
          p_birthday?: string
          p_display_name?: string
          p_email?: string
          p_phone?: string
          p_signature?: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      validate_reset_token: { Args: { p_token: string }; Returns: string }
    }
    Enums: {
      ai_agent_decision:
        | "replied"
        | "escalated"
        | "skipped"
        | "failed"
        | "requested_info"
      ai_agent_mode: "autopilot" | "copilot"
      ai_provider_type:
        | "lovable_ai"
        | "openai_compatible"
        | "google_gemini"
        | "custom_webhook"
        | "custom_agent"
      app_role:
        | "admin"
        | "manager"
        | "supervisor"
        | "agent"
        | "special_agent"
        | "dev"
      channel_type:
        | "whatsapp"
        | "instagram"
        | "telegram"
        | "messenger"
        | "webchat"
        | "email"
      provider_type: "evolution" | "wppconnect" | "baileys" | "custom"
      service_account_type:
        | "google_sheets"
        | "google_docs"
        | "google_calendar"
        | "google_drive"
        | "dropbox"
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
      ai_agent_decision: [
        "replied",
        "escalated",
        "skipped",
        "failed",
        "requested_info",
      ],
      ai_agent_mode: ["autopilot", "copilot"],
      ai_provider_type: [
        "lovable_ai",
        "openai_compatible",
        "google_gemini",
        "custom_webhook",
        "custom_agent",
      ],
      app_role: [
        "admin",
        "manager",
        "supervisor",
        "agent",
        "special_agent",
        "dev",
      ],
      channel_type: [
        "whatsapp",
        "instagram",
        "telegram",
        "messenger",
        "webchat",
        "email",
      ],
      provider_type: ["evolution", "wppconnect", "baileys", "custom"],
      service_account_type: [
        "google_sheets",
        "google_docs",
        "google_calendar",
        "google_drive",
        "dropbox",
      ],
    },
  },
} as const
