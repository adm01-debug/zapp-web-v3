export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          earned_at: string
          id?: string
          profile_id: string
          xp_earned: number
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
      }
      agent_installed_skills: {
        Row: {
          id: string
          agent_id: string
          skill_id: string
          installed_at: string
          config_overrides: Json | null
        }
        Insert: {
          id?: string
          agent_id: string
          skill_id: string
          installed_at?: string
          config_overrides?: Json | null
        }
        Update: {
          id?: string
          agent_id?: string
          skill_id?: string
          installed_at?: string
          config_overrides?: Json | null
        }
      }
      agent_memories: {
        Row: {
          id: string
          workspace_id: string | null
          memory_type: string
          content: string
          source: string | null
          relevance_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          memory_type?: string
          content: string
          source?: string | null
          relevance_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          memory_type?: string
          content?: string
          source?: string | null
          relevance_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_permissions: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          permission_level: string
          granted_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          permission_level?: string
          granted_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          permission_level?: string
          granted_by?: string | null
          created_at?: string | null
        }
      }
      agent_presence: {
        Row: {
          id: string
          user_id: string
          status: string
          status_message: string | null
          current_queue_id: string | null
          active_conversations: number | null
          max_conversations: number | null
          last_activity_at: string | null
          went_online_at: string | null
          went_offline_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          status_message?: string | null
          current_queue_id?: string | null
          active_conversations?: number | null
          max_conversations?: number | null
          last_activity_at?: string | null
          went_online_at?: string | null
          went_offline_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          status_message?: string | null
          current_queue_id?: string | null
          active_conversations?: number | null
          max_conversations?: number | null
          last_activity_at?: string | null
          went_online_at?: string | null
          went_offline_at?: string | null
          updated_at?: string
        }
      }
      agent_skills: {
        Row: {
          id: string
          agent_id: string
          skill_name: string
          description: string
          pattern: string
          success_count: number
          failure_count: number
          confidence: number
          source_trace_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          skill_name: string
          description?: string
          pattern?: string
          success_count?: number
          failure_count?: number
          confidence?: number
          source_trace_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          skill_name?: string
          description?: string
          pattern?: string
          success_count?: number
          failure_count?: number
          confidence?: number
          source_trace_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_stats: {
        Row: {
          achievements_count: number
          avg_response_time_seconds: number | null
          best_streak: number
          conversations_resolved: number
          created_at: string | null
          current_streak: number
          customer_satisfaction_score: number | null
          id: string
          level: number
          messages_received: number
          messages_sent: number
          profile_id: string
          updated_at: string | null
          xp: number
        }
        Insert: {
          achievements_count: number
          avg_response_time_seconds?: number | null
          best_streak: number
          conversations_resolved: number
          created_at?: string | null
          current_streak: number
          customer_satisfaction_score?: number | null
          id?: string
          level: number
          messages_received: number
          messages_sent: number
          profile_id: string
          updated_at?: string | null
          xp: number
        }
        Update: {
          achievements_count?: number
          avg_response_time_seconds?: number | null
          best_streak?: number
          conversations_resolved?: number
          created_at?: string | null
          current_streak?: number
          customer_satisfaction_score?: number | null
          id?: string
          level?: number
          messages_received?: number
          messages_sent?: number
          profile_id?: string
          updated_at?: string | null
          xp?: number
        }
      }
      agent_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string | null
          icon: string | null
          config: Json
          is_public: boolean | null
          usage_count: number | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string | null
          icon?: string | null
          config?: Json
          is_public?: boolean | null
          usage_count?: number | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string | null
          icon?: string | null
          config?: Json
          is_public?: boolean | null
          usage_count?: number | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      agent_traces: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          session_id: string | null
          level: string | null
          event: string
          input: Json | null
          output: Json | null
          metadata: Json | null
          latency_ms: number | null
          tokens_used: number | null
          cost_usd: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          session_id?: string | null
          level?: string | null
          event: string
          input?: Json | null
          output?: Json | null
          metadata?: Json | null
          latency_ms?: number | null
          tokens_used?: number | null
          cost_usd?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          session_id?: string | null
          level?: string | null
          event?: string
          input?: Json | null
          output?: Json | null
          metadata?: Json | null
          latency_ms?: number | null
          tokens_used?: number | null
          cost_usd?: number | null
          created_at?: string
        }
      }
      agent_usage: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          date: string
          requests: number | null
          tokens_input: number | null
          tokens_output: number | null
          total_cost_usd: number | null
          avg_latency_ms: number | null
          error_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          date?: string
          requests?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          total_cost_usd?: number | null
          avg_latency_ms?: number | null
          error_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          date?: string
          requests?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          total_cost_usd?: number | null
          avg_latency_ms?: number | null
          error_count?: number | null
          created_at?: string
        }
      }
      agent_versions: {
        Row: {
          id: string
          agent_id: string
          version: number
          config: Json
          name: string | null
          model: string | null
          persona: string | null
          mission: string | null
          change_summary: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          version?: number
          config?: Json
          name?: string | null
          model?: string | null
          persona?: string | null
          mission?: string | null
          change_summary?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          version?: number
          config?: Json
          name?: string | null
          model?: string | null
          persona?: string | null
          mission?: string | null
          change_summary?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      agent_visibility_grants: {
        Row: {
          agent_id: string
          can_see_agent_id: string
          created_at: string | null
          granted_by: string | null
          id: string
        }
        Insert: {
          agent_id: string
          can_see_agent_id: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          can_see_agent_id?: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
        }
      }
      agents: {
        Row: {
          id: string
          user_id: string
          name: string
          mission: string | null
          persona: string | null
          avatar_emoji: string | null
          model: string | null
          reasoning: string | null
          status: string | null
          version: number | null
          config: Json
          tags: string[] | null
          is_template: boolean | null
          template_category: string | null
          created_at: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          mission?: string | null
          persona?: string | null
          avatar_emoji?: string | null
          model?: string | null
          reasoning?: string | null
          status?: string | null
          version?: number | null
          config?: Json
          tags?: string[] | null
          is_template?: boolean | null
          template_category?: string | null
          created_at?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          mission?: string | null
          persona?: string | null
          avatar_emoji?: string | null
          model?: string | null
          reasoning?: string | null
          status?: string | null
          version?: number | null
          config?: Json
          tags?: string[] | null
          is_template?: boolean | null
          template_category?: string | null
          created_at?: string
          updated_at?: string
          workspace_id?: string | null
        }
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
      }
      ai_providers: {
        Row: {
          api_endpoint: string | null
          api_key_secret_name: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          model: string | null
          name: string
          provider_type: string
          system_prompt: string | null
          updated_at: string | null
          use_for: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          model?: string | null
          name: string
          provider_type: string
          system_prompt?: string | null
          updated_at?: string | null
          use_for: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          model?: string | null
          name?: string
          provider_type?: string
          system_prompt?: string | null
          updated_at?: string | null
          use_for?: string
        }
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
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
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          profile_id?: string | null
          status: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
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
      }
      alert_channels: {
        Row: {
          id: number
          name: string
          channel_type: string
          config: Json
          min_severity: string
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          channel_type: string
          config: Json
          min_severity?: string
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          channel_type?: string
          config?: Json
          min_severity?: string
          is_active?: boolean
          created_at?: string | null
        }
      }
      alert_dispatch_state: {
        Row: {
          alert_key: string
          last_sent_at: string
          last_severity: string | null
          count_1h: number
        }
        Insert: {
          alert_key: string
          last_sent_at?: string
          last_severity?: string | null
          count_1h?: number
        }
        Update: {
          alert_key?: string
          last_sent_at?: string
          last_severity?: string | null
          count_1h?: number
        }
      }
      alerts: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          severity: string | null
          title: string
          message: string | null
          is_resolved: boolean | null
          resolved_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          severity?: string | null
          title: string
          message?: string | null
          is_resolved?: boolean | null
          resolved_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          severity?: string | null
          title?: string
          message?: string | null
          is_resolved?: boolean | null
          resolved_at?: string | null
          created_at?: string | null
        }
      }
      allowed_countries: {
        Row: {
          added_by: string | null
          country_code: string
          country_name: string
          created_at: string | null
          id: string
        }
        Insert: {
          added_by?: string | null
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
        }
        Update: {
          added_by?: string | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          name: string
          key_prefix: string
          key_hash: string
          scopes: string[] | null
          is_active: boolean | null
          last_used_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          name: string
          key_prefix: string
          key_hash: string
          scopes?: string[] | null
          is_active?: boolean | null
          last_used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          name?: string
          key_prefix?: string
          key_hash?: string
          scopes?: string[] | null
          is_active?: boolean | null
          last_used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      app_error_logs: {
        Row: {
          id: string
          error_id: string | null
          module: string
          message: string
          stack: string | null
          component_stack: string | null
          user_agent: string | null
          url: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          error_id?: string | null
          module?: string
          message: string
          stack?: string | null
          component_stack?: string | null
          user_agent?: string | null
          url?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          error_id?: string | null
          module?: string
          message?: string
          stack?: string | null
          component_stack?: string | null
          user_agent?: string | null
          url?: string | null
          timestamp?: string
          created_at?: string
        }
      }
      app_notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          type: string | null
          entity_type: string | null
          entity_id: string | null
          is_read: boolean | null
          action_url: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body?: string | null
          type?: string | null
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean | null
          action_url?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string | null
          type?: string | null
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean | null
          action_url?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      app_settings: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      audio_memes: {
        Row: {
          audio_url: string
          category: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_favorite: boolean
          name: string
          uploaded_by: string | null
          use_count: number
        }
        Insert: {
          audio_url: string
          category: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_favorite?: boolean
          name: string
          uploaded_by?: string | null
          use_count: number
        }
        Update: {
          audio_url?: string
          category?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_favorite?: boolean
          name?: string
          uploaded_by?: string | null
          use_count?: number
        }
      }
      audit_backfill_chunks: {
        Row: {
          chunk_num: number
          byte_start: number
          byte_end: number
          req_id: number | null
          processed: boolean | null
          inserted: number | null
          errors: number | null
          result: Json | null
          created_at: string | null
        }
        Insert: {
          chunk_num: number
          byte_start: number
          byte_end: number
          req_id?: number | null
          processed?: boolean | null
          inserted?: number | null
          errors?: number | null
          result?: Json | null
          created_at?: string | null
        }
        Update: {
          chunk_num?: number
          byte_start?: number
          byte_end?: number
          req_id?: number | null
          processed?: boolean | null
          inserted?: number | null
          errors?: number | null
          result?: Json | null
          created_at?: string | null
        }
      }
      audit_backfill_progress: {
        Row: {
          remote_jid: string
          source_msg_count: number | null
          api_total: number | null
          api_pages: number | null
          pages_fetched: number | null
          records_uploaded: number | null
          records_ingested: number | null
          status: string | null
          error_message: string | null
          started_at: string | null
          finished_at: string | null
          updated_at: string | null
        }
        Insert: {
          remote_jid: string
          source_msg_count?: number | null
          api_total?: number | null
          api_pages?: number | null
          pages_fetched?: number | null
          records_uploaded?: number | null
          records_ingested?: number | null
          status?: string | null
          error_message?: string | null
          started_at?: string | null
          finished_at?: string | null
          updated_at?: string | null
        }
        Update: {
          remote_jid?: string
          source_msg_count?: number | null
          api_total?: number | null
          api_pages?: number | null
          pages_fetched?: number | null
          records_uploaded?: number | null
          records_ingested?: number | null
          status?: string | null
          error_message?: string | null
          started_at?: string | null
          finished_at?: string | null
          updated_at?: string | null
        }
      }
      audit_dump_chunks: {
        Row: {
          chunk_num: number
          req_id: number | null
          status: number | null
          bytes: number | null
          content: string | null
          processed: boolean | null
          inserted: number | null
          conflict: number | null
          errors: number | null
          created_at: string | null
        }
        Insert: {
          chunk_num: number
          req_id?: number | null
          status?: number | null
          bytes?: number | null
          content?: string | null
          processed?: boolean | null
          inserted?: number | null
          conflict?: number | null
          errors?: number | null
          created_at?: string | null
        }
        Update: {
          chunk_num?: number
          req_id?: number | null
          status?: number | null
          bytes?: number | null
          content?: string | null
          processed?: boolean | null
          inserted?: number | null
          conflict?: number | null
          errors?: number | null
          created_at?: string | null
        }
      }
      audit_evo_fetches: {
        Row: {
          id: number
          remote_jid: string
          page: number
          req_id: number | null
          processed: boolean | null
          result: Json | null
          created_at: string | null
        }
        Insert: {
          id?: number
          remote_jid: string
          page?: number
          req_id?: number | null
          processed?: boolean | null
          result?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: number
          remote_jid?: string
          page?: number
          req_id?: number | null
          processed?: boolean | null
          result?: Json | null
          created_at?: string | null
        }
      }
      audit_full_diff: {
        Row: {
          message_id: string
          classification: string
          has_webhook: boolean | null
          has_raw_data: boolean | null
          message_timestamp: number | null
          message_type: string | null
          remote_jid: string | null
          recovery_status: string | null
          recovery_notes: string | null
          detected_at: string | null
          resolved_at: string | null
        }
        Insert: {
          message_id: string
          classification: string
          has_webhook?: boolean | null
          has_raw_data?: boolean | null
          message_timestamp?: number | null
          message_type?: string | null
          remote_jid?: string | null
          recovery_status?: string | null
          recovery_notes?: string | null
          detected_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          message_id?: string
          classification?: string
          has_webhook?: boolean | null
          has_raw_data?: boolean | null
          message_timestamp?: number | null
          message_type?: string | null
          remote_jid?: string | null
          recovery_status?: string | null
          recovery_notes?: string | null
          detected_at?: string | null
          resolved_at?: string | null
        }
      }
      audit_full_runs: {
        Row: {
          id: number
          run_ts: string | null
          batch_ts: string | null
          source_count: number | null
          fatorx_count: number | null
          missing_count: number | null
          orphan_count: number | null
          coverage_pct: number | null
          recovered_count: number | null
          unrecoverable_count: number | null
          notes: Json | null
        }
        Insert: {
          id?: number
          run_ts?: string | null
          batch_ts?: string | null
          source_count?: number | null
          fatorx_count?: number | null
          missing_count?: number | null
          orphan_count?: number | null
          coverage_pct?: number | null
          recovered_count?: number | null
          unrecoverable_count?: number | null
          notes?: Json | null
        }
        Update: {
          id?: number
          run_ts?: string | null
          batch_ts?: string | null
          source_count?: number | null
          fatorx_count?: number | null
          missing_count?: number | null
          orphan_count?: number | null
          coverage_pct?: number | null
          recovered_count?: number | null
          unrecoverable_count?: number | null
          notes?: Json | null
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
      }
      audit_log_tables: {
        Row: {
          id: number
          tbl_name: string
          operation: string
          row_id: string | null
          changed_by: string | null
          changed_fields: Json | null
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          tbl_name: string
          operation: string
          row_id?: string | null
          changed_by?: string | null
          changed_fields?: Json | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          tbl_name?: string
          operation?: string
          row_id?: string | null
          changed_by?: string | null
          changed_fields?: Json | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
      }
      audit_results: {
        Row: {
          id: number
          audit_name: string
          result: Json
          created_at: string | null
        }
        Insert: {
          id?: number
          audit_name: string
          result: Json
          created_at?: string | null
        }
        Update: {
          id?: number
          audit_name?: string
          result?: Json
          created_at?: string | null
        }
      }
      audit_source_full: {
        Row: {
          source_pk: string | null
          message_id: string
          message_timestamp: number | null
          message_type: string | null
          remote_jid: string | null
          from_me: boolean | null
          loaded_at: string | null
          batch_ts: string | null
        }
        Insert: {
          source_pk?: string | null
          message_id: string
          message_timestamp?: number | null
          message_type?: string | null
          remote_jid?: string | null
          from_me?: boolean | null
          loaded_at?: string | null
          batch_ts?: string | null
        }
        Update: {
          source_pk?: string | null
          message_id?: string
          message_timestamp?: number | null
          message_type?: string | null
          remote_jid?: string | null
          from_me?: boolean | null
          loaded_at?: string | null
          batch_ts?: string | null
        }
      }
      audit_source_head_10k: {
        Row: {
          source_id: string
          loaded_at: string | null
        }
        Insert: {
          source_id: string
          loaded_at?: string | null
        }
        Update: {
          source_id?: string
          loaded_at?: string | null
        }
      }
      audit_source_sample: {
        Row: {
          source_id: string
        }
        Insert: {
          source_id: string
        }
        Update: {
          source_id?: string
        }
      }
      audit_source_tail_10k: {
        Row: {
          source_id: string
          loaded_at: string | null
        }
        Insert: {
          source_id: string
          loaded_at?: string | null
        }
        Update: {
          source_id?: string
          loaded_at?: string | null
        }
      }
      audit_test_results: {
        Row: {
          id: number
          fase: string | null
          test_id: string | null
          test_name: string | null
          expectation: string | null
          observed: string | null
          passed: boolean | null
          severity: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          fase?: string | null
          test_id?: string | null
          test_name?: string | null
          expectation?: string | null
          observed?: string | null
          passed?: boolean | null
          severity?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          fase?: string | null
          test_id?: string | null
          test_name?: string | null
          expectation?: string | null
          observed?: string | null
          passed?: boolean | null
          severity?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      auto_close_config: {
        Row: {
          close_message: string | null
          created_at: string | null
          id: string
          inactivity_hours: number
          is_enabled: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          close_message?: string | null
          created_at?: string | null
          id?: string
          inactivity_hours: number
          is_enabled?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          close_message?: string | null
          created_at?: string | null
          id?: string
          inactivity_hours?: number
          is_enabled?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
      }
      automations: {
        Row: {
          actions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          trigger_config: Json
          trigger_count: number
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json
          trigger_count: number
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type?: string
          updated_at?: string | null
        }
      }
      avatars: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      away_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          whatsapp_connection_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_connection_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_connection_id?: string
        }
      }
      batch_jobs: {
        Row: {
          id: string
          workspace_id: string | null
          type: string
          status: string | null
          total_items: number | null
          processed_items: number | null
          failed_items: number | null
          config: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          type: string
          status?: string | null
          total_items?: number | null
          processed_items?: number | null
          failed_items?: number | null
          config?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          type?: string
          status?: string | null
          total_items?: number | null
          processed_items?: number | null
          failed_items?: number | null
          config?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
      }
      bling_token: {
        Row: {
          id: number
          conta: string
          client_id: string
          client_secret: string
          token: string
          access_token: string
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          id: number
          conta: string
          client_id?: string
          client_secret?: string
          token?: string
          access_token?: string
          refresh_token?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          conta?: string
          client_id?: string
          client_secret?: string
          token?: string
          access_token?: string
          refresh_token?: string
          updated_at?: string | null
        }
      }
      blocked_countries: {
        Row: {
          blocked_by: string | null
          country_code: string
          country_name: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string
          is_permanent: boolean | null
          last_attempt_at: string | null
          reason: string
          request_count: number | null
        }
        Insert: {
          blocked_at: string
          blocked_by?: string | null
          created_at?: string | null
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
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_permanent?: boolean | null
          last_attempt_at?: string | null
          reason?: string
          request_count?: number | null
        }
      }
      bpm_activity_log: {
        Row: {
          id: string
          workspace_id: string
          flow_id: string | null
          card_id: string | null
          register_id: string | null
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          changes: Json | null
          metadata: Json | null
          ip_address: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          flow_id?: string | null
          card_id?: string | null
          register_id?: string | null
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          changes?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          flow_id?: string | null
          card_id?: string | null
          register_id?: string | null
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          changes?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string | null
        }
      }
      bpm_automation_actions: {
        Row: {
          id: string
          automation_id: string
          action_type: string
          action_config: Json
          action_order: number
          agent_id: string | null
          mcp_server_id: string | null
          webhook_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          automation_id: string
          action_type: string
          action_config?: Json
          action_order?: number
          agent_id?: string | null
          mcp_server_id?: string | null
          webhook_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          automation_id?: string
          action_type?: string
          action_config?: Json
          action_order?: number
          agent_id?: string | null
          mcp_server_id?: string | null
          webhook_id?: string | null
          created_at?: string | null
        }
      }
      bpm_automation_conditions: {
        Row: {
          id: string
          automation_id: string
          condition_order: number
          logic_operator: string | null
          field_id: string | null
          field_path: string | null
          operator: string
          compare_value: string | null
          compare_values: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          automation_id: string
          condition_order?: number
          logic_operator?: string | null
          field_id?: string | null
          field_path?: string | null
          operator: string
          compare_value?: string | null
          compare_values?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          automation_id?: string
          condition_order?: number
          logic_operator?: string | null
          field_id?: string | null
          field_path?: string | null
          operator?: string
          compare_value?: string | null
          compare_values?: Json | null
          created_at?: string | null
        }
      }
      bpm_automation_executions: {
        Row: {
          id: string
          automation_id: string
          card_id: string | null
          trigger_data: Json | null
          status: string
          actions_executed: number | null
          actions_total: number | null
          result: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          execution_time_ms: number | null
        }
        Insert: {
          id?: string
          automation_id: string
          card_id?: string | null
          trigger_data?: Json | null
          status?: string
          actions_executed?: number | null
          actions_total?: number | null
          result?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          execution_time_ms?: number | null
        }
        Update: {
          id?: string
          automation_id?: string
          card_id?: string | null
          trigger_data?: Json | null
          status?: string
          actions_executed?: number | null
          actions_total?: number | null
          result?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          execution_time_ms?: number | null
        }
      }
      bpm_automations: {
        Row: {
          id: string
          flow_id: string
          name: string
          description: string | null
          is_active: boolean | null
          trigger_type: string
          trigger_config: Json
          conditions: Json | null
          execution_count: number | null
          last_executed_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          flow_id: string
          name: string
          description?: string | null
          is_active?: boolean | null
          trigger_type: string
          trigger_config?: Json
          conditions?: Json | null
          execution_count?: number | null
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          flow_id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          trigger_type?: string
          trigger_config?: Json
          conditions?: Json | null
          execution_count?: number | null
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_card_answer_fields: {
        Row: {
          id: string
          card_answer_id: string
          field_id: string
          value: string | null
          value_json: Json | null
          value_numeric: number | null
          value_date: string | null
          value_bool: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          card_answer_id: string
          field_id: string
          value?: string | null
          value_json?: Json | null
          value_numeric?: number | null
          value_date?: string | null
          value_bool?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          card_answer_id?: string
          field_id?: string
          value?: string | null
          value_json?: Json | null
          value_numeric?: number | null
          value_date?: string | null
          value_bool?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_card_answers: {
        Row: {
          id: string
          card_id: string
          form_id: string
          flow_step_id: string
          answered_by: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          form_id: string
          flow_step_id: string
          answered_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          form_id?: string
          flow_step_id?: string
          answered_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_card_attachments: {
        Row: {
          id: string
          card_id: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      bpm_card_checklist_items: {
        Row: {
          id: string
          checklist_id: string
          title: string
          is_checked: boolean | null
          sort_order: number
          checked_by: string | null
          checked_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          checklist_id: string
          title: string
          is_checked?: boolean | null
          sort_order?: number
          checked_by?: string | null
          checked_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          checklist_id?: string
          title?: string
          is_checked?: boolean | null
          sort_order?: number
          checked_by?: string | null
          checked_at?: string | null
          created_at?: string | null
        }
      }
      bpm_card_checklists: {
        Row: {
          id: string
          card_id: string
          title: string
          sort_order: number
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          title?: string
          sort_order?: number
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          title?: string
          sort_order?: number
          created_by?: string | null
          created_at?: string | null
        }
      }
      bpm_card_comments: {
        Row: {
          id: string
          card_id: string
          user_id: string
          content: string
          content_html: string | null
          mentions: string[] | null
          parent_id: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
          search_vector: string | null
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          content: string
          content_html?: string | null
          mentions?: string[] | null
          parent_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
          search_vector?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          user_id?: string
          content?: string
          content_html?: string | null
          mentions?: string[] | null
          parent_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
          search_vector?: string | null
        }
      }
      bpm_card_email_attachments: {
        Row: {
          id: string
          email_id: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string | null
        }
      }
      bpm_card_emails: {
        Row: {
          id: string
          card_id: string
          direction: string
          from_address: string
          to_addresses: string[]
          cc_addresses: string[] | null
          bcc_addresses: string[] | null
          subject: string | null
          body_text: string | null
          body_html: string | null
          message_id: string | null
          in_reply_to: string | null
          has_attachments: boolean | null
          email_config_id: string | null
          sent_by: string | null
          sent_at: string | null
          received_at: string | null
          is_read: boolean | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          direction: string
          from_address: string
          to_addresses?: string[]
          cc_addresses?: string[] | null
          bcc_addresses?: string[] | null
          subject?: string | null
          body_text?: string | null
          body_html?: string | null
          message_id?: string | null
          in_reply_to?: string | null
          has_attachments?: boolean | null
          email_config_id?: string | null
          sent_by?: string | null
          sent_at?: string | null
          received_at?: string | null
          is_read?: boolean | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          direction?: string
          from_address?: string
          to_addresses?: string[]
          cc_addresses?: string[] | null
          bcc_addresses?: string[] | null
          subject?: string | null
          body_text?: string | null
          body_html?: string | null
          message_id?: string | null
          in_reply_to?: string | null
          has_attachments?: boolean | null
          email_config_id?: string | null
          sent_by?: string | null
          sent_at?: string | null
          received_at?: string | null
          is_read?: boolean | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      bpm_card_labels: {
        Row: {
          card_id: string
          label_id: string
        }
        Insert: {
          card_id: string
          label_id: string
        }
        Update: {
          card_id?: string
          label_id?: string
        }
      }
      bpm_card_movements: {
        Row: {
          id: string
          card_id: string
          from_step_id: string | null
          to_step_id: string
          moved_by: string | null
          reason: string | null
          metadata: Json | null
          moved_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          from_step_id?: string | null
          to_step_id: string
          moved_by?: string | null
          reason?: string | null
          metadata?: Json | null
          moved_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          from_step_id?: string | null
          to_step_id?: string
          moved_by?: string | null
          reason?: string | null
          metadata?: Json | null
          moved_at?: string | null
        }
      }
      bpm_card_recurrences: {
        Row: {
          id: string
          card_id: string
          frequency: string
          interval_value: number | null
          day_of_week: number | null
          day_of_month: number | null
          base_date: string
          end_date: string | null
          max_occurrences: number | null
          current_occurrences: number | null
          behavior: string
          next_execution_at: string | null
          is_active: boolean | null
          last_executed_at: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          frequency: string
          interval_value?: number | null
          day_of_week?: number | null
          day_of_month?: number | null
          base_date: string
          end_date?: string | null
          max_occurrences?: number | null
          current_occurrences?: number | null
          behavior?: string
          next_execution_at?: string | null
          is_active?: boolean | null
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          frequency?: string
          interval_value?: number | null
          day_of_week?: number | null
          day_of_month?: number | null
          base_date?: string
          end_date?: string | null
          max_occurrences?: number | null
          current_occurrences?: number | null
          behavior?: string
          next_execution_at?: string | null
          is_active?: boolean | null
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      bpm_card_subtasks: {
        Row: {
          id: string
          card_id: string
          title: string
          is_completed: boolean | null
          assignee_id: string | null
          due_date: string | null
          sort_order: number
          completed_by: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          title: string
          is_completed?: boolean | null
          assignee_id?: string | null
          due_date?: string | null
          sort_order?: number
          completed_by?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          title?: string
          is_completed?: boolean | null
          assignee_id?: string | null
          due_date?: string | null
          sort_order?: number
          completed_by?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_card_time_entries: {
        Row: {
          id: string
          card_id: string
          user_id: string
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          started_at: string
          ended_at?: string | null
          duration_minutes?: number | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          description?: string | null
          created_at?: string | null
        }
      }
      bpm_card_watchers: {
        Row: {
          card_id: string
          user_id: string
          watch_type: string | null
          created_at: string | null
        }
        Insert: {
          card_id: string
          user_id: string
          watch_type?: string | null
          created_at?: string | null
        }
        Update: {
          card_id?: string
          user_id?: string
          watch_type?: string | null
          created_at?: string | null
        }
      }
      bpm_cards: {
        Row: {
          id: string
          flow_id: string
          current_step_id: string
          workspace_id: string
          title: string | null
          card_number: number
          status: string | null
          priority: number | null
          assignee_id: string | null
          due_date: string | null
          origin: string | null
          recurrence_config: Json | null
          metadata: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          deleted_at: string | null
          search_vector: string | null
        }
        Insert: {
          id?: string
          flow_id: string
          current_step_id: string
          workspace_id: string
          title?: string | null
          card_number?: number
          status?: string | null
          priority?: number | null
          assignee_id?: string | null
          due_date?: string | null
          origin?: string | null
          recurrence_config?: Json | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          search_vector?: string | null
        }
        Update: {
          id?: string
          flow_id?: string
          current_step_id?: string
          workspace_id?: string
          title?: string | null
          card_number?: number
          status?: string | null
          priority?: number | null
          assignee_id?: string | null
          due_date?: string | null
          origin?: string | null
          recurrence_config?: Json | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          search_vector?: string | null
        }
      }
      bpm_connections: {
        Row: {
          id: string
          source_type: string
          source_id: string
          target_type: string
          target_id: string
          connection_config: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source_type: string
          source_id: string
          target_type: string
          target_id: string
          connection_config?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source_type?: string
          source_id?: string
          target_type?: string
          target_id?: string
          connection_config?: Json | null
          created_at?: string | null
        }
      }
      bpm_dashboard_elements: {
        Row: {
          id: string
          flow_id: string
          element_type: string
          title: string | null
          config: Json
          element_order: number
          size_w: number | null
          size_h: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          flow_id: string
          element_type?: string
          title?: string | null
          config?: Json
          element_order?: number
          size_w?: number | null
          size_h?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          flow_id?: string
          element_type?: string
          title?: string | null
          config?: Json
          element_order?: number
          size_w?: number | null
          size_h?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_email_configs: {
        Row: {
          id: string
          workspace_id: string
          name: string
          smtp_host: string
          smtp_port: number
          smtp_user: string
          smtp_pass_credential_id: string | null
          from_email: string
          from_name: string
          is_verified: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          smtp_host: string
          smtp_port?: number
          smtp_user: string
          smtp_pass_credential_id?: string | null
          from_email: string
          from_name: string
          is_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          smtp_host?: string
          smtp_port?: number
          smtp_user?: string
          smtp_pass_credential_id?: string | null
          from_email?: string
          from_name?: string
          is_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_flow_steps: {
        Row: {
          id: string
          flow_id: string
          name: string
          description: string | null
          step_order: number
          color: string | null
          is_initial: boolean | null
          is_final: boolean | null
          sla_hours: number | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          flow_id: string
          name: string
          description?: string | null
          step_order?: number
          color?: string | null
          is_initial?: boolean | null
          is_final?: boolean | null
          sla_hours?: number | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          flow_id?: string
          name?: string
          description?: string | null
          step_order?: number
          color?: string | null
          is_initial?: boolean | null
          is_final?: boolean | null
          sla_hours?: number | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_flow_template_installs: {
        Row: {
          id: string
          template_id: string
          workspace_id: string
          flow_id: string | null
          installed_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_id: string
          workspace_id: string
          flow_id?: string | null
          installed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          workspace_id?: string
          flow_id?: string | null
          installed_by?: string | null
          created_at?: string | null
        }
      }
      bpm_flow_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          icon: string | null
          color: string | null
          preview_image_url: string | null
          is_public: boolean | null
          is_featured: boolean | null
          install_count: number | null
          rating: number | null
          definition: Json
          tags: string[] | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string
          icon?: string | null
          color?: string | null
          preview_image_url?: string | null
          is_public?: boolean | null
          is_featured?: boolean | null
          install_count?: number | null
          rating?: number | null
          definition?: Json
          tags?: string[] | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          icon?: string | null
          color?: string | null
          preview_image_url?: string | null
          is_public?: boolean | null
          is_featured?: boolean | null
          install_count?: number | null
          rating?: number | null
          definition?: Json
          tags?: string[] | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_flows: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          is_active: boolean | null
          default_view: string | null
          settings: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          is_active?: boolean | null
          default_view?: string | null
          settings?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          is_active?: boolean | null
          default_view?: string | null
          settings?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_form_fields: {
        Row: {
          id: string
          form_id: string
          field_hash: string
          label: string
          field_type: string
          is_required: boolean | null
          field_order: number
          options: Json | null
          default_value: string | null
          placeholder: string | null
          help_text: string | null
          validation_rules: Json | null
          conditional_rules: Json | null
          autocomplete_rules: Json | null
          config: Json | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          form_id: string
          field_hash: string
          label: string
          field_type: string
          is_required?: boolean | null
          field_order?: number
          options?: Json | null
          default_value?: string | null
          placeholder?: string | null
          help_text?: string | null
          validation_rules?: Json | null
          conditional_rules?: Json | null
          autocomplete_rules?: Json | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          form_id?: string
          field_hash?: string
          label?: string
          field_type?: string
          is_required?: boolean | null
          field_order?: number
          options?: Json | null
          default_value?: string | null
          placeholder?: string | null
          help_text?: string | null
          validation_rules?: Json | null
          conditional_rules?: Json | null
          autocomplete_rules?: Json | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_forms: {
        Row: {
          id: string
          flow_step_id: string | null
          flow_id: string
          name: string
          description: string | null
          is_public: boolean | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          flow_step_id?: string | null
          flow_id: string
          name: string
          description?: string | null
          is_public?: boolean | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          flow_step_id?: string | null
          flow_id?: string
          name?: string
          description?: string | null
          is_public?: boolean | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_labels: {
        Row: {
          id: string
          flow_id: string
          name: string
          color: string
          created_at: string | null
        }
        Insert: {
          id?: string
          flow_id: string
          name: string
          color?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          flow_id?: string
          name?: string
          color?: string
          created_at?: string | null
        }
      }
      bpm_notification_preferences: {
        Row: {
          id: string
          user_id: string
          flow_id: string | null
          notify_card_assigned: boolean | null
          notify_card_moved: boolean | null
          notify_comment_mention: boolean | null
          notify_comment_reply: boolean | null
          notify_due_date: boolean | null
          notify_email_received: boolean | null
          notify_subtask_completed: boolean | null
          notify_form_submission: boolean | null
          notify_automation_error: boolean | null
          digest_frequency: string | null
          channels: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          flow_id?: string | null
          notify_card_assigned?: boolean | null
          notify_card_moved?: boolean | null
          notify_comment_mention?: boolean | null
          notify_comment_reply?: boolean | null
          notify_due_date?: boolean | null
          notify_email_received?: boolean | null
          notify_subtask_completed?: boolean | null
          notify_form_submission?: boolean | null
          notify_automation_error?: boolean | null
          digest_frequency?: string | null
          channels?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          flow_id?: string | null
          notify_card_assigned?: boolean | null
          notify_card_moved?: boolean | null
          notify_comment_mention?: boolean | null
          notify_comment_reply?: boolean | null
          notify_due_date?: boolean | null
          notify_email_received?: boolean | null
          notify_subtask_completed?: boolean | null
          notify_form_submission?: boolean | null
          notify_automation_error?: boolean | null
          digest_frequency?: string | null
          channels?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_public_form_submissions: {
        Row: {
          id: string
          form_id: string
          flow_id: string
          share_id: string | null
          submitted_data: Json
          submitter_name: string | null
          submitter_email: string | null
          submitter_phone: string | null
          submitter_ip: string | null
          status: string | null
          card_id: string | null
          processed_at: string | null
          processed_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          form_id: string
          flow_id: string
          share_id?: string | null
          submitted_data?: Json
          submitter_name?: string | null
          submitter_email?: string | null
          submitter_phone?: string | null
          submitter_ip?: string | null
          status?: string | null
          card_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          form_id?: string
          flow_id?: string
          share_id?: string | null
          submitted_data?: Json
          submitter_name?: string | null
          submitter_email?: string | null
          submitter_phone?: string | null
          submitter_ip?: string | null
          status?: string | null
          card_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string | null
        }
      }
      bpm_public_share_access: {
        Row: {
          id: string
          share_id: string
          ip_address: string | null
          user_agent: string | null
          referrer: string | null
          accessed_at: string | null
        }
        Insert: {
          id?: string
          share_id: string
          ip_address?: string | null
          user_agent?: string | null
          referrer?: string | null
          accessed_at?: string | null
        }
        Update: {
          id?: string
          share_id?: string
          ip_address?: string | null
          user_agent?: string | null
          referrer?: string | null
          accessed_at?: string | null
        }
      }
      bpm_public_shares: {
        Row: {
          id: string
          share_type: string
          entity_id: string
          share_token: string
          is_active: boolean | null
          password_hash: string | null
          expires_at: string | null
          max_views: number | null
          view_count: number | null
          allowed_actions: Json | null
          branding: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          share_type: string
          entity_id: string
          share_token?: string
          is_active?: boolean | null
          password_hash?: string | null
          expires_at?: string | null
          max_views?: number | null
          view_count?: number | null
          allowed_actions?: Json | null
          branding?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          share_type?: string
          entity_id?: string
          share_token?: string
          is_active?: boolean | null
          password_hash?: string | null
          expires_at?: string | null
          max_views?: number | null
          view_count?: number | null
          allowed_actions?: Json | null
          branding?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_register_fields: {
        Row: {
          id: string
          register_id: string
          field_hash: string
          label: string
          field_type: string
          is_required: boolean | null
          field_order: number
          options: Json | null
          config: Json | null
          created_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          register_id: string
          field_hash: string
          label: string
          field_type: string
          is_required?: boolean | null
          field_order?: number
          options?: Json | null
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          register_id?: string
          field_hash?: string
          label?: string
          field_type?: string
          is_required?: boolean | null
          field_order?: number
          options?: Json | null
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_register_records: {
        Row: {
          id: string
          register_id: string
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          register_id: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          register_id?: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_register_values: {
        Row: {
          id: string
          record_id: string
          field_id: string
          value: string | null
          value_json: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          record_id: string
          field_id: string
          value?: string | null
          value_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          record_id?: string
          field_id?: string
          value?: string | null
          value_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_registers: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          icon: string | null
          max_records: number | null
          settings: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          icon?: string | null
          max_records?: number | null
          settings?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          icon?: string | null
          max_records?: number | null
          settings?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      bpm_saved_views: {
        Row: {
          id: string
          flow_id: string
          name: string
          view_type: string
          filters: Json | null
          sort_config: Json | null
          group_by: string | null
          visible_columns: Json | null
          column_widths: Json | null
          row_height: string | null
          row_contrast: string | null
          color_coding: Json | null
          is_default: boolean | null
          is_shared: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          flow_id: string
          name: string
          view_type?: string
          filters?: Json | null
          sort_config?: Json | null
          group_by?: string | null
          visible_columns?: Json | null
          column_widths?: Json | null
          row_height?: string | null
          row_contrast?: string | null
          color_coding?: Json | null
          is_default?: boolean | null
          is_shared?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          flow_id?: string
          name?: string
          view_type?: string
          filters?: Json | null
          sort_config?: Json | null
          group_by?: string | null
          visible_columns?: Json | null
          column_widths?: Json | null
          row_height?: string | null
          row_contrast?: string | null
          color_coding?: Json | null
          is_default?: boolean | null
          is_shared?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bpm_sla_records: {
        Row: {
          id: string
          card_id: string
          step_id: string
          sla_hours: number
          entered_at: string
          deadline_at: string
          exited_at: string | null
          is_breached: boolean | null
          breached_at: string | null
          time_in_step_minutes: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          step_id: string
          sla_hours: number
          entered_at?: string
          deadline_at: string
          exited_at?: string | null
          is_breached?: boolean | null
          breached_at?: string | null
          time_in_step_minutes?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          card_id?: string
          step_id?: string
          sla_hours?: number
          entered_at?: string
          deadline_at?: string
          exited_at?: string | null
          is_breached?: boolean | null
          breached_at?: string | null
          time_in_step_minutes?: number | null
          created_at?: string | null
        }
      }
      bpm_user_favorites: {
        Row: {
          id: string
          user_id: string
          entity_type: string
          entity_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: string
          entity_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: string
          entity_id?: string
          created_at?: string | null
        }
      }
      budgets: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          limit_usd: number
          current_usd: number | null
          period: string | null
          alert_threshold: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name?: string
          limit_usd?: number
          current_usd?: number | null
          period?: string | null
          alert_threshold?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          limit_usd?: number
          current_usd?: number | null
          period?: string | null
          alert_threshold?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      business_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
          updated_at: string | null
          whatsapp_connection_id: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string | null
          whatsapp_connection_id: string
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string | null
          whatsapp_connection_id?: string
        }
      }
      calls: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          contact_id: string | null
          created_at: string | null
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
          created_at?: string | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recording_url?: string | null
          started_at: string
          status: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          contact_id?: string | null
          created_at?: string | null
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
      }
      campaign_ab_variants: {
        Row: {
          campaign_id: string
          created_at: string | null
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
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          is_winner?: boolean | null
          media_url?: string | null
          message_content: string
          read_count?: number | null
          response_count?: number | null
          send_count?: number | null
          variant_name: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
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
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          sent_at?: string | null
          status: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
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
          updated_at: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count: number
          description?: string | null
          failed_count: number
          id?: string
          media_url?: string | null
          message_content: string
          message_type: string
          name: string
          read_count: number
          scheduled_at?: string | null
          send_interval_seconds?: number | null
          sent_count: number
          started_at?: string | null
          status: string
          target_filter?: Json | null
          target_type: string
          total_contacts: number
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
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
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
      }
      channel_connections: {
        Row: {
          channel_type: string
          config: Json | null
          created_at: string | null
          created_by: string | null
          credentials: Json | null
          external_account_id: string | null
          external_page_id: string | null
          id: string
          is_active: boolean | null
          name: string
          status: string
          updated_at: string | null
          webhook_url: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_type: string
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          status: string
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_type?: string
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          status?: string
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
      }
      channel_connections_safe: {
        Row: {
          channel_type: string | null
          created_at: string | null
          created_by: string | null
          external_account_id: string | null
          external_page_id: string | null
          id: string
          is_active: boolean | null
          name: string | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          external_account_id?: string | null
          external_page_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_connection_id?: string | null
        }
      }
      channel_routing_rules: {
        Row: {
          channel_connection_id: string | null
          channel_type: string
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          queue_id: string | null
        }
        Insert: {
          channel_connection_id?: string | null
          channel_type: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          queue_id?: string | null
        }
        Update: {
          channel_connection_id?: string | null
          channel_type?: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          queue_id?: string | null
        }
      }
      chatbot_executions: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
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
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          started_at: string
          status: string
          variables?: Json | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          started_at?: string
          status?: string
          variables?: Json | null
        }
      }
      chatbot_flows: {
        Row: {
          created_at: string | null
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
          updated_at: string | null
          variables: Json | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          nodes?: Json
          trigger_type: string
          trigger_value?: string | null
          updated_at?: string | null
          variables?: Json | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          created_at?: string | null
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
          updated_at?: string | null
          variables?: Json | null
          whatsapp_connection_id?: string | null
        }
      }
      chunks: {
        Row: {
          id: string
          document_id: string | null
          chunk_index: number
          content: string
          token_count: number | null
          embedding_status: string | null
          metadata: Json | null
          created_at: string | null
          parent_chunk_id: string | null
          chunk_level: string | null
          l0_abstract: string | null
          l1_overview: string | null
          embedding: string | null
          bm25_tsvector: string | null
        }
        Insert: {
          id?: string
          document_id?: string | null
          chunk_index?: number
          content: string
          token_count?: number | null
          embedding_status?: string | null
          metadata?: Json | null
          created_at?: string | null
          parent_chunk_id?: string | null
          chunk_level?: string | null
          l0_abstract?: string | null
          l1_overview?: string | null
          embedding?: string | null
          bm25_tsvector?: string | null
        }
        Update: {
          id?: string
          document_id?: string | null
          chunk_index?: number
          content?: string
          token_count?: number | null
          embedding_status?: string | null
          metadata?: Json | null
          created_at?: string | null
          parent_chunk_id?: string | null
          chunk_level?: string | null
          l0_abstract?: string | null
          l1_overview?: string | null
          embedding?: string | null
          bm25_tsvector?: string | null
        }
      }
      client_wallet_rules: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          whatsapp_connection_id?: string | null
        }
      }
      colaboradores: {
        Row: {
          id: number
          id_bitrix: number
          nome: string
          dialog_id: string | null
          chave_pix: string | null
          cargo: string | null
          ativo: boolean | null
          criado_em: string | null
          atualizado_em: string | null
        }
        Insert: {
          id?: number
          id_bitrix: number
          nome: string
          dialog_id?: string | null
          chave_pix?: string | null
          cargo?: string | null
          ativo?: boolean | null
          criado_em?: string | null
          atualizado_em?: string | null
        }
        Update: {
          id?: number
          id_bitrix?: number
          nome?: string
          dialog_id?: string | null
          chave_pix?: string | null
          cargo?: string | null
          ativo?: boolean | null
          criado_em?: string | null
          atualizado_em?: string | null
        }
      }
      collections: {
        Row: {
          id: string
          knowledge_base_id: string | null
          name: string
          description: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          knowledge_base_id?: string | null
          name: string
          description?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          knowledge_base_id?: string | null
          name?: string
          description?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
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
          checked_at: string
          connection_id: string
          error_message?: string | null
          id?: string
          instance_id: string
          response_time_ms?: number | null
          status: string
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
      }
      consent_records: {
        Row: {
          id: string
          user_id: string
          consent_type: string
          granted: boolean
          ip_address: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          consent_type: string
          granted?: boolean
          ip_address?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          consent_type?: string
          granted?: boolean
          ip_address?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      constraint_changelog: {
        Row: {
          id: string
          event_time: string
          command_tag: string
          object_type: string | null
          object_identity: string | null
          schema_name: string | null
          role_name: string | null
          in_extension: boolean | null
          details: Json | null
        }
        Insert: {
          id?: string
          event_time?: string
          command_tag: string
          object_type?: string | null
          object_identity?: string | null
          schema_name?: string | null
          role_name?: string | null
          in_extension?: boolean | null
          details?: Json | null
        }
        Update: {
          id?: string
          event_time?: string
          command_tag?: string
          object_type?: string | null
          object_identity?: string | null
          schema_name?: string | null
          role_name?: string | null
          in_extension?: boolean | null
          details?: Json | null
        }
      }
      contact_audit_log: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      contact_custom_fields: {
        Row: {
          contact_id: string
          created_at: string | null
          field_name: string
          field_type: string
          field_value: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          field_name: string
          field_type: string
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          field_name?: string
          field_type?: string
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
      }
      contact_notes: {
        Row: {
          author_id: string
          contact_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          contact_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          contact_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
      }
      contact_phones: {
        Row: {
          id: string
          contact_id: string
          phone_raw: string
          phone_normalized: string
          phone_e164: string | null
          country_code: string | null
          area_code: string | null
          has_ninth_digit: boolean | null
          is_primary: boolean | null
          is_whatsapp: boolean | null
          verified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          phone_raw: string
          phone_normalized: string
          phone_e164?: string | null
          country_code?: string | null
          area_code?: string | null
          has_ninth_digit?: boolean | null
          is_primary?: boolean | null
          is_whatsapp?: boolean | null
          verified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          phone_raw?: string
          phone_normalized?: string
          phone_e164?: string | null
          country_code?: string | null
          area_code?: string | null
          has_ninth_digit?: boolean | null
          is_primary?: boolean | null
          is_whatsapp?: boolean | null
          verified_at?: string | null
          created_at?: string
        }
      }
      contact_purchases: {
        Row: {
          amount: number | null
          contact_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_id: string | null
          description: string | null
          id: string
          purchase_type: string | null
          purchased_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          contact_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          purchase_type?: string | null
          purchased_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          contact_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          purchase_type?: string | null
          purchased_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
      }
      contatos: {
        Row: {
          id: number
          created_at: string
          nome: string | null
          telefone: string | null
          bitrix_empresa_id: string | null
          bitrix_contato_id: string | null
          sobrenome: string | null
          email: Json | null
        }
        Insert: {
          id: number
          created_at?: string
          nome?: string | null
          telefone?: string | null
          bitrix_empresa_id?: string | null
          bitrix_contato_id?: string | null
          sobrenome?: string | null
          email?: Json | null
        }
        Update: {
          id?: number
          created_at?: string
          nome?: string | null
          telefone?: string | null
          bitrix_empresa_id?: string | null
          bitrix_contato_id?: string | null
          sobrenome?: string | null
          email?: Json | null
        }
      }
      conversation_analyses: {
        Row: {
          analyzed_by: string | null
          contact_id: string
          created_at: string | null
          customer_satisfaction: number | null
          department: string | null
          id: string
          key_points: string | null
          message_count: number | null
          next_steps: string | null
          relationship_type: string | null
          sentiment: string
          sentiment_score: number | null
          status: string
          summary: string
          topics: string | null
          urgency: string | null
        }
        Insert: {
          analyzed_by?: string | null
          contact_id: string
          created_at?: string | null
          customer_satisfaction?: number | null
          department?: string | null
          id?: string
          key_points?: string | null
          message_count?: number | null
          next_steps?: string | null
          relationship_type?: string | null
          sentiment: string
          sentiment_score?: number | null
          status: string
          summary: string
          topics?: string | null
          urgency?: string | null
        }
        Update: {
          analyzed_by?: string | null
          contact_id?: string
          created_at?: string | null
          customer_satisfaction?: number | null
          department?: string | null
          id?: string
          key_points?: string | null
          message_count?: number | null
          next_steps?: string | null
          relationship_type?: string | null
          sentiment?: string
          sentiment_score?: number | null
          status?: string
          summary?: string
          topics?: string | null
          urgency?: string | null
        }
      }
      conversation_closures: {
        Row: {
          classification: string | null
          close_reason: string
          closed_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
          outcome: string | null
        }
        Insert: {
          classification?: string | null
          close_reason: string
          closed_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          classification?: string | null
          close_reason?: string
          closed_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
        }
      }
      conversation_events: {
        Row: {
          contact_id: string
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      }
      conversation_memory: {
        Row: {
          commercial_summary: string | null
          contact_id: string
          created_at: string | null
          cumulative_summary: string | null
          facts: Json | null
          id: string
          objections_handled: Json | null
          pending_items: Json | null
          promises_made: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          commercial_summary?: string | null
          contact_id: string
          created_at?: string | null
          cumulative_summary?: string | null
          facts?: Json | null
          id?: string
          objections_handled?: Json | null
          pending_items?: Json | null
          promises_made?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          commercial_summary?: string | null
          contact_id?: string
          created_at?: string | null
          cumulative_summary?: string | null
          facts?: Json | null
          id?: string
          objections_handled?: Json | null
          pending_items?: Json | null
          promises_made?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
      }
      conversation_sla: {
        Row: {
          contact_id: string | null
          created_at: string | null
          first_message_at: string
          first_response_at: string | null
          first_response_breached: boolean | null
          id: string
          resolution_breached: boolean | null
          resolved_at: string | null
          sla_configuration_id: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          first_message_at: string
          first_response_at?: string | null
          first_response_breached?: boolean | null
          id?: string
          resolution_breached?: boolean | null
          resolved_at?: string | null
          sla_configuration_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          first_message_at?: string
          first_response_at?: string | null
          first_response_breached?: boolean | null
          id?: string
          resolution_breached?: boolean | null
          resolved_at?: string | null
          sla_configuration_id?: string | null
          updated_at?: string | null
        }
      }
      conversation_snoozes: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          reason: string | null
          snooze_until: string
          snoozed_by: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          snooze_until: string
          snoozed_by: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          snooze_until?: string
          snoozed_by?: string
        }
      }
      conversation_summaries: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      conversation_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority: string
          status: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
      }
      conversation_transfers: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      conversations: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          pinned_by: string
          position: number
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          pinned_by: string
          position: number
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          pinned_by?: string
          position?: number
        }
      }
      cookies_config: {
        Row: {
          id: number
          servico: string
          cookie: string
          token: string | null
          cnpj: string | null
          csrf_token: string | null
          atualizado_em: string | null
        }
        Insert: {
          id?: number
          servico: string
          cookie: string
          token?: string | null
          cnpj?: string | null
          csrf_token?: string | null
          atualizado_em?: string | null
        }
        Update: {
          id?: number
          servico?: string
          cookie?: string
          token?: string | null
          cnpj?: string | null
          csrf_token?: string | null
          atualizado_em?: string | null
        }
      }
      credential_audit_logs: {
        Row: {
          id: string
          credential_id: string | null
          action: string
          user_id: string | null
          ip_address: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          credential_id?: string | null
          action: string
          user_id?: string | null
          ip_address?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          credential_id?: string | null
          action?: string
          user_id?: string | null
          ip_address?: string | null
          details?: Json | null
          created_at?: string | null
        }
      }
      credential_vault: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          provider: string
          encrypted_value: string
          metadata: Json | null
          last_rotated_at: string | null
          expires_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          provider: string
          encrypted_value: string
          metadata?: Json | null
          last_rotated_at?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          provider?: string
          encrypted_value?: string
          metadata?: Json | null
          last_rotated_at?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      cron_schedule_executions: {
        Row: {
          id: string
          schedule_id: string | null
          status: string | null
          output: Json | null
          error: string | null
          duration_ms: number | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          schedule_id?: string | null
          status?: string | null
          output?: Json | null
          error?: string | null
          duration_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          schedule_id?: string | null
          status?: string | null
          output?: Json | null
          error?: string | null
          duration_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      cron_schedules: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          cron_expression: string
          edge_function: string
          payload: Json | null
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          cron_expression: string
          edge_function: string
          payload?: Json | null
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          cron_expression?: string
          edge_function?: string
          payload?: Json | null
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          created_at?: string | null
        }
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
      }
      csat_responses: {
        Row: {
          id: string
          contact_id: string | null
          conversation_id: string | null
          agent_id: string | null
          instance_name: string | null
          rating: number | null
          comment: string | null
          response_time_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          conversation_id?: string | null
          agent_id?: string | null
          instance_name?: string | null
          rating?: number | null
          comment?: string | null
          response_time_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          conversation_id?: string | null
          agent_id?: string | null
          instance_name?: string | null
          rating?: number | null
          comment?: string | null
          response_time_seconds?: number | null
          created_at?: string
        }
      }
      csat_surveys: {
        Row: {
          agent_id: string
          contact_id: string
          conversation_resolved_at: string | null
          created_at: string | null
          feedback: string | null
          id: string
          rating: number
        }
        Insert: {
          agent_id: string
          contact_id: string
          conversation_resolved_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating: number
        }
        Update: {
          agent_id?: string
          contact_id?: string
          conversation_resolved_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number
        }
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
      }
      data_deletion_requests: {
        Row: {
          id: string
          user_id: string
          status: string
          reason: string | null
          requested_at: string
          completed_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          reason?: string | null
          requested_at?: string
          completed_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          reason?: string | null
          requested_at?: string
          completed_at?: string | null
          metadata?: Json | null
        }
      }
      dead_letter_queue: {
        Row: {
          id: string
          original_queue_id: string | null
          original_item_id: string | null
          payload: Json
          error: string | null
          attempts: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          original_queue_id?: string | null
          original_item_id?: string | null
          payload?: Json
          error?: string | null
          attempts?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          original_queue_id?: string | null
          original_item_id?: string | null
          payload?: Json
          error?: string | null
          attempts?: number | null
          created_at?: string | null
        }
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
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string | null
        }
      }
      deploy_connections: {
        Row: {
          id: string
          agent_id: string
          workspace_id: string | null
          channel: string
          status: string
          config: Json | null
          error_message: string | null
          message_count: number | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          workspace_id?: string | null
          channel: string
          status?: string
          config?: Json | null
          error_message?: string | null
          message_count?: number | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          workspace_id?: string | null
          channel?: string
          status?: string
          config?: Json | null
          error_message?: string | null
          message_count?: number | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          collection_id: string | null
          title: string
          source_type: string | null
          source_url: string | null
          mime_type: string | null
          size_bytes: number | null
          status: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          collection_id?: string | null
          title: string
          source_type?: string | null
          source_url?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          collection_id?: string | null
          title?: string
          source_type?: string | null
          source_url?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      email_contact_scores: {
        Row: {
          id: string
          user_id: string
          email: string
          display_name: string | null
          engagement_score: number | null
          total_sent: number | null
          total_opens: number | null
          total_clicks: number | null
          last_interaction: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          display_name?: string | null
          engagement_score?: number | null
          total_sent?: number | null
          total_opens?: number | null
          total_clicks?: number | null
          last_interaction?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          display_name?: string | null
          engagement_score?: number | null
          total_sent?: number | null
          total_opens?: number | null
          total_clicks?: number | null
          last_interaction?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      email_link_click_events: {
        Row: {
          id: string
          link_id: string
          tracking_id: string
          ip_address: string | null
          user_agent: string | null
          country: string | null
          city: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          link_id: string
          tracking_id: string
          ip_address?: string | null
          user_agent?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          link_id?: string
          tracking_id?: string
          ip_address?: string | null
          user_agent?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          created_at?: string | null
        }
      }
      email_templates: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      email_threads: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          gmail_account_id: string
          gmail_thread_id: string
          id: string
          is_important: boolean
          is_starred: boolean
          is_unread: boolean
          label_ids: string
          last_message_at: string
          message_count: number
          priority: string
          snippet: string
          status: string
          subject: string
          tags: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          gmail_account_id: string
          gmail_thread_id: string
          id?: string
          is_important?: boolean
          is_starred?: boolean
          is_unread?: boolean
          label_ids: string
          last_message_at: string
          message_count: number
          priority: string
          snippet: string
          status: string
          subject: string
          tags: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          gmail_account_id?: string
          gmail_thread_id?: string
          id?: string
          is_important?: boolean
          is_starred?: boolean
          is_unread?: boolean
          label_ids?: string
          last_message_at?: string
          message_count?: number
          priority?: string
          snippet?: string
          status?: string
          subject?: string
          tags?: string
          updated_at?: string | null
        }
      }
      email_tracked_links: {
        Row: {
          id: string
          link_id: string
          tracking_id: string
          original_url: string
          display_text: string | null
          position: number | null
          click_count: number | null
          first_clicked_at: string | null
          last_clicked_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          link_id?: string
          tracking_id: string
          original_url: string
          display_text?: string | null
          position?: number | null
          click_count?: number | null
          first_clicked_at?: string | null
          last_clicked_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          link_id?: string
          tracking_id?: string
          original_url?: string
          display_text?: string | null
          position?: number | null
          click_count?: number | null
          first_clicked_at?: string | null
          last_clicked_at?: string | null
          created_at?: string | null
        }
      }
      email_tracked_messages: {
        Row: {
          id: string
          tracking_id: string
          user_id: string
          account_id: string | null
          provider: string | null
          recipient_email: string
          recipient_name: string | null
          sender_email: string
          subject: string | null
          thread_id: string | null
          gmail_message_id: string | null
          has_tracking_pixel: boolean | null
          has_tracked_links: boolean | null
          tracked_link_count: number | null
          delivery_status: string | null
          bounce_type: string | null
          open_count: number | null
          click_count: number | null
          first_opened_at: string | null
          last_opened_at: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tracking_id?: string
          user_id: string
          account_id?: string | null
          provider?: string | null
          recipient_email: string
          recipient_name?: string | null
          sender_email: string
          subject?: string | null
          thread_id?: string | null
          gmail_message_id?: string | null
          has_tracking_pixel?: boolean | null
          has_tracked_links?: boolean | null
          tracked_link_count?: number | null
          delivery_status?: string | null
          bounce_type?: string | null
          open_count?: number | null
          click_count?: number | null
          first_opened_at?: string | null
          last_opened_at?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tracking_id?: string
          user_id?: string
          account_id?: string | null
          provider?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sender_email?: string
          subject?: string | null
          thread_id?: string | null
          gmail_message_id?: string | null
          has_tracking_pixel?: boolean | null
          has_tracked_links?: boolean | null
          tracked_link_count?: number | null
          delivery_status?: string | null
          bounce_type?: string | null
          open_count?: number | null
          click_count?: number | null
          first_opened_at?: string | null
          last_opened_at?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      email_tracking_events: {
        Row: {
          id: string
          tracking_id: string
          event_type: string | null
          ip_address: string | null
          user_agent: string | null
          country: string | null
          city: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          is_self_open: boolean | null
          is_bot: boolean | null
          referer: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tracking_id: string
          event_type?: string | null
          ip_address?: string | null
          user_agent?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          is_self_open?: boolean | null
          is_bot?: boolean | null
          referer?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          tracking_id?: string
          event_type?: string | null
          ip_address?: string | null
          user_agent?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          is_self_open?: boolean | null
          is_bot?: boolean | null
          referer?: string | null
          created_at?: string | null
        }
      }
      embedding_configs: {
        Row: {
          id: string
          workspace_id: string | null
          knowledge_base_id: string | null
          provider: string
          dimension: number
          task: string
          reranker_model: string | null
          reranker_top_k: number | null
          hybrid_search: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          knowledge_base_id?: string | null
          provider?: string
          dimension?: number
          task?: string
          reranker_model?: string | null
          reranker_top_k?: number | null
          hybrid_search?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          knowledge_base_id?: string | null
          provider?: string
          dimension?: number
          task?: string
          reranker_model?: string | null
          reranker_top_k?: number | null
          hybrid_search?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      empresas: {
        Row: {
          id: number
          created_at: string
          nome: string | null
          email: Json | null
          telefone: string | null
          bitrix_empresa_id: string | null
        }
        Insert: {
          id: number
          created_at?: string
          nome?: string | null
          email?: Json | null
          telefone?: string | null
          bitrix_empresa_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          nome?: string | null
          email?: Json | null
          telefone?: string | null
          bitrix_empresa_id?: string | null
        }
      }
      engineering_principles: {
        Row: {
          id: number
          code: string
          title: string
          category: string
          severity: string
          context: string
          lesson: string
          discovered_at: string | null
          batch_ref: string | null
        }
        Insert: {
          id?: number
          code: string
          title: string
          category: string
          severity: string
          context: string
          lesson: string
          discovered_at?: string | null
          batch_ref?: string | null
        }
        Update: {
          id?: number
          code?: string
          title?: string
          category?: string
          severity?: string
          context?: string
          lesson?: string
          discovered_at?: string | null
          batch_ref?: string | null
        }
      }
      entity_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string | null
          data: Json
          entity_id: string
          entity_type: string
          id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          data?: Json
          entity_id: string
          entity_type: string
          id?: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          data?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          version_number?: number
        }
      }
      environments: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          config: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name?: string
          config?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          config?: Json | null
          created_at?: string | null
        }
      }
      evaluation_datasets: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          description: string | null
          case_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          description?: string | null
          case_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          description?: string | null
          case_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evaluation_runs: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          name: string
          status: string | null
          test_cases: number | null
          pass_rate: number | null
          results: Json | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          name: string
          status?: string | null
          test_cases?: number | null
          pass_rate?: number | null
          results?: Json | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          name?: string
          status?: string | null
          test_cases?: number | null
          pass_rate?: number | null
          results?: Json | null
          created_at?: string | null
          completed_at?: string | null
        }
      }
      evolution_alerts: {
        Row: {
          id: string
          alert_type: string
          severity: string
          message: string
          payload: Json | null
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          remote_jid: string | null
          contact_id: string | null
          title: string | null
          description: string | null
        }
        Insert: {
          id?: string
          alert_type: string
          severity: string
          message: string
          payload?: Json | null
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          remote_jid?: string | null
          contact_id?: string | null
          title?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          alert_type?: string
          severity?: string
          message?: string
          payload?: Json | null
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          remote_jid?: string | null
          contact_id?: string | null
          title?: string | null
          description?: string | null
        }
      }
      evolution_audit_log: {
        Row: {
          id: string
          action: string
          entity_type: string
          entity_id: string | null
          performed_by: string
          performed_by_type: string | null
          old_values: Json | null
          new_values: Json | null
          changes: Json | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          action: string
          entity_type: string
          entity_id?: string | null
          performed_by?: string
          performed_by_type?: string | null
          old_values?: Json | null
          new_values?: Json | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          performed_by?: string
          performed_by_type?: string | null
          old_values?: Json | null
          new_values?: Json | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      evolution_automation_logs: {
        Row: {
          id: string
          automation_id: string | null
          contact_id: string | null
          status: string | null
          trigger_data: Json | null
          action_result: Json | null
          error_message: string | null
          executed_at: string | null
        }
        Insert: {
          id?: string
          automation_id?: string | null
          contact_id?: string | null
          status?: string | null
          trigger_data?: Json | null
          action_result?: Json | null
          error_message?: string | null
          executed_at?: string | null
        }
        Update: {
          id?: string
          automation_id?: string | null
          contact_id?: string | null
          status?: string | null
          trigger_data?: Json | null
          action_result?: Json | null
          error_message?: string | null
          executed_at?: string | null
        }
      }
      evolution_automations: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_type: string
          trigger_config: Json
          action_type: string
          action_config: Json
          conditions: Json | null
          delay_minutes: number | null
          is_active: boolean | null
          run_count: number | null
          last_run_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_type: string
          trigger_config?: Json
          action_type: string
          action_config?: Json
          conditions?: Json | null
          delay_minutes?: number | null
          is_active?: boolean | null
          run_count?: number | null
          last_run_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_type?: string
          trigger_config?: Json
          action_type?: string
          action_config?: Json
          conditions?: Json | null
          delay_minutes?: number | null
          is_active?: boolean | null
          run_count?: number | null
          last_run_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_backfill_audit: {
        Row: {
          id: string
          batch_id: string | null
          inserted: number | null
          updated: number | null
          skipped: number | null
          errors: number | null
          first_msg: string | null
          last_msg: string | null
          executed_at: string | null
          executed_by: string | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          inserted?: number | null
          updated?: number | null
          skipped?: number | null
          errors?: number | null
          first_msg?: string | null
          last_msg?: string | null
          executed_at?: string | null
          executed_by?: string | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          inserted?: number | null
          updated?: number | null
          skipped?: number | null
          errors?: number | null
          first_msg?: string | null
          last_msg?: string | null
          executed_at?: string | null
          executed_by?: string | null
        }
      }
      evolution_baileys_session_history: {
        Row: {
          id: string
          occurred_at: string
          event_type: string
          prev_state: string | null
          new_state: string | null
          reason_code: string | null
          classification: string | null
          is_recovery: boolean | null
          duration_offline_min: number | null
          instance_name: string | null
          payload: Json | null
          source_event_id: string | null
          auto_action_taken: string | null
          alerts_resolved: number | null
          messages_reset: number | null
        }
        Insert: {
          id?: string
          occurred_at?: string
          event_type: string
          prev_state?: string | null
          new_state?: string | null
          reason_code?: string | null
          classification?: string | null
          is_recovery?: boolean | null
          duration_offline_min?: number | null
          instance_name?: string | null
          payload?: Json | null
          source_event_id?: string | null
          auto_action_taken?: string | null
          alerts_resolved?: number | null
          messages_reset?: number | null
        }
        Update: {
          id?: string
          occurred_at?: string
          event_type?: string
          prev_state?: string | null
          new_state?: string | null
          reason_code?: string | null
          classification?: string | null
          is_recovery?: boolean | null
          duration_offline_min?: number | null
          instance_name?: string | null
          payload?: Json | null
          source_event_id?: string | null
          auto_action_taken?: string | null
          alerts_resolved?: number | null
          messages_reset?: number | null
        }
      }
      evolution_bitrix_field_mapping: {
        Row: {
          id: string
          entity_type: string
          local_field: string
          bitrix_field: string
          transform_type: string | null
          transform_config: Json | null
          sync_direction: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          entity_type: string
          local_field: string
          bitrix_field: string
          transform_type?: string | null
          transform_config?: Json | null
          sync_direction?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          entity_type?: string
          local_field?: string
          bitrix_field?: string
          transform_type?: string | null
          transform_config?: Json | null
          sync_direction?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      evolution_bitrix_queue: {
        Row: {
          id: string
          operation: string
          entity_type: string
          local_id: string
          payload: Json
          status: string | null
          attempts: number | null
          max_attempts: number | null
          last_error: string | null
          created_at: string | null
          processed_at: string | null
          next_attempt_at: string | null
        }
        Insert: {
          id?: string
          operation: string
          entity_type: string
          local_id: string
          payload: Json
          status?: string | null
          attempts?: number | null
          max_attempts?: number | null
          last_error?: string | null
          created_at?: string | null
          processed_at?: string | null
          next_attempt_at?: string | null
        }
        Update: {
          id?: string
          operation?: string
          entity_type?: string
          local_id?: string
          payload?: Json
          status?: string | null
          attempts?: number | null
          max_attempts?: number | null
          last_error?: string | null
          created_at?: string | null
          processed_at?: string | null
          next_attempt_at?: string | null
        }
      }
      evolution_bitrix_sync: {
        Row: {
          id: string
          entity_type: string
          local_id: string
          bitrix_entity_type: string
          bitrix_id: number
          sync_status: string | null
          last_sync_at: string | null
          last_error: string | null
          local_version: number | null
          bitrix_version: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          entity_type: string
          local_id: string
          bitrix_entity_type: string
          bitrix_id: number
          sync_status?: string | null
          last_sync_at?: string | null
          last_error?: string | null
          local_version?: number | null
          bitrix_version?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          entity_type?: string
          local_id?: string
          bitrix_entity_type?: string
          bitrix_id?: number
          sync_status?: string | null
          last_sync_at?: string | null
          last_error?: string | null
          local_version?: number | null
          bitrix_version?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_blacklist: {
        Row: {
          id: string
          remote_jid: string
          reason: string | null
          description: string | null
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          remote_jid: string
          reason?: string | null
          description?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          remote_jid?: string
          reason?: string | null
          description?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      evolution_broadcasts: {
        Row: {
          id: string
          name: string
          description: string | null
          template_id: string | null
          content: string | null
          media_url: string | null
          segment_type: string | null
          segment_config: Json | null
          scheduled_at: string | null
          started_at: string | null
          completed_at: string | null
          status: string | null
          total_recipients: number | null
          sent_count: number | null
          delivered_count: number | null
          read_count: number | null
          failed_count: number | null
          response_count: number | null
          messages_per_minute: number | null
          created_by: string | null
          instance_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          template_id?: string | null
          content?: string | null
          media_url?: string | null
          segment_type?: string | null
          segment_config?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          status?: string | null
          total_recipients?: number | null
          sent_count?: number | null
          delivered_count?: number | null
          read_count?: number | null
          failed_count?: number | null
          response_count?: number | null
          messages_per_minute?: number | null
          created_by?: string | null
          instance_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          template_id?: string | null
          content?: string | null
          media_url?: string | null
          segment_type?: string | null
          segment_config?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          status?: string | null
          total_recipients?: number | null
          sent_count?: number | null
          delivered_count?: number | null
          read_count?: number | null
          failed_count?: number | null
          response_count?: number | null
          messages_per_minute?: number | null
          created_by?: string | null
          instance_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_business_hours: {
        Row: {
          id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_closed: boolean | null
          timezone: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          day_of_week: number
          open_time: string
          close_time: string
          is_closed?: boolean | null
          timezone?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          day_of_week?: number
          open_time?: string
          close_time?: string
          is_closed?: boolean | null
          timezone?: string | null
          created_at?: string | null
        }
      }
      evolution_calls: {
        Row: {
          id: string
          call_id: string
          remote_jid: string
          contact_id: string | null
          call_type: string
          call_status: string
          direction: string
          duration_seconds: number | null
          started_at: string | null
          ended_at: string | null
          missed_callback_sent: boolean | null
          instance_name: string | null
          raw_data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          call_id: string
          remote_jid: string
          contact_id?: string | null
          call_type: string
          call_status: string
          direction: string
          duration_seconds?: number | null
          started_at?: string | null
          ended_at?: string | null
          missed_callback_sent?: boolean | null
          instance_name?: string | null
          raw_data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          call_id?: string
          remote_jid?: string
          contact_id?: string | null
          call_type?: string
          call_status?: string
          direction?: string
          duration_seconds?: number | null
          started_at?: string | null
          ended_at?: string | null
          missed_callback_sent?: boolean | null
          instance_name?: string | null
          raw_data?: Json | null
          created_at?: string | null
        }
      }
      evolution_campaign_recipients: {
        Row: {
          id: string
          campaign_id: string | null
          remote_jid: string
          contact_name: string | null
          status: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error_message: string | null
          message_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          remote_jid: string
          contact_name?: string | null
          status?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          message_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string | null
          remote_jid?: string
          contact_name?: string | null
          status?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          message_id?: string | null
          created_at?: string | null
        }
      }
      evolution_campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          template_id: string | null
          target_filter: Json | null
          status: string | null
          scheduled_at: string | null
          started_at: string | null
          completed_at: string | null
          total_recipients: number | null
          sent_count: number | null
          delivered_count: number | null
          read_count: number | null
          failed_count: number | null
          messages_per_minute: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          template_id?: string | null
          target_filter?: Json | null
          status?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          total_recipients?: number | null
          sent_count?: number | null
          delivered_count?: number | null
          read_count?: number | null
          failed_count?: number | null
          messages_per_minute?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          template_id?: string | null
          target_filter?: Json | null
          status?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          total_recipients?: number | null
          sent_count?: number | null
          delivered_count?: number | null
          read_count?: number | null
          failed_count?: number | null
          messages_per_minute?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_chatbot_responses: {
        Row: {
          id: string
          remote_jid: string
          response_text: string
          model_used: string
          tokens_used: number | null
          response_time_ms: number | null
          feedback: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          remote_jid: string
          response_text: string
          model_used?: string
          tokens_used?: number | null
          response_time_ms?: number | null
          feedback?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          remote_jid?: string
          response_text?: string
          model_used?: string
          tokens_used?: number | null
          response_time_ms?: number | null
          feedback?: string | null
          created_at?: string | null
        }
      }
      evolution_connection_history: {
        Row: {
          id: string
          instance_name: string
          state: string
          previous_state: string | null
          duration_seconds: number | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          instance_name?: string
          state: string
          previous_state?: string | null
          duration_seconds?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          instance_name?: string
          state?: string
          previous_state?: string | null
          duration_seconds?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      evolution_contact_attachments: {
        Row: {
          id: string
          remote_jid: string
          file_name: string
          file_type: string | null
          file_size: number | null
          file_url: string | null
          storage_path: string | null
          description: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          remote_jid: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          file_url?: string | null
          storage_path?: string | null
          description?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          remote_jid?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          file_url?: string | null
          storage_path?: string | null
          description?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      evolution_contact_blacklist: {
        Row: {
          id: string
          remote_jid: string
          reason: string | null
          blocked_by: string | null
          blocked_at: string | null
          expires_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          remote_jid: string
          reason?: string | null
          blocked_by?: string | null
          blocked_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          remote_jid?: string
          reason?: string | null
          blocked_by?: string | null
          blocked_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
        }
      }
      evolution_contact_notes: {
        Row: {
          id: string
          remote_jid: string
          note_type: string | null
          content: string
          is_pinned: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          remote_jid: string
          note_type?: string | null
          content: string
          is_pinned?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          remote_jid?: string
          note_type?: string | null
          content?: string
          is_pinned?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_contact_rate_limits: {
        Row: {
          id: string
          remote_jid: string
          message_count: number | null
          window_start: string | null
          is_rate_limited: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          remote_jid: string
          message_count?: number | null
          window_start?: string | null
          is_rate_limited?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          remote_jid?: string
          message_count?: number | null
          window_start?: string | null
          is_rate_limited?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_contacts: {
        Row: {
          id: string
          remote_jid: string
          phone_number: string | null
          push_name: string | null
          profile_picture_url: string | null
          full_name: string | null
          email: string | null
          company: string | null
          role_title: string | null
          lead_status: string | null
          lead_source: string | null
          lead_score: number | null
          whatsapp_labels: string[] | null
          tags: string[] | null
          assigned_to: string | null
          first_contact_at: string | null
          last_message_at: string | null
          total_messages: number | null
          total_purchases: number | null
          notes: string | null
          instance_name: string | null
          raw_data: Json | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
          message_count: number
        }
        Insert: {
          id?: string
          remote_jid: string
          phone_number?: string | null
          push_name?: string | null
          profile_picture_url?: string | null
          full_name?: string | null
          email?: string | null
          company?: string | null
          role_title?: string | null
          lead_status?: string | null
          lead_source?: string | null
          lead_score?: number | null
          whatsapp_labels?: string[] | null
          tags?: string[] | null
          assigned_to?: string | null
          first_contact_at?: string | null
          last_message_at?: string | null
          total_messages?: number | null
          total_purchases?: number | null
          notes?: string | null
          instance_name?: string | null
          raw_data?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
          message_count?: number
        }
        Update: {
          id?: string
          remote_jid?: string
          phone_number?: string | null
          push_name?: string | null
          profile_picture_url?: string | null
          full_name?: string | null
          email?: string | null
          company?: string | null
          role_title?: string | null
          lead_status?: string | null
          lead_source?: string | null
          lead_score?: number | null
          whatsapp_labels?: string[] | null
          tags?: string[] | null
          assigned_to?: string | null
          first_contact_at?: string | null
          last_message_at?: string | null
          total_messages?: number | null
          total_purchases?: number | null
          notes?: string | null
          instance_name?: string | null
          raw_data?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
          message_count?: number
        }
      }
      evolution_conversations: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_compras: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_default: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_diretoria: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_financeiro: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_logistica: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_marketing: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_sac: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_01: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_02: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_03: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_04: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_05: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_06: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_vendedor_07: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_wpp2: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_conversations_wpp_pink_test: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          status?: string | null
          assigned_to?: string | null
          department?: string | null
          subject?: string | null
          priority?: string | null
          labels?: string[] | null
          message_count?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          first_response_at?: string | null
          first_response_seconds?: number | null
          resolution_at?: string | null
          resolution_seconds?: number | null
          is_bot_active?: boolean | null
          bot_session_id?: string | null
          satisfaction_score?: number | null
          satisfaction_comment?: string | null
          instance_name?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          last_message_content?: string | null
          last_message_type?: string | null
          unread_count?: number | null
        }
      }
      evolution_daily_metrics: {
        Row: {
          id: string
          metric_date: string
          new_contacts: number | null
          active_contacts: number | null
          total_contacts: number | null
          messages_received: number | null
          messages_sent: number | null
          avg_response_time_seconds: number | null
          conversations_opened: number | null
          conversations_resolved: number | null
          avg_resolution_time_seconds: number | null
          deals_created: number | null
          deals_won: number | null
          deals_lost: number | null
          revenue: number | null
          pipeline_value: number | null
          lead_to_deal_rate: number | null
          deal_win_rate: number | null
          avg_messages_per_contact: number | null
          automations_triggered: number | null
          followups_sent: number | null
          calculated_at: string | null
        }
        Insert: {
          id?: string
          metric_date: string
          new_contacts?: number | null
          active_contacts?: number | null
          total_contacts?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          avg_response_time_seconds?: number | null
          conversations_opened?: number | null
          conversations_resolved?: number | null
          avg_resolution_time_seconds?: number | null
          deals_created?: number | null
          deals_won?: number | null
          deals_lost?: number | null
          revenue?: number | null
          pipeline_value?: number | null
          lead_to_deal_rate?: number | null
          deal_win_rate?: number | null
          avg_messages_per_contact?: number | null
          automations_triggered?: number | null
          followups_sent?: number | null
          calculated_at?: string | null
        }
        Update: {
          id?: string
          metric_date?: string
          new_contacts?: number | null
          active_contacts?: number | null
          total_contacts?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          avg_response_time_seconds?: number | null
          conversations_opened?: number | null
          conversations_resolved?: number | null
          avg_resolution_time_seconds?: number | null
          deals_created?: number | null
          deals_won?: number | null
          deals_lost?: number | null
          revenue?: number | null
          pipeline_value?: number | null
          lead_to_deal_rate?: number | null
          deal_win_rate?: number | null
          avg_messages_per_contact?: number | null
          automations_triggered?: number | null
          followups_sent?: number | null
          calculated_at?: string | null
        }
      }
      evolution_deals: {
        Row: {
          id: string
          contact_id: string | null
          conversation_id: string | null
          deal_number: number
          title: string
          description: string | null
          stage: string | null
          stage_changed_at: string | null
          value: number | null
          cost: number | null
          profit: number | null
          discount_percent: number | null
          products: Json | null
          expected_close_date: string | null
          actual_close_date: string | null
          assigned_to: string | null
          probability: number | null
          weighted_value: number | null
          lost_reason: string | null
          lost_notes: string | null
          source: string | null
          tags: string[] | null
          notes: string | null
          instance_name: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          closed_at: string | null
          deleted_at: string | null
          won: boolean | null
          lost: boolean | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          conversation_id?: string | null
          deal_number?: number
          title: string
          description?: string | null
          stage?: string | null
          stage_changed_at?: string | null
          value?: number | null
          cost?: number | null
          profit?: number | null
          discount_percent?: number | null
          products?: Json | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          assigned_to?: string | null
          probability?: number | null
          weighted_value?: number | null
          lost_reason?: string | null
          lost_notes?: string | null
          source?: string | null
          tags?: string[] | null
          notes?: string | null
          instance_name?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          closed_at?: string | null
          deleted_at?: string | null
          won?: boolean | null
          lost?: boolean | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          conversation_id?: string | null
          deal_number?: number
          title?: string
          description?: string | null
          stage?: string | null
          stage_changed_at?: string | null
          value?: number | null
          cost?: number | null
          profit?: number | null
          discount_percent?: number | null
          products?: Json | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          assigned_to?: string | null
          probability?: number | null
          weighted_value?: number | null
          lost_reason?: string | null
          lost_notes?: string | null
          source?: string | null
          tags?: string[] | null
          notes?: string | null
          instance_name?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          closed_at?: string | null
          deleted_at?: string | null
          won?: boolean | null
          lost?: boolean | null
        }
      }
      evolution_dlq: {
        Row: {
          id: string
          event_id: string | null
          event_type: string | null
          instance_name: string | null
          error_message: string | null
          retry_count: number | null
          max_retries: number | null
          payload: Json | null
          processed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          event_type?: string | null
          instance_name?: string | null
          error_message?: string | null
          retry_count?: number | null
          max_retries?: number | null
          payload?: Json | null
          processed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          event_type?: string | null
          instance_name?: string | null
          error_message?: string | null
          retry_count?: number | null
          max_retries?: number | null
          payload?: Json | null
          processed_at?: string | null
          created_at?: string | null
        }
      }
      evolution_ef_logs: {
        Row: {
          id: number
          ef_name: string
          ef_version: string | null
          level: string
          message: string | null
          context: Json | null
          trace_id: string | null
          duration_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          ef_name: string
          ef_version?: string | null
          level: string
          message?: string | null
          context?: Json | null
          trace_id?: string | null
          duration_ms?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          ef_name?: string
          ef_version?: string | null
          level?: string
          message?: string | null
          context?: Json | null
          trace_id?: string | null
          duration_ms?: number | null
          created_at?: string | null
        }
      }
      evolution_followup_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_type: string
          trigger_config: Json
          template_id: string | null
          delay_hours: number | null
          conditions: Json | null
          sequence_order: number | null
          sequence_group: string | null
          is_active: boolean | null
          run_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_type: string
          trigger_config?: Json
          template_id?: string | null
          delay_hours?: number | null
          conditions?: Json | null
          sequence_order?: number | null
          sequence_group?: string | null
          is_active?: boolean | null
          run_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_type?: string
          trigger_config?: Json
          template_id?: string | null
          delay_hours?: number | null
          conditions?: Json | null
          sequence_order?: number | null
          sequence_group?: string | null
          is_active?: boolean | null
          run_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_followups: {
        Row: {
          id: string
          contact_id: string | null
          conversation_id: string | null
          deal_id: string | null
          followup_type: string
          scheduled_at: string
          template_id: string | null
          custom_message: string | null
          status: string | null
          sent_at: string | null
          response_at: string | null
          error_message: string | null
          attempts: number | null
          max_attempts: number | null
          created_by: string | null
          instance_name: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          conversation_id?: string | null
          deal_id?: string | null
          followup_type: string
          scheduled_at: string
          template_id?: string | null
          custom_message?: string | null
          status?: string | null
          sent_at?: string | null
          response_at?: string | null
          error_message?: string | null
          attempts?: number | null
          max_attempts?: number | null
          created_by?: string | null
          instance_name?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          conversation_id?: string | null
          deal_id?: string | null
          followup_type?: string
          scheduled_at?: string
          template_id?: string | null
          custom_message?: string | null
          status?: string | null
          sent_at?: string | null
          response_at?: string | null
          error_message?: string | null
          attempts?: number | null
          max_attempts?: number | null
          created_by?: string | null
          instance_name?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      evolution_group_messages: {
        Row: {
          id: string
          group_id: string | null
          message_id: string
          sender_jid: string
          sender_name: string | null
          content: string | null
          message_type: string | null
          media_url: string | null
          is_from_admin: boolean | null
          mentions: string[] | null
          quoted_message_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          message_id: string
          sender_jid: string
          sender_name?: string | null
          content?: string | null
          message_type?: string | null
          media_url?: string | null
          is_from_admin?: boolean | null
          mentions?: string[] | null
          quoted_message_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          message_id?: string
          sender_jid?: string
          sender_name?: string | null
          content?: string | null
          message_type?: string | null
          media_url?: string | null
          is_from_admin?: boolean | null
          mentions?: string[] | null
          quoted_message_id?: string | null
          created_at?: string | null
        }
      }
      evolution_group_participants: {
        Row: {
          id: string
          group_id: string | null
          participant_jid: string
          contact_id: string | null
          role: string | null
          joined_at: string | null
          left_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          participant_jid: string
          contact_id?: string | null
          role?: string | null
          joined_at?: string | null
          left_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          group_id?: string | null
          participant_jid?: string
          contact_id?: string | null
          role?: string | null
          joined_at?: string | null
          left_at?: string | null
          is_active?: boolean | null
        }
      }
      evolution_group_rules: {
        Row: {
          id: string
          group_id: string | null
          rule_type: string
          trigger_value: string | null
          action_type: string
          action_value: string | null
          is_active: boolean | null
          execution_count: number | null
          last_executed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          rule_type: string
          trigger_value?: string | null
          action_type: string
          action_value?: string | null
          is_active?: boolean | null
          execution_count?: number | null
          last_executed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          rule_type?: string
          trigger_value?: string | null
          action_type?: string
          action_value?: string | null
          is_active?: boolean | null
          execution_count?: number | null
          last_executed_at?: string | null
          created_at?: string | null
        }
      }
      evolution_group_stats: {
        Row: {
          id: string
          group_id: string | null
          stat_date: string
          messages_count: number | null
          active_participants: number | null
          new_members: number | null
          left_members: number | null
          media_count: number | null
          links_count: number | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          stat_date: string
          messages_count?: number | null
          active_participants?: number | null
          new_members?: number | null
          left_members?: number | null
          media_count?: number | null
          links_count?: number | null
        }
        Update: {
          id?: string
          group_id?: string | null
          stat_date?: string
          messages_count?: number | null
          active_participants?: number | null
          new_members?: number | null
          left_members?: number | null
          media_count?: number | null
          links_count?: number | null
        }
      }
      evolution_groups: {
        Row: {
          id: string
          group_jid: string
          name: string | null
          description: string | null
          owner_jid: string | null
          participant_count: number | null
          is_community: boolean | null
          community_id: string | null
          auto_response_enabled: boolean | null
          auto_response_message: string | null
          welcome_message: string | null
          goodbye_message: string | null
          rules: string | null
          tags: string[] | null
          category: string | null
          is_monitored: boolean | null
          is_active: boolean | null
          last_activity_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_jid: string
          name?: string | null
          description?: string | null
          owner_jid?: string | null
          participant_count?: number | null
          is_community?: boolean | null
          community_id?: string | null
          auto_response_enabled?: boolean | null
          auto_response_message?: string | null
          welcome_message?: string | null
          goodbye_message?: string | null
          rules?: string | null
          tags?: string[] | null
          category?: string | null
          is_monitored?: boolean | null
          is_active?: boolean | null
          last_activity_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_jid?: string
          name?: string | null
          description?: string | null
          owner_jid?: string | null
          participant_count?: number | null
          is_community?: boolean | null
          community_id?: string | null
          auto_response_enabled?: boolean | null
          auto_response_message?: string | null
          welcome_message?: string | null
          goodbye_message?: string | null
          rules?: string | null
          tags?: string[] | null
          category?: string | null
          is_monitored?: boolean | null
          is_active?: boolean | null
          last_activity_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_holidays: {
        Row: {
          id: string
          date: string
          name: string
          is_half_day: boolean | null
          close_time: string | null
          auto_reply_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          date: string
          name: string
          is_half_day?: boolean | null
          close_time?: string | null
          auto_reply_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          name?: string
          is_half_day?: boolean | null
          close_time?: string | null
          auto_reply_message?: string | null
          created_at?: string | null
        }
      }
      evolution_keyword_automations: {
        Row: {
          id: string
          keyword: string
          match_type: string | null
          response_type: string | null
          template_id: string | null
          response_text: string | null
          media_url: string | null
          menu_options: Json | null
          is_case_sensitive: boolean | null
          priority: number | null
          only_first_message: boolean | null
          only_outside_hours: boolean | null
          cooldown_minutes: number | null
          is_active: boolean | null
          hit_count: number | null
          last_triggered_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          keyword: string
          match_type?: string | null
          response_type?: string | null
          template_id?: string | null
          response_text?: string | null
          media_url?: string | null
          menu_options?: Json | null
          is_case_sensitive?: boolean | null
          priority?: number | null
          only_first_message?: boolean | null
          only_outside_hours?: boolean | null
          cooldown_minutes?: number | null
          is_active?: boolean | null
          hit_count?: number | null
          last_triggered_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          keyword?: string
          match_type?: string | null
          response_type?: string | null
          template_id?: string | null
          response_text?: string | null
          media_url?: string | null
          menu_options?: Json | null
          is_case_sensitive?: boolean | null
          priority?: number | null
          only_first_message?: boolean | null
          only_outside_hours?: boolean | null
          cooldown_minutes?: number | null
          is_active?: boolean | null
          hit_count?: number | null
          last_triggered_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_label_associations: {
        Row: {
          id: string
          label_id: string | null
          remote_jid: string
          contact_id: string | null
          conversation_id: string | null
          associated_at: string | null
          removed_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          label_id?: string | null
          remote_jid: string
          contact_id?: string | null
          conversation_id?: string | null
          associated_at?: string | null
          removed_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          label_id?: string | null
          remote_jid?: string
          contact_id?: string | null
          conversation_id?: string | null
          associated_at?: string | null
          removed_at?: string | null
          is_active?: boolean | null
        }
      }
      evolution_labels: {
        Row: {
          id: string
          label_id: string
          name: string
          color: string | null
          color_hex: string | null
          predefined_id: string | null
          is_active: boolean | null
          instance_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          label_id: string
          name: string
          color?: string | null
          color_hex?: string | null
          predefined_id?: string | null
          is_active?: boolean | null
          instance_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          label_id?: string
          name?: string
          color?: string | null
          color_hex?: string | null
          predefined_id?: string | null
          is_active?: boolean | null
          instance_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_media: {
        Row: {
          id: string
          message_id: string
          remote_jid: string
          media_type: string
          mime_type: string | null
          file_name: string | null
          file_size: number | null
          file_sha256: string | null
          storage_path: string | null
          storage_url: string | null
          base64_data: string | null
          caption: string | null
          duration_seconds: number | null
          width: number | null
          height: number | null
          is_animated: boolean | null
          thumbnail_base64: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          message_id: string
          remote_jid: string
          media_type: string
          mime_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_sha256?: string | null
          storage_path?: string | null
          storage_url?: string | null
          base64_data?: string | null
          caption?: string | null
          duration_seconds?: number | null
          width?: number | null
          height?: number | null
          is_animated?: boolean | null
          thumbnail_base64?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          remote_jid?: string
          media_type?: string
          mime_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_sha256?: string | null
          storage_path?: string | null
          storage_url?: string | null
          base64_data?: string | null
          caption?: string | null
          duration_seconds?: number | null
          width?: number | null
          height?: number | null
          is_animated?: boolean | null
          thumbnail_base64?: string | null
          created_at?: string | null
        }
      }
      evolution_message_queue: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          message_type: string | null
          content: string | null
          media_url: string | null
          media_filename: string | null
          template_id: string | null
          template_vars: Json | null
          scheduled_at: string | null
          priority: number | null
          status: string | null
          attempts: number | null
          max_attempts: number | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error_message: string | null
          whatsapp_message_id: string | null
          source: string | null
          source_id: string | null
          instance_name: string | null
          created_by: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_filename?: string | null
          template_id?: string | null
          template_vars?: Json | null
          scheduled_at?: string | null
          priority?: number | null
          status?: string | null
          attempts?: number | null
          max_attempts?: number | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          whatsapp_message_id?: string | null
          source?: string | null
          source_id?: string | null
          instance_name?: string | null
          created_by?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_filename?: string | null
          template_id?: string | null
          template_vars?: Json | null
          scheduled_at?: string | null
          priority?: number | null
          status?: string | null
          attempts?: number | null
          max_attempts?: number | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          whatsapp_message_id?: string | null
          source?: string | null
          source_id?: string | null
          instance_name?: string | null
          created_by?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      evolution_message_templates: {
        Row: {
          id: string
          name: string
          category: string
          content: string
          variables: Json | null
          is_active: boolean | null
          usage_count: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          language: string | null
          header_type: string | null
          header_content: string | null
          footer_text: string | null
          buttons: Json | null
          approval_status: string | null
          rejection_reason: string | null
          last_used_at: string | null
          approved_at: string | null
          instance_name: string | null
        }
        Insert: {
          id?: string
          name: string
          category?: string
          content: string
          variables?: Json | null
          is_active?: boolean | null
          usage_count?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          language?: string | null
          header_type?: string | null
          header_content?: string | null
          footer_text?: string | null
          buttons?: Json | null
          approval_status?: string | null
          rejection_reason?: string | null
          last_used_at?: string | null
          approved_at?: string | null
          instance_name?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          content?: string
          variables?: Json | null
          is_active?: boolean | null
          usage_count?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          language?: string | null
          header_type?: string | null
          header_content?: string | null
          footer_text?: string | null
          buttons?: Json | null
          approval_status?: string | null
          rejection_reason?: string | null
          last_used_at?: string | null
          approved_at?: string | null
          instance_name?: string | null
        }
      }
      evolution_messages: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_compras: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_default: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_diretoria: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_financeiro: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_logistica: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_marketing: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_sac: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_01: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_02: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_03: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_04: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_05: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_06: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_vendedor_07: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_wpp2: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_messages_wpp_pink_test: {
        Row: {
          id: string
          message_id: string | null
          remote_jid: string
          from_me: boolean | null
          message_type: string | null
          content: string | null
          media_url: string | null
          media_mimetype: string | null
          quoted_message_id: string | null
          is_starred: boolean | null
          is_important: boolean | null
          category: string | null
          sentiment: string | null
          tags: string[] | null
          notes: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          payload: Json | null
          created_at: string | null
          contact_id: string | null
          conversation_id: string | null
          direction: string | null
          status: string | null
          status_at: string | null
          caption: string | null
          media_filename: string | null
          media_size: number | null
          sent_by_bot: boolean | null
          template_name: string | null
          instance_name: string
          push_name: string | null
          media_type: string | null
          raw_data: Json | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          remote_jid: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          remote_jid?: string
          from_me?: boolean | null
          message_type?: string | null
          content?: string | null
          media_url?: string | null
          media_mimetype?: string | null
          quoted_message_id?: string | null
          is_starred?: boolean | null
          is_important?: boolean | null
          category?: string | null
          sentiment?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          payload?: Json | null
          created_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          direction?: string | null
          status?: string | null
          status_at?: string | null
          caption?: string | null
          media_filename?: string | null
          media_size?: number | null
          sent_by_bot?: boolean | null
          template_name?: string | null
          instance_name?: string
          push_name?: string | null
          media_type?: string | null
          raw_data?: Json | null
          deleted_at?: string | null
        }
      }
      evolution_mirror_batches: {
        Row: {
          id: number
          run_id: string | null
          batch_seq: number
          s3_key: string
          s3_bucket: string
          row_count: number | null
          bytes_gz: number | null
          created_at: string
          consumed_at: string | null
          consumed_status: string | null
          consumer_error: string | null
          metrics: Json | null
        }
        Insert: {
          id?: number
          run_id?: string | null
          batch_seq: number
          s3_key: string
          s3_bucket?: string
          row_count?: number | null
          bytes_gz?: number | null
          created_at?: string
          consumed_at?: string | null
          consumed_status?: string | null
          consumer_error?: string | null
          metrics?: Json | null
        }
        Update: {
          id?: number
          run_id?: string | null
          batch_seq?: number
          s3_key?: string
          s3_bucket?: string
          row_count?: number | null
          bytes_gz?: number | null
          created_at?: string
          consumed_at?: string | null
          consumed_status?: string | null
          consumer_error?: string | null
          metrics?: Json | null
        }
      }
      evolution_mirror_checkpoints: {
        Row: {
          id: number
          checkpoint_key: string
          last_message_id: string | null
          last_synced_at: string
          total_synced: number | null
          updated_at: string
        }
        Insert: {
          id?: number
          checkpoint_key: string
          last_message_id?: string | null
          last_synced_at: string
          total_synced?: number | null
          updated_at?: string
        }
        Update: {
          id?: number
          checkpoint_key?: string
          last_message_id?: string | null
          last_synced_at?: string
          total_synced?: number | null
          updated_at?: string
        }
      }
      evolution_mirror_media_queue: {
        Row: {
          id: number
          message_id: string
          media_type: string
          mimetype: string | null
          media_url_source: string | null
          media_key: string | null
          file_length: number | null
          downloaded_at: string | null
          minio_path: string | null
          transcription: string | null
          status: string
          retry_count: number | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          message_id: string
          media_type: string
          mimetype?: string | null
          media_url_source?: string | null
          media_key?: string | null
          file_length?: number | null
          downloaded_at?: string | null
          minio_path?: string | null
          transcription?: string | null
          status?: string
          retry_count?: number | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          message_id?: string
          media_type?: string
          mimetype?: string | null
          media_url_source?: string | null
          media_key?: string | null
          file_length?: number | null
          downloaded_at?: string | null
          minio_path?: string | null
          transcription?: string | null
          status?: string
          retry_count?: number | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      evolution_mirror_runs: {
        Row: {
          id: string
          run_type: string
          status: string
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          messages_exported: number | null
          messages_inserted: number | null
          messages_skipped: number | null
          messages_errored: number | null
          chunks_processed: number | null
          since_timestamp: string | null
          until_timestamp: string | null
          error_message: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          run_type: string
          status: string
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          messages_exported?: number | null
          messages_inserted?: number | null
          messages_skipped?: number | null
          messages_errored?: number | null
          chunks_processed?: number | null
          since_timestamp?: string | null
          until_timestamp?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          run_type?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          messages_exported?: number | null
          messages_inserted?: number | null
          messages_skipped?: number | null
          messages_errored?: number | null
          chunks_processed?: number | null
          since_timestamp?: string | null
          until_timestamp?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      evolution_notification_config: {
        Row: {
          id: string
          channel: string
          webhook_url: string | null
          api_token: string | null
          chat_id: string | null
          enabled: boolean | null
          notify_on: string[] | null
          created_at: string | null
          updated_at: string | null
          slack_webhook: string | null
          email_addresses: string[] | null
          notify_on_hours: string | null
          notify_on_days: string[] | null
          priority_filter: string[] | null
        }
        Insert: {
          id?: string
          channel: string
          webhook_url?: string | null
          api_token?: string | null
          chat_id?: string | null
          enabled?: boolean | null
          notify_on?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          slack_webhook?: string | null
          email_addresses?: string[] | null
          notify_on_hours?: string | null
          notify_on_days?: string[] | null
          priority_filter?: string[] | null
        }
        Update: {
          id?: string
          channel?: string
          webhook_url?: string | null
          api_token?: string | null
          chat_id?: string | null
          enabled?: boolean | null
          notify_on?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          slack_webhook?: string | null
          email_addresses?: string[] | null
          notify_on_hours?: string | null
          notify_on_days?: string[] | null
          priority_filter?: string[] | null
        }
      }
      evolution_notification_log: {
        Row: {
          id: string
          channel: string
          alert_id: string | null
          message: string
          status: string | null
          error_message: string | null
          sent_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          channel: string
          alert_id?: string | null
          message: string
          status?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          channel?: string
          alert_id?: string | null
          message?: string
          status?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string | null
        }
      }
      evolution_notifications: {
        Row: {
          id: string
          notification_type: string
          contact_id: string | null
          conversation_id: string | null
          deal_id: string | null
          alert_id: string | null
          title: string
          message: string
          priority: string | null
          channels_sent: string[] | null
          status: string | null
          read_at: string | null
          read_by: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          notification_type: string
          contact_id?: string | null
          conversation_id?: string | null
          deal_id?: string | null
          alert_id?: string | null
          title: string
          message: string
          priority?: string | null
          channels_sent?: string[] | null
          status?: string | null
          read_at?: string | null
          read_by?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          notification_type?: string
          contact_id?: string | null
          conversation_id?: string | null
          deal_id?: string | null
          alert_id?: string | null
          title?: string
          message?: string
          priority?: string | null
          channels_sent?: string[] | null
          status?: string | null
          read_at?: string | null
          read_by?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      evolution_performance_metrics: {
        Row: {
          id: string
          metric_date: string
          metric_type: string
          metric_value: number
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          metric_date?: string
          metric_type: string
          metric_value: number
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          metric_date?: string
          metric_type?: string
          metric_value?: number
          metadata?: Json | null
          created_at?: string | null
        }
      }
      evolution_pipeline_health_log: {
        Row: {
          id: string
          checked_at: string
          pipeline_status: string
          baileys_health: string | null
          baileys_severity: number | null
          webhook_processed_pct: number | null
          webhook_avg_ms: number | null
          webhook_events_15min: number | null
          webhook_events_1h: number | null
          queue_pending_now: number | null
          queue_failed_24h: number | null
          queue_sent_24h: number | null
          alerts_critical_open: number | null
          alerts_unresolved: number | null
          gap_inbound_min: number | null
          detail: string | null
          snapshot: Json | null
        }
        Insert: {
          id?: string
          checked_at?: string
          pipeline_status: string
          baileys_health?: string | null
          baileys_severity?: number | null
          webhook_processed_pct?: number | null
          webhook_avg_ms?: number | null
          webhook_events_15min?: number | null
          webhook_events_1h?: number | null
          queue_pending_now?: number | null
          queue_failed_24h?: number | null
          queue_sent_24h?: number | null
          alerts_critical_open?: number | null
          alerts_unresolved?: number | null
          gap_inbound_min?: number | null
          detail?: string | null
          snapshot?: Json | null
        }
        Update: {
          id?: string
          checked_at?: string
          pipeline_status?: string
          baileys_health?: string | null
          baileys_severity?: number | null
          webhook_processed_pct?: number | null
          webhook_avg_ms?: number | null
          webhook_events_15min?: number | null
          webhook_events_1h?: number | null
          queue_pending_now?: number | null
          queue_failed_24h?: number | null
          queue_sent_24h?: number | null
          alerts_critical_open?: number | null
          alerts_unresolved?: number | null
          gap_inbound_min?: number | null
          detail?: string | null
          snapshot?: Json | null
        }
      }
      evolution_pipeline_health_log_legacy: {
        Row: {
          id: string
          checked_at: string
          status: string
          detalhe: string | null
          webhooks_5min: number | null
          msgs_5min: number | null
          idade_ultima_msg: string | null
          idade_ultimo_webhook: string | null
        }
        Insert: {
          id?: string
          checked_at?: string
          status: string
          detalhe?: string | null
          webhooks_5min?: number | null
          msgs_5min?: number | null
          idade_ultima_msg?: string | null
          idade_ultimo_webhook?: string | null
        }
        Update: {
          id?: string
          checked_at?: string
          status?: string
          detalhe?: string | null
          webhooks_5min?: number | null
          msgs_5min?: number | null
          idade_ultima_msg?: string | null
          idade_ultimo_webhook?: string | null
        }
      }
      evolution_pipeline_history: {
        Row: {
          id: string
          pipeline_id: string | null
          from_stage: string | null
          to_stage: string | null
          changed_by: string | null
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pipeline_id?: string | null
          from_stage?: string | null
          to_stage?: string | null
          changed_by?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pipeline_id?: string | null
          from_stage?: string | null
          to_stage?: string | null
          changed_by?: string | null
          reason?: string | null
          created_at?: string | null
        }
      }
      evolution_quick_replies: {
        Row: {
          id: string
          shortcut: string
          title: string
          content: string
          category: string | null
          use_count: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          shortcut: string
          title: string
          content: string
          category?: string | null
          use_count?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          shortcut?: string
          title?: string
          content?: string
          category?: string | null
          use_count?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      evolution_realtime_events: {
        Row: {
          id: string
          event_type: string
          entity_type: string
          entity_id: string | null
          remote_jid: string | null
          title: string
          body: string | null
          data: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          target_users: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          entity_type: string
          entity_id?: string | null
          remote_jid?: string | null
          title: string
          body?: string | null
          data?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          target_users?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          entity_type?: string
          entity_id?: string | null
          remote_jid?: string | null
          title?: string
          body?: string | null
          data?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          target_users?: string[] | null
          created_at?: string | null
        }
      }
      evolution_retention_log: {
        Row: {
          id: number
          ran_at: string
          processed_days_kept: number
          unprocessed_days_kept: number
          deleted_processed: number
          deleted_unprocessed: number
          freed_bytes_pretty: string
          freed_bytes_raw: number
          duration_ms: number
          triggered_by: string
          error_message: string | null
        }
        Insert: {
          id?: number
          ran_at?: string
          processed_days_kept: number
          unprocessed_days_kept: number
          deleted_processed: number
          deleted_unprocessed: number
          freed_bytes_pretty: string
          freed_bytes_raw: number
          duration_ms: number
          triggered_by?: string
          error_message?: string | null
        }
        Update: {
          id?: number
          ran_at?: string
          processed_days_kept?: number
          unprocessed_days_kept?: number
          deleted_processed?: number
          deleted_unprocessed?: number
          freed_bytes_pretty?: string
          freed_bytes_raw?: number
          duration_ms?: number
          triggered_by?: string
          error_message?: string | null
        }
      }
      evolution_retry_metrics: {
        Row: {
          action: string
          attempt_count: number
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
          final_http_status?: number | null
          final_status?: string
          id?: string
          idempotency_key?: string | null
          instance_name?: string | null
          method?: string
          retry_reasons?: Json
          total_duration_ms?: number | null
        }
      }
      evolution_sales_pipeline: {
        Row: {
          id: string
          remote_jid: string
          push_name: string | null
          current_stage: string
          previous_stage: string | null
          stage_changed_at: string | null
          total_messages: number | null
          last_message_at: string | null
          assigned_to: string | null
          notes: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          remote_jid: string
          push_name?: string | null
          current_stage?: string
          previous_stage?: string | null
          stage_changed_at?: string | null
          total_messages?: number | null
          last_message_at?: string | null
          assigned_to?: string | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          remote_jid?: string
          push_name?: string | null
          current_stage?: string
          previous_stage?: string | null
          stage_changed_at?: string | null
          total_messages?: number | null
          last_message_at?: string | null
          assigned_to?: string | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_scheduled_messages: {
        Row: {
          id: string
          contact_id: string | null
          scheduled_at: string
          sent_at: string | null
          template_id: string | null
          content: string
          media_url: string | null
          status: string | null
          error_message: string | null
          created_by: string | null
          instance_name: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          scheduled_at: string
          sent_at?: string | null
          template_id?: string | null
          content: string
          media_url?: string | null
          status?: string | null
          error_message?: string | null
          created_by?: string | null
          instance_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          template_id?: string | null
          content?: string
          media_url?: string | null
          status?: string | null
          error_message?: string | null
          created_by?: string | null
          instance_name?: string | null
          created_at?: string | null
        }
      }
      evolution_send_idempotency: {
        Row: {
          created_at: string | null
          expires_at: string
          external_message_id: string | null
          http_status: number
          idem_key: string
          instance_name: string
          path: string
          response: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          external_message_id?: string | null
          http_status: number
          idem_key: string
          instance_name: string
          path: string
          response?: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          external_message_id?: string | null
          http_status?: number
          idem_key?: string
          instance_name?: string
          path?: string
          response?: Json
        }
      }
      evolution_sentiment_alerts: {
        Row: {
          id: string
          sentiment_id: string | null
          contact_id: string | null
          conversation_id: string | null
          alert_type: string
          severity: string
          message_preview: string | null
          acknowledged: boolean | null
          acknowledged_by: string | null
          acknowledged_at: string | null
          resolved: boolean | null
          resolution_notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          sentiment_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          alert_type: string
          severity: string
          message_preview?: string | null
          acknowledged?: boolean | null
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved?: boolean | null
          resolution_notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          sentiment_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          alert_type?: string
          severity?: string
          message_preview?: string | null
          acknowledged?: boolean | null
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved?: boolean | null
          resolution_notes?: string | null
          created_at?: string | null
        }
      }
      evolution_sentiment_analysis: {
        Row: {
          id: string
          message_id: string
          conversation_id: string | null
          contact_id: string | null
          remote_jid: string
          message_text: string
          sentiment: string
          sentiment_score: number | null
          emotions: Json | null
          intent: string | null
          urgency: string | null
          keywords: string[] | null
          requires_attention: boolean | null
          analyzed_at: string | null
          model_used: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          message_id: string
          conversation_id?: string | null
          contact_id?: string | null
          remote_jid: string
          message_text: string
          sentiment: string
          sentiment_score?: number | null
          emotions?: Json | null
          intent?: string | null
          urgency?: string | null
          keywords?: string[] | null
          requires_attention?: boolean | null
          analyzed_at?: string | null
          model_used?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          conversation_id?: string | null
          contact_id?: string | null
          remote_jid?: string
          message_text?: string
          sentiment?: string
          sentiment_score?: number | null
          emotions?: Json | null
          intent?: string | null
          urgency?: string | null
          keywords?: string[] | null
          requires_attention?: boolean | null
          analyzed_at?: string | null
          model_used?: string | null
          created_at?: string | null
        }
      }
      evolution_sentiment_metrics: {
        Row: {
          id: string
          metric_date: string
          total_messages: number | null
          positive_count: number | null
          negative_count: number | null
          neutral_count: number | null
          avg_sentiment_score: number | null
          alerts_generated: number | null
          calculated_at: string | null
        }
        Insert: {
          id?: string
          metric_date: string
          total_messages?: number | null
          positive_count?: number | null
          negative_count?: number | null
          neutral_count?: number | null
          avg_sentiment_score?: number | null
          alerts_generated?: number | null
          calculated_at?: string | null
        }
        Update: {
          id?: string
          metric_date?: string
          total_messages?: number | null
          positive_count?: number | null
          negative_count?: number | null
          neutral_count?: number | null
          avg_sentiment_score?: number | null
          alerts_generated?: number | null
          calculated_at?: string | null
        }
      }
      evolution_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          category: string | null
          is_secret: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          category?: string | null
          is_secret?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          category?: string | null
          is_secret?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evolution_source_schema_map: {
        Row: {
          id: number
          database_name: string
          schema_name: string
          table_name: string
          column_name: string | null
          data_type: string | null
          is_nullable: string | null
          ordinal_position: number | null
          is_primary_key: boolean | null
          is_unique: boolean | null
          row_count_est: number | null
          discovered_at: string
          raw_metadata: Json | null
        }
        Insert: {
          id?: number
          database_name: string
          schema_name: string
          table_name: string
          column_name?: string | null
          data_type?: string | null
          is_nullable?: string | null
          ordinal_position?: number | null
          is_primary_key?: boolean | null
          is_unique?: boolean | null
          row_count_est?: number | null
          discovered_at?: string
          raw_metadata?: Json | null
        }
        Update: {
          id?: number
          database_name?: string
          schema_name?: string
          table_name?: string
          column_name?: string | null
          data_type?: string | null
          is_nullable?: string | null
          ordinal_position?: number | null
          is_primary_key?: boolean | null
          is_unique?: boolean | null
          row_count_est?: number | null
          discovered_at?: string
          raw_metadata?: Json | null
        }
      }
      evolution_spam_keywords: {
        Row: {
          id: string
          keyword: string
          match_type: string | null
          action: string | null
          auto_reply_message: string | null
          is_active: boolean | null
          hit_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          keyword: string
          match_type?: string | null
          action?: string | null
          auto_reply_message?: string | null
          is_active?: boolean | null
          hit_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          keyword?: string
          match_type?: string | null
          action?: string | null
          auto_reply_message?: string | null
          is_active?: boolean | null
          hit_count?: number | null
          created_at?: string | null
        }
      }
      evolution_stage_mapping: {
        Row: {
          stage_key: string
          label_name: string
          label_color: string | null
          stage_order: number | null
          auto_transition_after_hours: number | null
          next_stage: string | null
        }
        Insert: {
          stage_key: string
          label_name: string
          label_color?: string | null
          stage_order?: number | null
          auto_transition_after_hours?: number | null
          next_stage?: string | null
        }
        Update: {
          stage_key?: string
          label_name?: string
          label_color?: string | null
          stage_order?: number | null
          auto_transition_after_hours?: number | null
          next_stage?: string | null
        }
      }
      evolution_tag_assignments: {
        Row: {
          id: string
          tag_id: string | null
          entity_type: string
          entity_id: string
          assigned_by: string | null
          assigned_at: string | null
        }
        Insert: {
          id?: string
          tag_id?: string | null
          entity_type: string
          entity_id: string
          assigned_by?: string | null
          assigned_at?: string | null
        }
        Update: {
          id?: string
          tag_id?: string | null
          entity_type?: string
          entity_id?: string
          assigned_by?: string | null
          assigned_at?: string | null
        }
      }
      evolution_tags: {
        Row: {
          id: string
          name: string
          color: string | null
          description: string | null
          category: string | null
          auto_apply: boolean | null
          auto_apply_rules: Json | null
          use_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          description?: string | null
          category?: string | null
          auto_apply?: boolean | null
          auto_apply_rules?: Json | null
          use_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          description?: string | null
          category?: string | null
          auto_apply?: boolean | null
          auto_apply_rules?: Json | null
          use_count?: number | null
          created_at?: string | null
        }
      }
      evolution_tasks: {
        Row: {
          id: string
          contact_id: string | null
          deal_id: string | null
          conversation_id: string | null
          title: string
          description: string | null
          task_type: string | null
          assigned_to: string | null
          assigned_by: string | null
          due_date: string | null
          due_time: string | null
          reminder_at: string | null
          priority: string | null
          status: string | null
          completed_at: string | null
          completed_by: string | null
          is_recurring: boolean | null
          recurrence_rule: string | null
          recurrence_end: string | null
          parent_task_id: string | null
          tags: string[] | null
          notes: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          deal_id?: string | null
          conversation_id?: string | null
          title: string
          description?: string | null
          task_type?: string | null
          assigned_to?: string | null
          assigned_by?: string | null
          due_date?: string | null
          due_time?: string | null
          reminder_at?: string | null
          priority?: string | null
          status?: string | null
          completed_at?: string | null
          completed_by?: string | null
          is_recurring?: boolean | null
          recurrence_rule?: string | null
          recurrence_end?: string | null
          parent_task_id?: string | null
          tags?: string[] | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          deal_id?: string | null
          conversation_id?: string | null
          title?: string
          description?: string | null
          task_type?: string | null
          assigned_to?: string | null
          assigned_by?: string | null
          due_date?: string | null
          due_time?: string | null
          reminder_at?: string | null
          priority?: string | null
          status?: string | null
          completed_at?: string | null
          completed_by?: string | null
          is_recurring?: boolean | null
          recurrence_rule?: string | null
          recurrence_end?: string | null
          parent_task_id?: string | null
          tags?: string[] | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      evolution_template_usage: {
        Row: {
          id: string
          template_id: string | null
          remote_jid: string
          variables_used: Json | null
          send_status: string
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_id?: string | null
          remote_jid: string
          variables_used?: Json | null
          send_status?: string
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string | null
          remote_jid?: string
          variables_used?: Json | null
          send_status?: string
          error_message?: string | null
          created_at?: string | null
        }
      }
      evolution_typebot_sessions: {
        Row: {
          id: string
          session_id: string | null
          remote_jid: string
          typebot_id: string | null
          typebot_name: string | null
          status: string | null
          current_block: string | null
          variables: Json | null
          started_at: string | null
          last_interaction_at: string | null
          completed_at: string | null
          total_interactions: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          remote_jid: string
          typebot_id?: string | null
          typebot_name?: string | null
          status?: string | null
          current_block?: string | null
          variables?: Json | null
          started_at?: string | null
          last_interaction_at?: string | null
          completed_at?: string | null
          total_interactions?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          remote_jid?: string
          typebot_id?: string | null
          typebot_name?: string | null
          status?: string | null
          current_block?: string | null
          variables?: Json | null
          started_at?: string | null
          last_interaction_at?: string | null
          completed_at?: string | null
          total_interactions?: number | null
          created_at?: string | null
        }
      }
      evolution_webhook_dlq: {
        Row: {
          id: string
          original_event_id: string | null
          event_type: string
          instance_name: string
          remote_jid: string | null
          payload: Json
          error_message: string
          error_stack: string | null
          retry_count: number | null
          max_retries: number | null
          next_retry_at: string | null
          status: string
          resolved_at: string | null
          resolved_by: string | null
          created_at: string | null
          last_request_id: number | null
        }
        Insert: {
          id?: string
          original_event_id?: string | null
          event_type: string
          instance_name: string
          remote_jid?: string | null
          payload: Json
          error_message: string
          error_stack?: string | null
          retry_count?: number | null
          max_retries?: number | null
          next_retry_at?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string | null
          last_request_id?: number | null
        }
        Update: {
          id?: string
          original_event_id?: string | null
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          payload?: Json
          error_message?: string
          error_stack?: string | null
          retry_count?: number | null
          max_retries?: number | null
          next_retry_at?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string | null
          last_request_id?: number | null
        }
      }
      evolution_webhook_events: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_compras: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_default: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_diretoria: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_financeiro: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_logistica: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_marketing: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_sac: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_01: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_02: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_03: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_04: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_05: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_06: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_vendedor_07: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_wpp2: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_events_wpp_pink_test: {
        Row: {
          id: string
          event_type: string
          instance_name: string
          remote_jid: string | null
          from_me: boolean | null
          message_type: string | null
          push_name: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          event_type: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_type?: string
          instance_name?: string
          remote_jid?: string | null
          from_me?: boolean | null
          message_type?: string | null
          push_name?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          created_at?: string | null
          status?: string
        }
      }
      evolution_webhook_metrics: {
        Row: {
          id: string
          hour_bucket: string
          event_type: string
          event_count: number | null
          error_count: number | null
          avg_processing_time_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          hour_bucket: string
          event_type: string
          event_count?: number | null
          error_count?: number | null
          avg_processing_time_ms?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          hour_bucket?: string
          event_type?: string
          event_count?: number | null
          error_count?: number | null
          avg_processing_time_ms?: number | null
          created_at?: string | null
        }
      }
      extensions: {
        Row: {
          id: string
          type: string | null
          settings: Json | null
          tenant_external_id: string | null
          inserted_at: string
          updated_at: string
        }
        Insert: {
          id: string
          type?: string | null
          settings?: Json | null
          tenant_external_id?: string | null
          inserted_at: string
          updated_at: string
        }
        Update: {
          id?: string
          type?: string | null
          settings?: Json | null
          tenant_external_id?: string | null
          inserted_at?: string
          updated_at?: string
        }
      }
      failed_messages: {
        Row: {
          created_at: string | null
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          instance_name: string
          last_attempt_at?: string | null
          last_retry_reason?: string | null
          max_retries: number
          next_attempt_at?: string | null
          payload?: Json
          remote_jid?: string | null
          retry_count: number
          status: string
          succeeded_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
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
          updated_at?: string | null
        }
      }
      favorite_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
      }
      finetune_jobs: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          model_name: string
          dataset_path: string | null
          config: Json | null
          status: string | null
          progress: number | null
          result: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          model_name: string
          dataset_path?: string | null
          config?: Json | null
          status?: string | null
          progress?: number | null
          result?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          model_name?: string
          dataset_path?: string | null
          config?: Json | null
          status?: string | null
          progress?: number | null
          result?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
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
          status: string
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
          trigger_event: string
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
          delay_hours: number
          id?: string
          is_active?: boolean | null
          message_template: string
          message_type: string
          sequence_id: string
          step_order: number
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
      }
      forensic_snapshots: {
        Row: {
          id: string
          agent_id: string
          execution_id: string
          step_index: number
          decision_type: string
          decision_rationale: string
          input_hash: string
          output_hash: string
          previous_hash: string
          chain_hash: string
          state_before: Json
          state_after: Json
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          execution_id: string
          step_index?: number
          decision_type?: string
          decision_rationale?: string
          input_hash: string
          output_hash: string
          previous_hash?: string
          chain_hash: string
          state_before?: Json
          state_after?: Json
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          execution_id?: string
          step_index?: number
          decision_type?: string
          decision_rationale?: string
          input_hash?: string
          output_hash?: string
          previous_hash?: string
          chain_hash?: string
          state_before?: Json
          state_after?: Json
          metadata?: Json | null
          created_at?: string
        }
      }
      geo_blocking_settings: {
        Row: {
          created_at: string | null
          id: string
          mode: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mode: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mode?: string
          updated_at?: string | null
          updated_by?: string | null
        }
      }
      global_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
      }
      gmail_accounts: {
        Row: {
          access_token_encrypted: string | null
          created_at: string | null
          email_address: string
          id: string
          is_active: boolean
          last_error: string | null
          last_sync_at: string | null
          refresh_token_encrypted: string | null
          sync_status: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string | null
          email_address: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          sync_status: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string | null
          email_address?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          sync_status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
      }
      gmail_daily_metrics: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      gmail_drafts: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      gmail_health_summary: {
        Row: {
          id: string
          account_id: string | null
          status: string | null
          last_check_at: string | null
          error_count: number | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          account_id?: string | null
          status?: string | null
          last_check_at?: string | null
          error_count?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string | null
          status?: string | null
          last_check_at?: string | null
          error_count?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      gmail_labels: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      gmail_messages: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      gmail_revalidation_jobs: {
        Row: {
          id: string
          account_id: string | null
          status: string | null
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          account_id?: string | null
          status?: string | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string | null
          status?: string | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string | null
        }
      }
      gmail_signatures: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      gmail_threads: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      goals_configurations: {
        Row: {
          created_at: string | null
          daily_target: number
          goal_type: string
          id: string
          is_active: boolean | null
          monthly_target: number
          profile_id: string | null
          queue_id: string | null
          updated_at: string | null
          weekly_target: number
        }
        Insert: {
          created_at?: string | null
          daily_target: number
          goal_type: string
          id?: string
          is_active?: boolean | null
          monthly_target: number
          profile_id?: string | null
          queue_id?: string | null
          updated_at?: string | null
          weekly_target: number
        }
        Update: {
          created_at?: string | null
          daily_target?: number
          goal_type?: string
          id?: string
          is_active?: boolean | null
          monthly_target?: number
          profile_id?: string | null
          queue_id?: string | null
          updated_at?: string | null
          weekly_target?: number
        }
      }
      guardrail_ml_logs: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          direction: string
          text_preview: string | null
          all_passed: boolean | null
          blocked_layers: string[] | null
          scores: Json | null
          latency_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          direction: string
          text_preview?: string | null
          all_passed?: boolean | null
          blocked_layers?: string[] | null
          scores?: Json | null
          latency_ms?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          direction?: string
          text_preview?: string | null
          all_passed?: boolean | null
          blocked_layers?: string[] | null
          scores?: Json | null
          latency_ms?: number | null
          created_at?: string | null
        }
      }
      guardrail_policies: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          type: string
          config: Json | null
          is_enabled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          type?: string
          config?: Json | null
          is_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          type?: string
          config?: Json | null
          is_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      hf_config: {
        Row: {
          id: string
          workspace_id: string | null
          key: string
          value: string | null
          is_secret: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          key: string
          value?: string | null
          is_secret?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          key?: string
          value?: string | null
          is_secret?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      hmac_selftest_audit: {
        Row: {
          created_at: string | null
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
          created_at?: string | null
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
        Update: {
          created_at?: string | null
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
      }
      imap_smtp_accounts: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      installed_templates: {
        Row: {
          id: string
          workspace_id: string | null
          template_id: string | null
          agent_id: string | null
          installed_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          template_id?: string | null
          agent_id?: string | null
          installed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          template_id?: string | null
          agent_id?: string | null
          installed_by?: string | null
          created_at?: string | null
        }
      }
      instance_registry: {
        Row: {
          id: string
          instance_name: string
          display_name: string
          phone_number: string | null
          department: string
          responsible_name: string | null
          responsible_email: string | null
          is_active: boolean | null
          webhook_url: string | null
          webhook_enabled: boolean | null
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          business_hours_enabled: boolean | null
          max_concurrent_chats: number | null
          sla_first_response_minutes: number | null
          sla_resolution_hours: number | null
          bitrix_integration: Json | null
          n8n_workflows: Json | null
          config: Json | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          instance_name: string
          display_name: string
          phone_number?: string | null
          department: string
          responsible_name?: string | null
          responsible_email?: string | null
          is_active?: boolean | null
          webhook_url?: string | null
          webhook_enabled?: boolean | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          business_hours_enabled?: boolean | null
          max_concurrent_chats?: number | null
          sla_first_response_minutes?: number | null
          sla_resolution_hours?: number | null
          bitrix_integration?: Json | null
          n8n_workflows?: Json | null
          config?: Json | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          instance_name?: string
          display_name?: string
          phone_number?: string | null
          department?: string
          responsible_name?: string | null
          responsible_email?: string | null
          is_active?: boolean | null
          webhook_url?: string | null
          webhook_enabled?: boolean | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          business_hours_enabled?: boolean | null
          max_concurrent_chats?: number | null
          sla_first_response_minutes?: number | null
          sla_resolution_hours?: number | null
          bitrix_integration?: Json | null
          n8n_workflows?: Json | null
          config?: Json | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      integration_registry: {
        Row: {
          id: string
          name: string
          type: string
          provider: string
          status: string | null
          endpoint_url: string | null
          config: Json | null
          health_status: string | null
          last_health_check: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          provider: string
          status?: string | null
          endpoint_url?: string | null
          config?: Json | null
          health_status?: string | null
          last_health_check?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          provider?: string
          status?: string | null
          endpoint_url?: string | null
          config?: Json | null
          health_status?: string | null
          last_health_check?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      ip_whitelist: {
        Row: {
          added_by: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string
        }
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
          search_vector: string
          tags: string | null
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
          search_vector: string
          tags?: string | null
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
          search_vector?: string
          tags?: string | null
          title?: string
          updated_at?: string | null
        }
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
      }
      knowledge_bases: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          description: string | null
          vector_db: string | null
          embedding_model: string | null
          document_count: number | null
          chunk_count: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          description?: string | null
          vector_db?: string | null
          embedding_model?: string | null
          document_count?: number | null
          chunk_count?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          description?: string | null
          vector_db?: string | null
          embedding_model?: string | null
          document_count?: number | null
          chunk_count?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      mcp_servers: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          url: string
          transport: string | null
          auth_type: string | null
          auth_config: Json | null
          status: string | null
          tools_discovered: Json | null
          resources_discovered: Json | null
          error: string | null
          is_active: boolean | null
          last_connected_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          url: string
          transport?: string | null
          auth_type?: string | null
          auth_config?: Json | null
          status?: string | null
          tools_discovered?: Json | null
          resources_discovered?: Json | null
          error?: string | null
          is_active?: boolean | null
          last_connected_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          url?: string
          transport?: string | null
          auth_type?: string | null
          auth_config?: Json | null
          status?: string | null
          tools_discovered?: Json | null
          resources_discovered?: Json | null
          error?: string | null
          is_active?: boolean | null
          last_connected_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      media_download_queue: {
        Row: {
          id: number
          message_id: string
          message_uuid: string | null
          remote_jid: string
          instance_name: string
          media_type: string
          media_key: string | null
          direct_path: string | null
          mimetype: string | null
          file_length: number | null
          status: string
          download_url: string | null
          storage_path: string | null
          retry_count: number | null
          max_retries: number | null
          error_message: string | null
          priority: number | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: number
          message_id: string
          message_uuid?: string | null
          remote_jid: string
          instance_name?: string
          media_type: string
          media_key?: string | null
          direct_path?: string | null
          mimetype?: string | null
          file_length?: number | null
          status?: string
          download_url?: string | null
          storage_path?: string | null
          retry_count?: number | null
          max_retries?: number | null
          error_message?: string | null
          priority?: number | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: number
          message_id?: string
          message_uuid?: string | null
          remote_jid?: string
          instance_name?: string
          media_type?: string
          media_key?: string | null
          direct_path?: string | null
          mimetype?: string | null
          file_length?: number | null
          status?: string
          download_url?: string | null
          storage_path?: string | null
          retry_count?: number | null
          max_retries?: number | null
          error_message?: string | null
          priority?: number | null
          created_at?: string
          processed_at?: string | null
        }
      }
      message_reactions: {
        Row: {
          contact_id: string | null
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_global: boolean | null
          shortcut: string | null
          title: string
          updated_at: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
        }
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
      }
      migration_audit: {
        Row: {
          id: number
          phase: string
          entity: string | null
          action: string
          rows_affected: number | null
          status: string
          notes: string | null
          executed_at: string
          executed_by: string
        }
        Insert: {
          id?: number
          phase: string
          entity?: string | null
          action: string
          rows_affected?: number | null
          status?: string
          notes?: string | null
          executed_at?: string
          executed_by?: string
        }
        Update: {
          id?: number
          phase?: string
          entity?: string | null
          action?: string
          rows_affected?: number | null
          status?: string
          notes?: string | null
          executed_at?: string
          executed_by?: string
        }
      }
      migration_snapshot_d30: {
        Row: {
          id: number
          entidade: string
          qtd_legacy: number
          qtd_evolution: number
          qtd_migrados: number
          qtd_novos_pos_migracao: number
          taxa_migracao_pct: number | null
          snapshot_at: string | null
          notes: string | null
        }
        Insert: {
          id?: number
          entidade: string
          qtd_legacy: number
          qtd_evolution: number
          qtd_migrados: number
          qtd_novos_pos_migracao: number
          taxa_migracao_pct?: number | null
          snapshot_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: number
          entidade?: string
          qtd_legacy?: number
          qtd_evolution?: number
          qtd_migrados?: number
          qtd_novos_pos_migracao?: number
          taxa_migracao_pct?: number | null
          snapshot_at?: string | null
          notes?: string | null
        }
      }
      model_pricing: {
        Row: {
          id: string
          model_pattern: string
          input_cost_per_1k: number
          output_cost_per_1k: number
          created_at: string
        }
        Insert: {
          id?: string
          model_pattern: string
          input_cost_per_1k?: number
          output_cost_per_1k?: number
          created_at?: string
        }
        Update: {
          id?: string
          model_pattern?: string
          input_cost_per_1k?: number
          output_cost_per_1k?: number
          created_at?: string
        }
      }
      model_pricing_v2: {
        Row: {
          id: string
          model: string
          provider: string
          input_cost_per_1m: number
          output_cost_per_1m: number
          tier: string
          capabilities: string[] | null
          context_window: number | null
          active_params: string | null
          total_params: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          model: string
          provider: string
          input_cost_per_1m?: number
          output_cost_per_1m?: number
          tier?: string
          capabilities?: string[] | null
          context_window?: number | null
          active_params?: string | null
          total_params?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          model?: string
          provider?: string
          input_cost_per_1m?: number
          output_cost_per_1m?: number
          tier?: string
          capabilities?: string[] | null
          context_window?: number | null
          active_params?: string | null
          total_params?: string | null
          created_at?: string | null
        }
      }
      n8n_variables: {
        Row: {
          id: string
          key: string
          value: string
          type: string | null
          description: string | null
          is_secret: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: string
          type?: string | null
          description?: string | null
          is_secret?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string
          type?: string | null
          description?: string | null
          is_secret?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      nlp_extractions: {
        Row: {
          id: string
          workspace_id: string | null
          source_type: string
          source_id: string | null
          raw_text: string
          entities: Json | null
          structured_order: Json | null
          sentiment_label: string | null
          sentiment_score: number | null
          pipeline_version: string
          processing_time_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          source_type?: string
          source_id?: string | null
          raw_text: string
          entities?: Json | null
          structured_order?: Json | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          pipeline_version?: string
          processing_time_ms?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          source_type?: string
          source_id?: string | null
          raw_text?: string
          entities?: Json | null
          structured_order?: Json | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          pipeline_version?: string
          processing_time_ms?: number | null
          created_at?: string | null
        }
      }
      notification_channels_config: {
        Row: {
          id: number
          channel_name: string
          enabled: boolean
          min_severity: string
          config: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          channel_name: string
          enabled?: boolean
          min_severity?: string
          config?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          channel_name?: string
          enabled?: boolean
          min_severity?: string
          config?: Json
          created_at?: string | null
          updated_at?: string | null
        }
      }
      notification_templates: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          channel: string
          subject: string | null
          body_template: string
          variables: Json | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          channel?: string
          subject?: string | null
          body_template: string
          variables?: Json | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          channel?: string
          subject?: string | null
          body_template?: string
          variables?: Json | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string | null
          type: string
          title: string
          body: string | null
          is_read: boolean | null
          action_url: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          type?: string
          title: string
          body?: string | null
          is_read?: boolean | null
          action_url?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          type?: string
          title?: string
          body?: string | null
          is_read?: boolean | null
          action_url?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      nps_surveys: {
        Row: {
          agent_id: string | null
          contact_id: string
          created_at: string | null
          feedback: string | null
          id: string
          score: number
          survey_type: string
        }
        Insert: {
          agent_id?: string | null
          contact_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          score: number
          survey_type: string
        }
        Update: {
          agent_id?: string | null
          contact_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number
          survey_type?: string
        }
      }
      number_reputation: {
        Row: {
          complaints_count: number
          created_at: string | null
          daily_limit: number | null
          failures_today: number
          health_score: number
          id: string
          last_reset_at: string | null
          messages_sent_today: number
          updated_at: string | null
          warmup_day: number | null
          warmup_status: string
          whatsapp_connection_id: string
        }
        Insert: {
          complaints_count: number
          created_at?: string | null
          daily_limit?: number | null
          failures_today: number
          health_score: number
          id?: string
          last_reset_at?: string | null
          messages_sent_today: number
          updated_at?: string | null
          warmup_day?: number | null
          warmup_status: string
          whatsapp_connection_id: string
        }
        Update: {
          complaints_count?: number
          created_at?: string | null
          daily_limit?: number | null
          failures_today?: number
          health_score?: number
          id?: string
          last_reset_at?: string | null
          messages_sent_today?: number
          updated_at?: string | null
          warmup_day?: number | null
          warmup_status?: string
          whatsapp_connection_id?: string
        }
      }
      oracle_history: {
        Row: {
          id: string
          user_id: string
          query: string
          mode: string
          preset_id: string
          preset_name: string | null
          chairman_model: string | null
          enable_thinking: boolean | null
          results: Json
          models_used: number | null
          confidence_score: number | null
          consensus_degree: number | null
          total_cost_usd: number | null
          total_latency_ms: number | null
          total_tokens: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          mode: string
          preset_id: string
          preset_name?: string | null
          chairman_model?: string | null
          enable_thinking?: boolean | null
          results?: Json
          models_used?: number | null
          confidence_score?: number | null
          consensus_degree?: number | null
          total_cost_usd?: number | null
          total_latency_ms?: number | null
          total_tokens?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          mode?: string
          preset_id?: string
          preset_name?: string | null
          chairman_model?: string | null
          enable_thinking?: boolean | null
          results?: Json
          models_used?: number | null
          confidence_score?: number | null
          consensus_degree?: number | null
          total_cost_usd?: number | null
          total_latency_ms?: number | null
          total_tokens?: number | null
          created_at?: string
        }
      }
      outbound_message_queue: {
        Row: {
          id: string
          contact_id: string | null
          remote_jid: string
          instance_name: string
          message_type: string
          content: string | null
          media_url: string | null
          media_mime_type: string | null
          caption: string | null
          metadata: Json | null
          status: string
          external_id: string | null
          error_message: string | null
          retry_count: number | null
          max_retries: number | null
          sent_at: string | null
          failed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          remote_jid: string
          instance_name?: string
          message_type?: string
          content?: string | null
          media_url?: string | null
          media_mime_type?: string | null
          caption?: string | null
          metadata?: Json | null
          status?: string
          external_id?: string | null
          error_message?: string | null
          retry_count?: number | null
          max_retries?: number | null
          sent_at?: string | null
          failed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          remote_jid?: string
          instance_name?: string
          message_type?: string
          content?: string | null
          media_url?: string | null
          media_mime_type?: string | null
          caption?: string | null
          metadata?: Json | null
          status?: string
          external_id?: string | null
          error_message?: string | null
          retry_count?: number | null
          max_retries?: number | null
          sent_at?: string | null
          failed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      passkey_credentials: {
        Row: {
          backed_up: boolean | null
          counter: number
          created_at: string | null
          credential_id: string
          device_type: string | null
          friendly_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string | null
          user_id: string
        }
        Insert: {
          backed_up?: boolean | null
          counter: number
          created_at?: string | null
          credential_id: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string | null
          user_id: string
        }
        Update: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string | null
          credential_id?: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string | null
          user_id?: string
        }
      }
      password_reset_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token_expires_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
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
      }
      performance_snapshots: {
        Row: {
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      }
      permissions: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          module: string
          category: string | null
          is_system: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          module: string
          category?: string | null
          is_system?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          module?: string
          category?: string | null
          is_system?: boolean | null
          created_at?: string | null
        }
      }
      pinned_conversations: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          pinned_by: string
          position: number
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          pinned_by: string
          position: number
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          pinned_by?: string
          position?: number
        }
      }
      playbooks: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          updated_at?: string | null
        }
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
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
          updated_at: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          retailer_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
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
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          avatar_url: string | null
          role: string
          max_chats: number
          department: string | null
          is_online: boolean | null
          last_seen: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          email?: string | null
          avatar_url?: string | null
          role?: string
          max_chats?: number
          department?: string | null
          is_online?: boolean | null
          last_seen?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          avatar_url?: string | null
          role?: string
          max_chats?: number
          department?: string | null
          is_online?: boolean | null
          last_seen?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      prompt_ab_tests: {
        Row: {
          id: string
          agent_id: string | null
          name: string
          variant_a_prompt_id: string | null
          variant_b_prompt_id: string | null
          traffic_split: number | null
          status: string | null
          winner: string | null
          metrics: Json | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          name: string
          variant_a_prompt_id?: string | null
          variant_b_prompt_id?: string | null
          traffic_split?: number | null
          status?: string | null
          winner?: string | null
          metrics?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          name?: string
          variant_a_prompt_id?: string | null
          variant_b_prompt_id?: string | null
          traffic_split?: number | null
          status?: string | null
          winner?: string | null
          metrics?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
      }
      prompt_versions: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          version: number
          content: string
          change_summary: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          version?: number
          content?: string
          change_summary?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          version?: number
          content?: string
          change_summary?: string | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      provider_configs: {
        Row: {
          auth_token: string | null
          base_url: string
          config: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          last_error: string | null
          last_ping_at: string | null
          last_ping_latency_ms: number | null
          name: string
          priority: number
          provider_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          auth_token?: string | null
          base_url: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_ping_at?: string | null
          last_ping_latency_ms?: number | null
          name: string
          priority: number
          provider_type: string
          status: string
          updated_at?: string | null
        }
        Update: {
          auth_token?: string | null
          base_url?: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_ping_at?: string | null
          last_ping_latency_ms?: number | null
          name?: string
          priority?: number
          provider_type?: string
          status?: string
          updated_at?: string | null
        }
      }
      qr_attempts: {
        Row: {
          connected_at: string | null
          connection_id: string | null
          connection_name: string | null
          created_at: string | null
          error_message: string | null
          expired_at: string | null
          id: string
          instance_id: string
          metadata: Json | null
          requested_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          connected_at?: string | null
          connection_id?: string | null
          connection_name?: string | null
          created_at?: string | null
          error_message?: string | null
          expired_at?: string | null
          id?: string
          instance_id: string
          metadata?: Json | null
          requested_by?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          connected_at?: string | null
          connection_id?: string | null
          connection_name?: string | null
          created_at?: string | null
          error_message?: string | null
          expired_at?: string | null
          id?: string
          instance_id?: string
          metadata?: Json | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
      }
      queue_goals: {
        Row: {
          alerts_enabled: boolean | null
          created_at: string | null
          id: string
          max_avg_wait_minutes: number | null
          max_messages_pending: number | null
          max_waiting_contacts: number | null
          min_assignment_rate: number | null
          queue_id: string
          updated_at: string | null
        }
        Insert: {
          alerts_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_avg_wait_minutes?: number | null
          max_messages_pending?: number | null
          max_waiting_contacts?: number | null
          min_assignment_rate?: number | null
          queue_id: string
          updated_at?: string | null
        }
        Update: {
          alerts_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_avg_wait_minutes?: number | null
          max_messages_pending?: number | null
          max_waiting_contacts?: number | null
          min_assignment_rate?: number | null
          queue_id?: string
          updated_at?: string | null
        }
      }
      queue_items: {
        Row: {
          id: string
          queue_id: string | null
          payload: Json
          status: string | null
          priority: number | null
          attempts: number | null
          max_attempts: number | null
          error: string | null
          locked_at: string | null
          locked_by: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          queue_id?: string | null
          payload?: Json
          status?: string | null
          priority?: number | null
          attempts?: number | null
          max_attempts?: number | null
          error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          queue_id?: string | null
          payload?: Json
          status?: string | null
          priority?: number | null
          attempts?: number | null
          max_attempts?: number | null
          error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
      }
      queue_members: {
        Row: {
          id: string
          queue_id: string
          profile_id: string
          role: string | null
          is_active: boolean | null
          max_simultaneous: number | null
          created_at: string
        }
        Insert: {
          id?: string
          queue_id: string
          profile_id: string
          role?: string | null
          is_active?: boolean | null
          max_simultaneous?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          queue_id?: string
          profile_id?: string
          role?: string | null
          is_active?: boolean | null
          max_simultaneous?: number | null
          created_at?: string
        }
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
          position: number
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
      }
      queue_routing_rules: {
        Row: {
          id: string
          queue_id: string
          rule_type: string | null
          condition: Json
          priority: number | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          queue_id: string
          rule_type?: string | null
          condition?: Json
          priority?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          queue_id?: string
          rule_type?: string | null
          condition?: Json
          priority?: number | null
          is_active?: boolean | null
          created_at?: string
        }
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
      }
      queues: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          icon: string | null
          is_active: boolean | null
          max_capacity: number | null
          auto_assign: boolean | null
          round_robin: boolean | null
          priority: number | null
          sla_policy_id: string | null
          business_hours: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          auto_assign?: boolean | null
          round_robin?: boolean | null
          priority?: number | null
          sla_policy_id?: string | null
          business_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          auto_assign?: boolean | null
          round_robin?: boolean | null
          priority?: number | null
          sla_policy_id?: string | null
          business_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      quick_replies: {
        Row: {
          id: string
          shortcut: string
          title: string
          content: string
          category: string | null
          media_url: string | null
          media_type: string | null
          is_global: boolean | null
          owner_id: string | null
          use_count: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shortcut: string
          title: string
          content: string
          category?: string | null
          media_url?: string | null
          media_type?: string | null
          is_global?: boolean | null
          owner_id?: string | null
          use_count?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shortcut?: string
          title?: string
          content?: string
          category?: string | null
          media_url?: string | null
          media_type?: string | null
          is_global?: boolean | null
          owner_id?: string | null
          use_count?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      ragas_scores: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          evaluation_run_id: string | null
          query: string
          answer: string
          faithfulness: number | null
          answer_relevancy: number | null
          context_precision: number | null
          context_recall: number | null
          answer_correctness: number | null
          overall_score: number | null
          contexts_count: number | null
          model_used: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          evaluation_run_id?: string | null
          query: string
          answer: string
          faithfulness?: number | null
          answer_relevancy?: number | null
          context_precision?: number | null
          context_recall?: number | null
          answer_correctness?: number | null
          overall_score?: number | null
          contexts_count?: number | null
          model_used?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          evaluation_run_id?: string | null
          query?: string
          answer?: string
          faithfulness?: number | null
          answer_relevancy?: number | null
          context_precision?: number | null
          context_recall?: number | null
          answer_correctness?: number | null
          overall_score?: number | null
          contexts_count?: number | null
          model_used?: string | null
          created_at?: string | null
        }
      }
      rate_limit_configs: {
        Row: {
          block_duration_minutes: number
          created_at: string | null
          endpoint_pattern: string
          id: string
          is_active: boolean | null
          max_requests: number
          name: string
          updated_at: string | null
          window_seconds: number
        }
        Insert: {
          block_duration_minutes: number
          created_at?: string | null
          endpoint_pattern: string
          id?: string
          is_active?: boolean | null
          max_requests: number
          name: string
          updated_at?: string | null
          window_seconds: number
        }
        Update: {
          block_duration_minutes?: number
          created_at?: string | null
          endpoint_pattern?: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          name?: string
          updated_at?: string | null
          window_seconds?: number
        }
      }
      rate_limit_logs: {
        Row: {
          id: string
          identifier: string
          endpoint: string
          limit_name: string
          was_blocked: boolean | null
          request_count: number | null
          window_ms: number
          max_requests: number
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          identifier: string
          endpoint: string
          limit_name: string
          was_blocked?: boolean | null
          request_count?: number | null
          window_ms: number
          max_requests: number
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          identifier?: string
          endpoint?: string
          limit_name?: string
          was_blocked?: boolean | null
          request_count?: number | null
          window_ms?: number
          max_requests?: number
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
      }
      reminders: {
        Row: {
          contact_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_dismissed: boolean
          profile_id: string
          remind_at: string
          title: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_dismissed?: boolean
          profile_id: string
          remind_at: string
          title: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_dismissed?: boolean
          profile_id?: string
          remind_at?: string
          title?: string
        }
      }
      restore_test_log: {
        Row: {
          id: number
          step: string
          status: string | null
          detail: string | null
          metrics: Json | null
          logged_at: string | null
          run_id: string | null
          dump_file: string | null
        }
        Insert: {
          id?: number
          step: string
          status?: string | null
          detail?: string | null
          metrics?: Json | null
          logged_at?: string | null
          run_id?: string | null
          dump_file?: string | null
        }
        Update: {
          id?: number
          step?: string
          status?: string | null
          detail?: string | null
          metrics?: Json | null
          logged_at?: string | null
          run_id?: string | null
          dump_file?: string | null
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          created_at?: string | null
        }
      }
      roles: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          level: number
          color: string | null
          icon: string | null
          is_system: boolean | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          level?: number
          color?: string | null
          icon?: string | null
          is_system?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          level?: number
          color?: string | null
          icon?: string | null
          is_system?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      route_permissions: {
        Row: {
          allowed_roles: string
          created_at: string | null
          description: string | null
          is_system: boolean
          path: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_roles: string
          created_at?: string | null
          description?: string | null
          is_system?: boolean
          path: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_roles?: string
          created_at?: string | null
          description?: string | null
          is_system?: boolean
          path?: string
          updated_at?: string | null
          updated_by?: string | null
        }
      }
      rpc_rate_limits: {
        Row: {
          id: string
          identifier: string
          rpc_name: string
          window_start: string
          call_count: number
        }
        Insert: {
          id?: string
          identifier: string
          rpc_name: string
          window_start?: string
          call_count?: number
        }
        Update: {
          id?: string
          identifier?: string
          rpc_name?: string
          window_start?: string
          call_count?: number
        }
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
          tags: string | null
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
          tags?: string | null
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
          tags?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
          won_at?: string | null
        }
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
          color: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position: number
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
      }
      salespeople: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      saved_filters: {
        Row: {
          created_at: string | null
          entity_type: string
          filters: Json
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
      }
      scheduled_messages: {
        Row: {
          contact_id: string
          content: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          media_url: string | null
          message_type: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type: string
          scheduled_at: string
          sent_at?: string | null
          status: string
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
      }
      scheduled_report_configs: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          recipients: string
          report_type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          recipients: string
          report_type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          recipients?: string
          report_type?: string
          updated_at?: string | null
        }
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          format: string
          frequency: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          recipients: string
          report_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          format: string
          frequency: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          recipients: string
          report_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          recipients?: string
          report_type?: string
          updated_at?: string | null
        }
      }
      schema_migrations: {
        Row: {
          version: number
          inserted_at: string | null
        }
        Insert: {
          version: number
          inserted_at?: string | null
        }
        Update: {
          version?: number
          inserted_at?: string | null
        }
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
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
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
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
      }
      security_events: {
        Row: {
          id: string
          event_type: string
          severity: string | null
          user_id: string | null
          workspace_id: string | null
          ip_address: string | null
          user_agent: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          severity?: string | null
          user_id?: string | null
          workspace_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          severity?: string | null
          user_id?: string | null
          workspace_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json | null
          created_at?: string | null
        }
      }
      session_traces: {
        Row: {
          id: string
          session_id: string | null
          trace_type: string
          input: Json | null
          output: Json | null
          metadata: Json | null
          tokens_used: number | null
          latency_ms: number | null
          cost_usd: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          trace_type?: string
          input?: Json | null
          output?: Json | null
          metadata?: Json | null
          tokens_used?: number | null
          latency_ms?: number | null
          cost_usd?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          trace_type?: string
          input?: Json | null
          output?: Json | null
          metadata?: Json | null
          tokens_used?: number | null
          latency_ms?: number | null
          cost_usd?: number | null
          created_at?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          agent_id: string | null
          user_id: string
          status: string | null
          metadata: Json | null
          started_at: string | null
          ended_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          user_id: string
          status?: string | null
          metadata?: Json | null
          started_at?: string | null
          ended_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          user_id?: string
          status?: string | null
          metadata?: Json | null
          started_at?: string | null
          ended_at?: string | null
        }
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
      }
      skill_registry: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          category: string
          author: string
          version: string
          tags: string[] | null
          install_count: number
          rating: number
          skill_config: Json
          is_verified: boolean
          is_public: boolean
          mcp_server_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string
          category?: string
          author?: string
          version?: string
          tags?: string[] | null
          install_count?: number
          rating?: number
          skill_config?: Json
          is_verified?: boolean
          is_public?: boolean
          mcp_server_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          category?: string
          author?: string
          version?: string
          tags?: string[] | null
          install_count?: number
          rating?: number
          skill_config?: Json
          is_verified?: boolean
          is_public?: boolean
          mcp_server_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sla_alert_preferences: {
        Row: {
          alert_first_response: boolean
          alert_resolution: boolean
          created_at: string | null
          enabled: boolean
          id: string
          severity_breached: boolean
          severity_warning: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_first_response?: boolean
          alert_resolution?: boolean
          created_at?: string | null
          enabled?: boolean
          id?: string
          severity_breached?: boolean
          severity_warning?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_first_response?: boolean
          alert_resolution?: boolean
          created_at?: string | null
          enabled?: boolean
          id?: string
          severity_breached?: boolean
          severity_warning?: boolean
          updated_at?: string | null
          user_id?: string
        }
      }
      sla_configurations: {
        Row: {
          created_at: string | null
          first_response_minutes: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          priority: string
          resolution_minutes: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_response_minutes: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          priority: string
          resolution_minutes: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_response_minutes?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          priority?: string
          resolution_minutes?: number
          updated_at?: string | null
        }
      }
      sla_policies: {
        Row: {
          id: string
          name: string
          description: string | null
          first_response_minutes: number
          resolution_minutes: number
          warning_threshold_pct: number | null
          critical_threshold_pct: number | null
          is_active: boolean | null
          applies_to_queues: string[] | null
          business_hours_only: boolean | null
          priority: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          first_response_minutes?: number
          resolution_minutes?: number
          warning_threshold_pct?: number | null
          critical_threshold_pct?: number | null
          is_active?: boolean | null
          applies_to_queues?: string[] | null
          business_hours_only?: boolean | null
          priority?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          first_response_minutes?: number
          resolution_minutes?: number
          warning_threshold_pct?: number | null
          critical_threshold_pct?: number | null
          is_active?: boolean | null
          applies_to_queues?: string[] | null
          business_hours_only?: boolean | null
          priority?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      sla_rules: {
        Row: {
          agent_id: string | null
          company: string | null
          contact_id: string | null
          contact_type: string | null
          created_at: string | null
          first_response_minutes: number
          id: string
          is_active: boolean
          job_title: string | null
          metadata: Json | null
          name: string
          priority: number
          queue_id: string | null
          resolution_minutes: number
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          company?: string | null
          contact_id?: string | null
          contact_type?: string | null
          created_at?: string | null
          first_response_minutes: number
          id?: string
          is_active?: boolean
          job_title?: string | null
          metadata?: Json | null
          name: string
          priority: number
          queue_id?: string | null
          resolution_minutes: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          company?: string | null
          contact_id?: string | null
          contact_type?: string | null
          created_at?: string | null
          first_response_minutes?: number
          id?: string
          is_active?: boolean
          job_title?: string | null
          metadata?: Json | null
          name?: string
          priority?: number
          queue_id?: string | null
          resolution_minutes?: number
          updated_at?: string | null
        }
      }
      sla_violations: {
        Row: {
          id: string
          sla_policy_id: string | null
          contact_id: string | null
          conversation_id: string | null
          agent_id: string | null
          violation_type: string | null
          expected_minutes: number | null
          actual_minutes: number | null
          severity: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sla_policy_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          agent_id?: string | null
          violation_type?: string | null
          expected_minutes?: number | null
          actual_minutes?: number | null
          severity?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sla_policy_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          agent_id?: string | null
          violation_type?: string | null
          expected_minutes?: number | null
          actual_minutes?: number | null
          severity?: string | null
          resolved_at?: string | null
          created_at?: string
        }
      }
      solicitacoes_vale: {
        Row: {
          id: number
          id_bitrix: number
          periodo: string
          status: string
          valor: number | null
          id_card_bitrix: number | null
          lembretes: number | null
          disparado_em: string | null
          respondido_em: string | null
          criado_em: string | null
        }
        Insert: {
          id?: number
          id_bitrix: number
          periodo: string
          status?: string
          valor?: number | null
          id_card_bitrix?: number | null
          lembretes?: number | null
          disparado_em?: string | null
          respondido_em?: string | null
          criado_em?: string | null
        }
        Update: {
          id?: number
          id_bitrix?: number
          periodo?: string
          status?: string
          valor?: number | null
          id_card_bitrix?: number | null
          lembretes?: number | null
          disparado_em?: string | null
          respondido_em?: string | null
          criado_em?: string | null
        }
      }
      sticker_categories: {
        Row: {
          id: string
          slug: string
          label_pt: string
          label_en: string | null
          emoji: string | null
          sort_order: number | null
          is_active: boolean | null
          sticker_count: number | null
          total_uses: number | null
        }
        Insert: {
          id?: string
          slug: string
          label_pt: string
          label_en?: string | null
          emoji?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          sticker_count?: number | null
          total_uses?: number | null
        }
        Update: {
          id?: string
          slug?: string
          label_pt?: string
          label_en?: string | null
          emoji?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          sticker_count?: number | null
          total_uses?: number | null
        }
      }
      stickers: {
        Row: {
          id: string
          name: string
          image_url: string
          category: string | null
          use_count: number | null
          owner_id: string | null
          is_favorite: boolean | null
          is_animated: boolean | null
          is_active: boolean | null
          tags: string[] | null
          file_hash: string | null
          width: number | null
          height: number | null
          file_size: number | null
          mime_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          image_url: string
          category?: string | null
          use_count?: number | null
          owner_id?: string | null
          is_favorite?: boolean | null
          is_animated?: boolean | null
          is_active?: boolean | null
          tags?: string[] | null
          file_hash?: string | null
          width?: number | null
          height?: number | null
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          image_url?: string
          category?: string | null
          use_count?: number | null
          owner_id?: string | null
          is_favorite?: boolean | null
          is_animated?: boolean | null
          is_active?: boolean | null
          tags?: string[] | null
          file_hash?: string | null
          width?: number | null
          height?: number | null
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stress_test_runs: {
        Row: {
          abort_reason: string | null
          ended_at: string | null
          id: string
          instance_name: string
          results: Json
          started_at: string
          started_by: string
          status: string
          target_phone: string
          total_failed: number
          total_planned: number
          total_sent: number
        }
        Insert: {
          abort_reason?: string | null
          ended_at?: string | null
          id?: string
          instance_name: string
          results?: Json
          started_at: string
          started_by: string
          status: string
          target_phone: string
          total_failed: number
          total_planned: number
          total_sent: number
        }
        Update: {
          abort_reason?: string | null
          ended_at?: string | null
          id?: string
          instance_name?: string
          results?: Json
          started_at?: string
          started_by?: string
          status?: string
          target_phone?: string
          total_failed?: number
          total_planned?: number
          total_sent?: number
        }
      }
      supabase_projects: {
        Row: {
          id: string
          project_name: string
          project_slug: string | null
          description: string | null
          purpose: string | null
          status: string | null
          tables_count: number | null
          size_mb: number | null
          main_tables: Json | null
          health_status: string | null
          last_health_check: string | null
          config: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_name: string
          project_slug?: string | null
          description?: string | null
          purpose?: string | null
          status?: string | null
          tables_count?: number | null
          size_mb?: number | null
          main_tables?: Json | null
          health_status?: string | null
          last_health_check?: string | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_name?: string
          project_slug?: string | null
          description?: string | null
          purpose?: string | null
          status?: string | null
          tables_count?: number | null
          size_mb?: number | null
          main_tables?: Json | null
          health_status?: string | null
          last_health_check?: string | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      system_docs: {
        Row: {
          id: string
          doc_name: string
          version: string
          content: string
          content_hash: string
          generated_at: string
          generated_by: string
          size_bytes: number | null
          total_lines: number | null
          drift_from_previous: Json | null
        }
        Insert: {
          id?: string
          doc_name: string
          version: string
          content: string
          content_hash: string
          generated_at?: string
          generated_by?: string
          size_bytes?: number | null
          total_lines?: number | null
          drift_from_previous?: Json | null
        }
        Update: {
          id?: string
          doc_name?: string
          version?: string
          content?: string
          content_hash?: string
          generated_at?: string
          generated_by?: string
          size_bytes?: number | null
          total_lines?: number | null
          drift_from_previous?: Json | null
        }
      }
      system_settings: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tags: {
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
      }
      talkx_blacklist: {
        Row: {
          blocked_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
      }
      talkx_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
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
          updated_at: string | null
          variables_config: Json
          whatsapp_connection_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count: number
          failed_count: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_template: string
          name: string
          scheduled_at?: string | null
          send_interval_max: number
          send_interval_min: number
          sent_count: number
          started_at?: string | null
          status: string
          total_recipients: number
          typing_delay_max: number
          typing_delay_min: number
          updated_at?: string | null
          variables_config?: Json
          whatsapp_connection_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
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
          updated_at?: string | null
          variables_config?: Json
          whatsapp_connection_id?: string | null
        }
      }
      talkx_recipients: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          personalized_message: string | null
          request_id: string | null
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          personalized_message?: string | null
          request_id?: string | null
          sent_at?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          personalized_message?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
      }
      task_queues: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          max_concurrency: number | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          max_concurrency?: number | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          max_concurrency?: number | null
          status?: string | null
          created_at?: string | null
        }
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
          joined_at: string
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
      }
      team_conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string | null
        }
      }
      team_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
      }
      tenants: {
        Row: {
          id: string
          name: string | null
          external_id: string | null
          jwt_secret: string | null
          max_concurrent_users: number
          inserted_at: string
          updated_at: string
          max_events_per_second: number
          postgres_cdc_default: string | null
          max_bytes_per_second: number
          max_channels_per_client: number
          max_joins_per_second: number
          suspend: boolean | null
          jwt_jwks: Json | null
          notify_private_alpha: boolean | null
          private_only: boolean
          migrations_ran: number | null
          broadcast_adapter: string | null
          max_presence_events_per_second: number | null
          max_payload_size_in_kb: number | null
          max_client_presence_events_per_window: number | null
          client_presence_window_ms: number | null
        }
        Insert: {
          id: string
          name?: string | null
          external_id?: string | null
          jwt_secret?: string | null
          max_concurrent_users?: number
          inserted_at: string
          updated_at: string
          max_events_per_second?: number
          postgres_cdc_default?: string | null
          max_bytes_per_second?: number
          max_channels_per_client?: number
          max_joins_per_second?: number
          suspend?: boolean | null
          jwt_jwks?: Json | null
          notify_private_alpha?: boolean | null
          private_only?: boolean
          migrations_ran?: number | null
          broadcast_adapter?: string | null
          max_presence_events_per_second?: number | null
          max_payload_size_in_kb?: number | null
          max_client_presence_events_per_window?: number | null
          client_presence_window_ms?: number | null
        }
        Update: {
          id?: string
          name?: string | null
          external_id?: string | null
          jwt_secret?: string | null
          max_concurrent_users?: number
          inserted_at?: string
          updated_at?: string
          max_events_per_second?: number
          postgres_cdc_default?: string | null
          max_bytes_per_second?: number
          max_channels_per_client?: number
          max_joins_per_second?: number
          suspend?: boolean | null
          jwt_jwks?: Json | null
          notify_private_alpha?: boolean | null
          private_only?: boolean
          migrations_ran?: number | null
          broadcast_adapter?: string | null
          max_presence_events_per_second?: number | null
          max_payload_size_in_kb?: number | null
          max_client_presence_events_per_window?: number | null
          client_presence_window_ms?: number | null
        }
      }
      test_cases: {
        Row: {
          id: string
          dataset_id: string | null
          input: string
          expected_output: string | null
          metadata: Json | null
          tags: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          dataset_id?: string | null
          input: string
          expected_output?: string | null
          metadata?: Json | null
          tags?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          dataset_id?: string | null
          input?: string
          expected_output?: string | null
          metadata?: Json | null
          tags?: string[] | null
          created_at?: string | null
        }
      }
      tool_integrations: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          type: string
          description: string | null
          config: Json | null
          is_enabled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          type?: string
          description?: string | null
          config?: Json | null
          is_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          type?: string
          description?: string | null
          config?: Json | null
          is_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tool_policies: {
        Row: {
          id: string
          agent_id: string
          tool_integration_id: string | null
          is_allowed: boolean | null
          requires_approval: boolean | null
          max_calls_per_run: number | null
          environment: string | null
          config: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          tool_integration_id?: string | null
          is_allowed?: boolean | null
          requires_approval?: boolean | null
          max_calls_per_run?: number | null
          environment?: string | null
          config?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          tool_integration_id?: string | null
          is_allowed?: boolean | null
          requires_approval?: boolean | null
          max_calls_per_run?: number | null
          environment?: string | null
          config?: Json | null
          created_at?: string | null
        }
      }
      trace_events: {
        Row: {
          id: string
          session_trace_id: string | null
          event_type: string
          data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_trace_id?: string | null
          event_type: string
          data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_trace_id?: string | null
          event_type?: string
          data?: Json | null
          created_at?: string | null
        }
      }
      training_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
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
          created_at?: string | null
          feedback?: string | null
          id?: string
          messages?: Json | null
          profile_id: string
          scenario_name: string
          scenario_type?: string | null
          score?: number | null
          started_at: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
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
      }
      usage_records: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          record_type: string
          tokens: number | null
          cost_usd: number | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          record_type?: string
          tokens?: number | null
          cost_usd?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          record_type?: string
          tokens?: number | null
          cost_usd?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      user_devices: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
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
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          first_seen_at: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean | null
          last_seen_at: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
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
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_key: string
          workspace_id: string
          assigned_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role_key: string
          workspace_id: string
          assigned_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role_key?: string
          workspace_id?: string
          assigned_by?: string | null
          created_at?: string | null
        }
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
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at: string
          started_at: string
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
          created_at: string | null
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
          updated_at: string | null
          user_id: string
          welcome_message: string | null
          work_days: string | null
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
          created_at?: string | null
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
          updated_at?: string | null
          user_id: string
          welcome_message?: string | null
          work_days?: string | null
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
          created_at?: string | null
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
          updated_at?: string | null
          user_id?: string
          welcome_message?: string | null
          work_days?: string | null
        }
      }
      vector_indexes: {
        Row: {
          id: string
          knowledge_base_id: string | null
          provider: string | null
          model: string | null
          dimensions: number | null
          status: string | null
          config: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          knowledge_base_id?: string | null
          provider?: string | null
          model?: string | null
          dimensions?: number | null
          status?: string | null
          config?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          knowledge_base_id?: string | null
          provider?: string | null
          model?: string | null
          dimensions?: number | null
          status?: string | null
          config?: Json | null
          created_at?: string | null
        }
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
          alert_type: string
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
      }
      webhook_endpoints: {
        Row: {
          id: string
          workspace_id: string | null
          agent_id: string | null
          name: string
          url: string
          secret: string | null
          events: string[] | null
          is_active: boolean | null
          last_triggered_at: string | null
          trigger_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          name: string
          url: string
          secret?: string | null
          events?: string[] | null
          is_active?: boolean | null
          last_triggered_at?: string | null
          trigger_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          agent_id?: string | null
          name?: string
          url?: string
          secret?: string | null
          events?: string[] | null
          is_active?: boolean | null
          last_triggered_at?: string | null
          trigger_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      webhook_events: {
        Row: {
          id: string
          webhook_id: string | null
          event_type: string
          payload: Json | null
          response_status: number | null
          response_body: string | null
          latency_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          webhook_id?: string | null
          event_type: string
          payload?: Json | null
          response_status?: number | null
          response_body?: string | null
          latency_ms?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          webhook_id?: string | null
          event_type?: string
          payload?: Json | null
          response_status?: number | null
          response_body?: string | null
          latency_ms?: number | null
          created_at?: string | null
        }
      }
      webhook_health_alerts: {
        Row: {
          id: string
          alert_type: string
          severity: string
          title: string
          details: Json | null
          created_at: string | null
          resolved_at: string | null
          acknowledged: boolean | null
        }
        Insert: {
          id?: string
          alert_type: string
          severity: string
          title: string
          details?: Json | null
          created_at?: string | null
          resolved_at?: string | null
          acknowledged?: boolean | null
        }
        Update: {
          id?: string
          alert_type?: string
          severity?: string
          title?: string
          details?: Json | null
          created_at?: string | null
          resolved_at?: string | null
          acknowledged?: boolean | null
        }
      }
      whatsapp_connection_queues: {
        Row: {
          created_at: string | null
          id: string
          queue_id: string
          whatsapp_connection_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          queue_id: string
          whatsapp_connection_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          queue_id?: string
          whatsapp_connection_id?: string
        }
      }
      whatsapp_connections: {
        Row: {
          id: string
          name: string
          phone_number: string | null
          instance_name: string
          instance_id: string | null
          api_url: string
          api_key: string
          status: string | null
          qr_code: string | null
          qr_code_base64: string | null
          is_active: boolean | null
          is_default: boolean | null
          webhook_url: string | null
          settings: Json | null
          last_connected_at: string | null
          connected_at: string | null
          disconnected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone_number?: string | null
          instance_name: string
          instance_id?: string | null
          api_url: string
          api_key: string
          status?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          webhook_url?: string | null
          settings?: Json | null
          last_connected_at?: string | null
          connected_at?: string | null
          disconnected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string | null
          instance_name?: string
          instance_id?: string | null
          api_url?: string
          api_key?: string
          status?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          webhook_url?: string | null
          settings?: Json | null
          last_connected_at?: string | null
          connected_at?: string | null
          disconnected_at?: string | null
          created_at?: string
          updated_at?: string
        }
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
      }
      whatsapp_groups: {
        Row: {
          avatar_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          is_admin: boolean | null
          name: string
          participant_count: number | null
          updated_at: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          is_admin?: boolean | null
          name: string
          participant_count?: number | null
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          is_admin?: boolean | null
          name?: string
          participant_count?: number | null
          updated_at?: string | null
          whatsapp_connection_id?: string | null
        }
      }
      whatsapp_official_credentials: {
        Row: {
          access_token: string
          app_secret: string
          business_account_id: string | null
          connection_id: string
          created_at: string | null
          created_by: string | null
          graph_api_version: string
          id: string
          phone_number_id: string
          updated_at: string | null
          verify_token: string
          waba_id: string | null
        }
        Insert: {
          access_token: string
          app_secret: string
          business_account_id?: string | null
          connection_id: string
          created_at?: string | null
          created_by?: string | null
          graph_api_version: string
          id?: string
          phone_number_id: string
          updated_at?: string | null
          verify_token: string
          waba_id?: string | null
        }
        Update: {
          access_token?: string
          app_secret?: string
          business_account_id?: string | null
          connection_id?: string
          created_at?: string | null
          created_by?: string | null
          graph_api_version?: string
          id?: string
          phone_number_id?: string
          updated_at?: string | null
          verify_token?: string
          waba_id?: string | null
        }
      }
      whatsapp_templates: {
        Row: {
          buttons: Json | null
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          language: string
          name: string
          status: string
          updated_at: string | null
          variables: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          buttons?: Json | null
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language: string
          name: string
          status: string
          updated_at?: string | null
          variables?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          buttons?: Json | null
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name?: string
          status?: string
          updated_at?: string | null
          variables?: string | null
          whatsapp_connection_id?: string | null
        }
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
      }
      workflow_checkpoints: {
        Row: {
          id: string
          workflow_run_id: string | null
          step_index: number
          state: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          workflow_run_id?: string | null
          step_index: number
          state?: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          workflow_run_id?: string | null
          step_index?: number
          state?: Json
          created_at?: string | null
        }
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string | null
          trigger_type: string | null
          input: Json | null
          output: Json | null
          status: string | null
          error: string | null
          tokens_total: number | null
          cost_total: number | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          workflow_id?: string | null
          trigger_type?: string | null
          input?: Json | null
          output?: Json | null
          status?: string | null
          error?: string | null
          tokens_total?: number | null
          cost_total?: number | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          workflow_id?: string | null
          trigger_type?: string | null
          input?: Json | null
          output?: Json | null
          status?: string | null
          error?: string | null
          tokens_total?: number | null
          cost_total?: number | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      workflow_handoffs: {
        Row: {
          id: string
          workflow_run_id: string | null
          from_agent_id: string | null
          to_agent_id: string | null
          context: Json | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workflow_run_id?: string | null
          from_agent_id?: string | null
          to_agent_id?: string | null
          context?: Json | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workflow_run_id?: string | null
          from_agent_id?: string | null
          to_agent_id?: string | null
          context?: Json | null
          status?: string | null
          created_at?: string | null
        }
      }
      workflow_runs: {
        Row: {
          id: string
          workflow_id: string
          status: string
          current_step: number | null
          total_steps: number | null
          output: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          status?: string
          current_step?: number | null
          total_steps?: number | null
          output?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          status?: string
          current_step?: number | null
          total_steps?: number | null
          output?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      workflow_step_runs: {
        Row: {
          id: string
          workflow_run_id: string | null
          workflow_step_id: string | null
          step_order: number | null
          status: string | null
          input: Json | null
          output: Json | null
          error: string | null
          tokens_used: number | null
          cost_usd: number | null
          latency_ms: number | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          workflow_run_id?: string | null
          workflow_step_id?: string | null
          step_order?: number | null
          status?: string | null
          input?: Json | null
          output?: Json | null
          error?: string | null
          tokens_used?: number | null
          cost_usd?: number | null
          latency_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          workflow_run_id?: string | null
          workflow_step_id?: string | null
          step_order?: number | null
          status?: string | null
          input?: Json | null
          output?: Json | null
          error?: string | null
          tokens_used?: number | null
          cost_usd?: number | null
          latency_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      workflow_steps: {
        Row: {
          id: string
          workflow_run_id: string | null
          step_index: number
          node_id: string | null
          status: string | null
          input: Json | null
          output: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workflow_run_id?: string | null
          step_index?: number
          node_id?: string | null
          status?: string | null
          input?: Json | null
          output?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workflow_run_id?: string | null
          step_index?: number
          node_id?: string | null
          status?: string | null
          input?: Json | null
          output?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
      }
      workflows: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          description: string | null
          definition: Json
          status: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          description?: string | null
          definition?: Json
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          description?: string | null
          definition?: Json
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string
          role: string
          email: string | null
          name: string | null
          invited_at: string | null
          accepted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id: string
          role?: string
          email?: string | null
          name?: string | null
          invited_at?: string | null
          accepted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string
          role?: string
          email?: string | null
          name?: string | null
          invited_at?: string | null
          accepted_at?: string | null
        }
      }
      workspace_secrets: {
        Row: {
          id: string
          workspace_id: string | null
          key_name: string
          key_value: string | null
          encrypted_value: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          key_name: string
          key_value?: string | null
          encrypted_value?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          key_name?: string
          key_value?: string | null
          encrypted_value?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          slug: string | null
          plan: string | null
          config: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          slug?: string | null
          plan?: string | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
          plan?: string | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      zapp_audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      audit_log_safe: {
        Row: {
          id: string | null
          user_id: string | null
          action: string | null
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          created_at: string | null
        }
      }
      contacts: {
        Row: {
          id: string | null
          name: string | null
          phone: string | null
          email: string | null
          avatar_url: string | null
          status: string | null
          assigned_to: string | null
          queue_id: string | null
          whatsapp_connection_id: string | null
          last_message_at: string | null
          first_message_at: string | null
          unread_count: number | null
          is_blocked: boolean | null
          is_favorite: boolean | null
          cpf: string | null
          company: string | null
          position: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          notes: string | null
          source: string | null
          external_id: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          remote_jid: string | null
          push_name: string | null
          instance_name: string | null
          lead_score: number | null
          total_purchases: number | null
          whatsapp_labels: string[] | null
          tags: string[] | null
        }
      }
      email_tracking_summary: {
        Row: {
          user_id: string | null
          total_tracked: number | null
          total_opened: number | null
          total_clicked: number | null
          total_bounced: number | null
          total_failed: number | null
          sum_opens: number | null
          sum_clicks: number | null
          open_rate: number | null
          click_through_rate: number | null
          first_tracked_at: string | null
          last_tracked_at: string | null
        }
      }
      messages: {
        Row: {
          id: string | null
          contact_id: string | null
          connection_id: string | null
          direction: string | null
          content: string | null
          message_type: string | null
          media_url: string | null
          media_mime_type: string | null
          media_filename: string | null
          media_size: number | null
          whatsapp_message_id: string | null
          whatsapp_timestamp: string | null
          status: string | null
          is_from_me: boolean | null
          sender_id: string | null
          reply_to_message_id: string | null
          quoted_message: Json | null
          metadata: Json | null
          is_deleted: boolean | null
          is_edited: boolean | null
          reaction: string | null
          latitude: number | null
          longitude: number | null
          external_id: string | null
          caption: string | null
          instance_name: string | null
          push_name: string | null
          remote_jid: string | null
          conversation_id: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      v_active_alerts: {
        Row: {
          id: string | null
          alert_type: string | null
          severity: string | null
          message: string | null
          payload: Json | null
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
        }
      }
      v_active_stages: {
        Row: {
          stage_key: string | null
          label_name: string | null
          label_color: string | null
          stage_order: number | null
          auto_transition_after_hours: number | null
          next_stage: string | null
        }
      }
      v_backfill_stats: {
        Row: {
          total_jids: number | null
          pending: number | null
          fetching: number | null
          ingesting: number | null
          completed: number | null
          errors: number | null
          total_source_msgs: number | null
          total_ingested: number | null
          pct_done: number | null
        }
      }
      v_complete_dashboard: {
        Row: {
          total_contacts: number | null
          total_messages: number | null
          total_conversations: number | null
          pipeline_value: number | null
        }
      }
      v_connection_uptime: {
        Row: {
          instance_name: string | null
          times_connected: number | null
          times_disconnected: number | null
          total_uptime_seconds: number | null
          total_downtime_seconds: number | null
          uptime_percentage: number | null
        }
      }
      v_contact_360: {
        Row: {
          id: string | null
          remote_jid: string | null
          nome: string | null
          phone_number: string | null
          company: string | null
          lead_status: string | null
          lead_score: number | null
          total_messages: number | null
          last_message_at: string | null
          assigned_to: string | null
          instancias_interacao: Json | null
          departamentos_contato: Json | null
          deals_ativos: number | null
          pipeline_value: number | null
        }
      }
      v_contacts_by_tag: {
        Row: {
          tag_name: string | null
          color: string | null
          contact_count: number | null
          phones: string[] | null
        }
      }
      v_contacts_with_legacy: {
        Row: {
          id: string | null
          remote_jid: string | null
          phone_number: string | null
          push_name: string | null
          profile_picture_url: string | null
          full_name: string | null
          email: string | null
          company: string | null
          role_title: string | null
          lead_status: string | null
          lead_source: string | null
          lead_score: number | null
          whatsapp_labels: string[] | null
          tags: string[] | null
          assigned_to: string | null
          first_contact_at: string | null
          last_message_at: string | null
          total_messages: number | null
          total_purchases: number | null
          notes: string | null
          instance_name: string | null
          raw_data: Json | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
          message_count: number | null
        }
      }
      v_cron_status: {
        Row: {
          job_name: string | null
          schedule: Json | null
          description: string | null
          items_pending: number | null
          last_config_update: string | null
        }
      }
      v_daily_sales_summary: {
        Row: {
          date: string | null
          new_deals: number | null
          total_value: number | null
          closed_value: number | null
          lost_value: number | null
          won_count: number | null
          lost_count: number | null
        }
      }
      v_deleted_contacts: {
        Row: {
          id: string | null
          name: string | null
          phone: string | null
          email: string | null
          deleted_at: string | null
          instance_name: string | null
        }
      }
      v_department_volume: {
        Row: {
          department: string | null
          instancias: number | null
          instance_names: string[] | null
        }
      }
      v_email_accounts_unified: {
        Row: {
          id: string | null
          provider: string | null
          created_at: string | null
        }
      }
      v_evolution_dlq_open: {
        Row: {
          id: string | null
          created_at: string | null
          event_type: string | null
          instance_name: string | null
          remote_jid: string | null
          status: string | null
          retry_count: number | null
          max_retries: number | null
          next_retry_at: string | null
          error_message_preview: string | null
          exhausted: boolean | null
          age_seconds: number | null
        }
      }
      v_evolution_source_tables_summary: {
        Row: {
          table_name: string | null
          rows: number | null
          num_columns: number | null
          jsonb_cols: number | null
          timestamp_cols: number | null
          status: string | null
          last_discovered: string | null
        }
      }
      v_gmail_sla_dashboard: {
        Row: {
          account_id: string | null
          email_address: string | null
          sync_status: string | null
          created_at: string | null
        }
      }
      v_guardrail_dashboard: {
        Row: {
          day: string | null
          workspace_id: string | null
          direction: string | null
          total_checks: number | null
          passed: number | null
          blocked: number | null
          avg_latency_ms: number | null
        }
      }
      v_hourly_metrics: {
        Row: {
          hora: string | null
          total: number | null
          inbound: number | null
          outbound: number | null
        }
      }
      v_instance_dashboard: {
        Row: {
          instance_name: string | null
          display_name: string | null
          department: string | null
          responsible_name: string | null
          phone_number: string | null
          is_active: boolean | null
          sla_first_response_minutes: number | null
          sla_resolution_hours: number | null
        }
      }
      v_integration_dashboard: {
        Row: {
          id: string | null
          name: string | null
          type: string | null
          provider: string | null
          status: string | null
          health_status: string | null
          endpoint_url: string | null
          last_health_check: string | null
          hours_since_check: number | null
          config: Json | null
          metadata: Json | null
          status_emoji: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      v_lead_status_coverage: {
        Row: {
          status: string | null
          permitido_no_constraint: boolean | null
          qtd_contatos: number | null
          status_visual: string | null
        }
      }
      v_legacy_stages: {
        Row: {
          stage_key: string | null
          label_name: string | null
          label_color: string | null
          stage_order: number | null
          auto_transition_after_hours: number | null
          next_stage: string | null
        }
      }
      v_legacy_vs_evolution_comparison: {
        Row: {
          entidade: string | null
          qtd_legacy: number | null
          qtd_evolution: number | null
          migrados: number | null
          novos_pos_migracao: number | null
          pct_migrado: number | null
          status_visual: string | null
          dados_em: string | null
          origem: string | null
        }
      }
      v_migration_reconciliation: {
        Row: {
          entidade: string | null
          legacy_total: number | null
          evolution_total: number | null
          from_legacy: number | null
          native_or_live: number | null
          status_reconciliacao: string | null
          taxa_migracao_pct: number | null
          snapshot_em: string | null
        }
      }
      v_mirror_backfill_progress: {
        Row: {
          run_id: string | null
          total_batches: number | null
          consumed: number | null
          consuming: number | null
          pending: number | null
          failed: number | null
          progress_pct: number | null
          total_rows: number | null
          rows_inserted: number | null
          rows_skipped: number | null
          rows_errored: number | null
          avg_chunk_ms: number | null
          started_at: string | null
          last_consumed_at: string | null
          eta: string | null
        }
      }
      v_model_catalog: {
        Row: {
          model: string | null
          provider: string | null
          tier: string | null
          capabilities: string[] | null
          context_window: number | null
          input_cost_per_1m: number | null
          output_cost_per_1m: number | null
          active_params: string | null
          total_params: string | null
          cost_tier: string | null
        }
      }
      v_monthly_comparison: {
        Row: {
          month: string | null
          new_contacts: number | null
          messages_received: number | null
          messages_sent: number | null
          deals_created: number | null
          deals_won: number | null
          deals_lost: number | null
          revenue: number | null
          win_rate: number | null
          avg_deal_value: number | null
        }
      }
      v_nlp_analytics: {
        Row: {
          day: string | null
          workspace_id: string | null
          source_type: string | null
          total_extractions: number | null
          avg_processing_ms: number | null
          positive_count: number | null
          negative_count: number | null
          urgent_count: number | null
          neutral_count: number | null
        }
      }
      v_pending_conversations: {
        Row: {
          id: string | null
          contact_id: string | null
          remote_jid: string | null
          status: string | null
          assigned_to: string | null
          department: string | null
          subject: string | null
          priority: string | null
          labels: string[] | null
          message_count: number | null
          first_message_at: string | null
          last_message_at: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          first_response_at: string | null
          first_response_seconds: number | null
          resolution_at: string | null
          resolution_seconds: number | null
          is_bot_active: boolean | null
          bot_session_id: string | null
          satisfaction_score: number | null
          satisfaction_comment: string | null
          instance_name: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          last_message_content: string | null
          last_message_type: string | null
          unread_count: number | null
          contact_name: string | null
          phone_number: string | null
        }
      }
      v_pending_notifications: {
        Row: {
          id: string | null
          channel: string | null
          message: string | null
          created_at: string | null
          webhook_url: string | null
          api_token: string | null
          chat_id: string | null
          severity: string | null
          alert_type: string | null
        }
      }
      v_pending_tasks: {
        Row: {
          id: string | null
          title: string | null
          task_type: string | null
          priority: string | null
          due_date: string | null
          due_time: string | null
          assigned_to: string | null
          status: string | null
          contact_name: string | null
          contact_phone: string | null
          deal_title: string | null
          deal_value: number | null
          urgency: string | null
        }
      }
      v_popular_tags: {
        Row: {
          id: string | null
          name: string | null
          color: string | null
          category: string | null
          use_count: number | null
          current_assignments: number | null
        }
      }
      v_ragas_by_agent: {
        Row: {
          agent_id: string | null
          workspace_id: string | null
          total_evaluations: number | null
          avg_faithfulness: number | null
          avg_answer_relevancy: number | null
          avg_context_precision: number | null
          avg_context_recall: number | null
          avg_answer_correctness: number | null
          avg_overall_score: number | null
          first_eval: string | null
          last_eval: string | null
        }
      }
      v_realtime_dashboard: {
        Row: {
          total_contatos: number | null
          novos_7d: number | null
          mensagens_hoje: number | null
          mensagens_7d: number | null
          conversas_abertas: number | null
          deals_ativos: number | null
          pipeline_value: number | null
        }
      }
      v_sales_pipeline: {
        Row: {
          stage: string | null
          deals_count: number | null
          total_value: number | null
          weighted_value: number | null
          avg_deal_value: number | null
          avg_probability: number | null
        }
      }
      v_system_health: {
        Row: {
          total_contacts: number | null
          messages_24h: number | null
          total_failed: number | null
          stuck_sending: number | null
          pending: number | null
          dlq_size: number | null
          errors_24h: number | null
          active_connections: number | null
          total_connections: number | null
          db_size: string | null
          checked_at: string | null
        }
      }
      v_top_contacts: {
        Row: {
          id: string | null
          phone_number: string | null
          name: string | null
          company: string | null
          lead_status: string | null
          lead_score: number | null
          total_messages: number | null
          total_purchases: number | null
          last_message_at: string | null
          active_deals: number | null
          pipeline_value: number | null
        }
      }
      v_webhook_events_last_hour: {
        Row: {
          event_type: string | null
          instance_name: string | null
          cnt: number | null
        }
      }
      v_weekly_metrics: {
        Row: {
          metric_date: string | null
          new_contacts: number | null
          total_messages: number | null
          deals_created: number | null
          deals_won: number | null
          revenue: number | null
          win_rate: number | null
        }
      }
      vw_contact_labels: {
        Row: {
          remote_jid: string | null
          contact_name: string | null
          phone_number: string | null
          active_labels: string[] | null
          label_count: number | null
        }
      }
      vw_dlq_pending: {
        Row: {
          id: string | null
          event_type: string | null
          instance_name: string | null
          remote_jid: string | null
          error_message: string | null
          retry_count: number | null
          max_retries: number | null
          next_retry_at: string | null
          status: string | null
          created_at: string | null
          retry_status: string | null
        }
      }
      vw_evolution_hot_leads: {
        Row: {
          remote_jid: string | null
          push_name: string | null
          lead_score: number | null
          total_messages: number | null
          last_message_at: string | null
          created_at: string | null
        }
      }
      vw_evolution_queue_failures: {
        Row: {
          id: string | null
          status: string | null
          attempts: number | null
          max_attempts: number | null
          remote_jid: string | null
          message_type: string | null
          source: string | null
          created_at: string | null
          error_message: string | null
          error_category: string | null
          is_retriable: boolean | null
          is_real_failure: boolean | null
        }
      }
      vw_evolution_queues_health: {
        Row: {
          queue_name: string | null
          pending: number | null
          pending_old: number | null
          sent: number | null
          delivered: number | null
          failed: number | null
          status_summary: string | null
          success_rate_pct: number | null
        }
      }
      vw_evolution_realtime_metrics: {
        Row: {
          total_contacts: number | null
          total_messages: number | null
          total_conversations: number | null
          unresolved_alerts: number | null
          events_last_hour: number | null
        }
      }
      vw_evolution_sales_funnel: {
        Row: {
          stage_key: string | null
          label_name: string | null
          stage_order: number | null
          contacts_count: number | null
          pct_of_total: number | null
        }
      }
      vw_evolution_top_contacts: {
        Row: {
          remote_jid: string | null
          push_name: string | null
          lead_score: number | null
          total_messages: number | null
          lead_status: string | null
          last_message_at: string | null
          created_at: string | null
          days_as_contact: number | null
        }
      }
      vw_groups_summary: {
        Row: {
          id: string | null
          group_jid: string | null
          name: string | null
          category: string | null
          participant_count: number | null
          is_community: boolean | null
          is_monitored: boolean | null
          auto_response_enabled: boolean | null
          last_activity_at: string | null
          messages_today: number | null
          active_rules: number | null
        }
      }
      vw_historico: {
        Row: {
          id_bitrix: number | null
          nome: string | null
          periodo: string | null
          status: string | null
          valor: number | null
          lembretes: number | null
          respondido_em: string | null
        }
      }
      vw_media_health_dashboard: {
        Row: {
          message_type: string | null
          total: number | null
          with_url: number | null
          pct_with_url: number | null
          with_mime: number | null
          last_24h: number | null
          last_24h_with_url: number | null
          pct_24h_with_url: number | null
          health_status: string | null
        }
      }
      vw_media_pipeline_status: {
        Row: {
          total_media_msgs: number | null
          with_url: number | null
          without_url: number | null
          pct_with_url: number | null
          s3_public: number | null
          supabase_cloud: number | null
          minio_internal: number | null
          queue_pending: number | null
          queue_processing: number | null
          queue_done: number | null
          queue_failed: number | null
          overall_status: string | null
        }
      }
      vw_missed_calls_pending: {
        Row: {
          id: string | null
          call_id: string | null
          remote_jid: string | null
          call_type: string | null
          created_at: string | null
          missed_callback_sent: boolean | null
          contact_name: string | null
          phone_number: string | null
          minutes_since_call: number | null
        }
      }
      vw_pendentes_atual: {
        Row: {
          id_bitrix: number | null
          nome: string | null
          dialog_id: string | null
          lembretes: number | null
          disparado_em: string | null
        }
      }
      vw_recent_media: {
        Row: {
          id: string | null
          message_id: string | null
          remote_jid: string | null
          media_type: string | null
          mime_type: string | null
          file_name: string | null
          file_size: number | null
          storage_url: string | null
          caption: string | null
          created_at: string | null
          contact_name: string | null
        }
      }
      vw_resumo_mes: {
        Row: {
          periodo: string | null
          pendentes: number | null
          solicitaram: number | null
          recusaram: number | null
          valor_total: number | null
          total: number | null
        }
      }
      vw_sticker_categories: {
        Row: {
          category: string | null
          total: number | null
          favorites: number | null
          total_uses: number | null
          last_used_at: string | null
        }
      }
      vw_sticker_messages: {
        Row: {
          id: string | null
          message_id: string | null
          remote_jid: string | null
          from_me: boolean | null
          media_url: string | null
          media_mimetype: string | null
          status: string | null
          instance_name: string | null
          push_name: string | null
          contact_id: string | null
          created_at: string | null
          contact_name: string | null
          contact_phone: string | null
          storage_type: string | null
          has_media: boolean | null
        }
      }
      vw_unread_events: {
        Row: {
          id: string | null
          event_type: string | null
          entity_type: string | null
          entity_id: string | null
          remote_jid: string | null
          title: string | null
          body: string | null
          data: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          target_users: string[] | null
          created_at: string | null
          priority_order: number | null
        }
      }
    }
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
