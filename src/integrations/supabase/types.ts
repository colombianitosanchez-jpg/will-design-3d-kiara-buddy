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
      admin_settings: {
        Row: {
          created_at: string
          id: string
          quoting_vars: Json
          sidebar_order: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          quoting_vars?: Json
          sidebar_order?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          quoting_vars?: Json
          sidebar_order?: Json
          updated_at?: string
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          color_hex: string | null
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string
          id: string
          input_type: string
          is_filterable: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_type?: string
          is_filterable?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_type?: string
          is_filterable?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
          id: string
          is_required: boolean
          sort_order: number
        }
        Insert: {
          attribute_id: string
          category_id: string
          id?: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          attribute_id?: string
          category_id?: string
          id?: string
          is_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_carousel: {
        Row: {
          action_url: string | null
          created_at: string
          display_order: number
          duration_ms: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          display_order?: number
          duration_ms?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url: string
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          display_order?: number
          duration_ms?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_providers: {
        Row: {
          api_key: string | null
          base_url: string
          created_at: string
          id: string
          is_active: boolean
          max_tokens: number | null
          model: string
          name: string
          priority: number
          system_prompt: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          base_url: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model: string
          name: string
          priority?: number
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          base_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model?: string
          name?: string
          priority?: number
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          attribute_value_id: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          custom_url: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          link_type: string | null
          link_value: string | null
          parent_id: string | null
          service_anchor: string | null
          site_page: string | null
          slug: string
          target_kind: string | null
        }
        Insert: {
          attribute_value_id?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          custom_url?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          link_type?: string | null
          link_value?: string | null
          parent_id?: string | null
          service_anchor?: string | null
          site_page?: string | null
          slug: string
          target_kind?: string | null
        }
        Update: {
          attribute_value_id?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          custom_url?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          link_type?: string | null
          link_value?: string | null
          parent_id?: string | null
          service_anchor?: string | null
          site_page?: string | null
          slug?: string
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          ask_for_file: boolean
          created_at: string
          id: string
          include_image: boolean
          is_active: boolean
          message_text: string
          platform: string
          product_id: string | null
          target_audience: string
          title: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          ask_for_file?: boolean
          created_at?: string
          id?: string
          include_image?: boolean
          is_active?: boolean
          message_text: string
          platform?: string
          product_id?: string | null
          target_audience?: string
          title: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          ask_for_file?: boolean
          created_at?: string
          id?: string
          include_image?: boolean
          is_active?: boolean
          message_text?: string
          platform?: string
          product_id?: string | null
          target_audience?: string
          title?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      messaging_settings: {
        Row: {
          business_hours_end: number
          business_hours_start: number
          id: string
          is_hours_active: boolean
          telegram_username_or_group: string
          updated_at: string
          whatsapp_phone: string
        }
        Insert: {
          business_hours_end?: number
          business_hours_start?: number
          id?: string
          is_hours_active?: boolean
          telegram_username_or_group?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Update: {
          business_hours_end?: number
          business_hours_start?: number
          id?: string
          is_hours_active?: boolean
          telegram_username_or_group?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          events: Json
          id: string
          is_enabled: boolean
          templates: Json
          timezone: string
          updated_at: string
          whatsapp_api_url: string
          work_end_hour: number
          work_start_hour: number
          working_days: number[]
        }
        Insert: {
          created_at?: string
          events?: Json
          id?: string
          is_enabled?: boolean
          templates?: Json
          timezone?: string
          updated_at?: string
          whatsapp_api_url?: string
          work_end_hour?: number
          work_start_hour?: number
          working_days?: number[]
        }
        Update: {
          created_at?: string
          events?: Json
          id?: string
          is_enabled?: boolean
          templates?: Json
          timezone?: string
          updated_at?: string
          whatsapp_api_url?: string
          work_end_hour?: number
          work_start_hour?: number
          working_days?: number[]
        }
        Relationships: []
      }
      notifications_queue: {
        Row: {
          created_at: string
          customer_phone: string
          error: string | null
          event: string
          id: string
          message: string
          order_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string
          error?: string | null
          event?: string
          id?: string
          message?: string
          order_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          error?: string | null
          event?: string
          id?: string
          message?: string
          order_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price_cop: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price_cop?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price_cop?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          payment_confirmed_at: string | null
          payment_method_id: string | null
          payment_method_name: string | null
          payment_note: string | null
          payment_reference: string | null
          payment_reported_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          public_token: string
          shipping_address: string
          shipping_city: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_cop: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_confirmed_at?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          payment_note?: string | null
          payment_reference?: string | null
          payment_reported_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          public_token?: string
          shipping_address: string
          shipping_city?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cop?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_confirmed_at?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          payment_note?: string | null
          payment_reference?: string | null
          payment_reported_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          public_token?: string
          shipping_address?: string
          shipping_city?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cop?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          config: Json
          created_at: string
          credentials: Json
          display_order: number
          id: string
          instructions: string
          is_active: boolean
          name: string
          qr_image_url: string | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credentials?: Json
          display_order?: number
          id?: string
          instructions?: string
          is_active?: boolean
          name: string
          qr_image_url?: string | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          credentials?: Json
          display_order?: number
          id?: string
          instructions?: string
          is_active?: boolean
          name?: string
          qr_image_url?: string | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          base_price_per_gram_cop: number
          created_at: string
          finish_multipliers: Json
          id: string
          is_active: boolean
          machine_hour_cop: number
          margin_percent: number
          material_multipliers: Json
          min_price_cop: number
          name: string
          setup_fee_cop: number
          updated_at: string
        }
        Insert: {
          base_price_per_gram_cop?: number
          created_at?: string
          finish_multipliers?: Json
          id?: string
          is_active?: boolean
          machine_hour_cop?: number
          margin_percent?: number
          material_multipliers?: Json
          min_price_cop?: number
          name?: string
          setup_fee_cop?: number
          updated_at?: string
        }
        Update: {
          base_price_per_gram_cop?: number
          created_at?: string
          finish_multipliers?: Json
          id?: string
          is_active?: boolean
          machine_hour_cop?: number
          margin_percent?: number
          material_multipliers?: Json
          min_price_cop?: number
          name?: string
          setup_fee_cop?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          attribute_value_id: string | null
          created_at: string
          id: string
          product_id: string
          text_value: string | null
        }
        Insert: {
          attribute_id: string
          attribute_value_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          text_value?: string | null
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accepts_3d_file: boolean
          active: boolean
          allowed_payment_method_ids: Json
          brand_id: string | null
          btn_text: string
          category_id: string | null
          created_at: string
          custom_buttons: Json
          custom_share_text: string | null
          description: string
          featured: boolean
          hide_default_cta: boolean
          id: string
          image_url: string | null
          images: Json
          kiara_tip: string
          name: string
          price_cop: number
          quote_only: boolean
          short: string
          show_whatsapp: boolean
          sku: string | null
          slug: string
          specs: Json
          stock: number
          updated_at: string
          variant_label: string
          variants: Json
        }
        Insert: {
          accepts_3d_file?: boolean
          active?: boolean
          allowed_payment_method_ids?: Json
          brand_id?: string | null
          btn_text?: string
          category_id?: string | null
          created_at?: string
          custom_buttons?: Json
          custom_share_text?: string | null
          description?: string
          featured?: boolean
          hide_default_cta?: boolean
          id?: string
          image_url?: string | null
          images?: Json
          kiara_tip?: string
          name: string
          price_cop?: number
          quote_only?: boolean
          short?: string
          show_whatsapp?: boolean
          sku?: string | null
          slug: string
          specs?: Json
          stock?: number
          updated_at?: string
          variant_label?: string
          variants?: Json
        }
        Update: {
          accepts_3d_file?: boolean
          active?: boolean
          allowed_payment_method_ids?: Json
          brand_id?: string | null
          btn_text?: string
          category_id?: string | null
          created_at?: string
          custom_buttons?: Json
          custom_share_text?: string | null
          description?: string
          featured?: boolean
          hide_default_cta?: boolean
          id?: string
          image_url?: string | null
          images?: Json
          kiara_tip?: string
          name?: string
          price_cop?: number
          quote_only?: boolean
          short?: string
          show_whatsapp?: boolean
          sku?: string | null
          slug?: string
          specs?: Json
          stock?: number
          updated_at?: string
          variant_label?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quoter_fields: {
        Row: {
          created_at: string
          default_value: string
          help: string
          id: string
          input_type: string
          is_active: boolean
          is_required: boolean
          key: string
          label: string
          max_value: number
          min_value: number
          multiplier: number
          options: Json
          price_per_unit_cop: number
          price_source: string
          service_id: string
          sort_order: number
          step_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: string
          help?: string
          id?: string
          input_type?: string
          is_active?: boolean
          is_required?: boolean
          key: string
          label: string
          max_value?: number
          min_value?: number
          multiplier?: number
          options?: Json
          price_per_unit_cop?: number
          price_source?: string
          service_id: string
          sort_order?: number
          step_value?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: string
          help?: string
          id?: string
          input_type?: string
          is_active?: boolean
          is_required?: boolean
          key?: string
          label?: string
          max_value?: number
          min_value?: number
          multiplier?: number
          options?: Json
          price_per_unit_cop?: number
          price_source?: string
          service_id?: string
          sort_order?: number
          step_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quoter_fields_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "quoter_services"
            referencedColumns: ["id"]
          },
        ]
      }
      quoter_services: {
        Row: {
          allow_file: boolean
          allow_quantity: boolean
          base_price_cop: number
          created_at: string
          description: string
          gastos_extra_cop: number
          has_calculator: boolean
          icon: string
          id: string
          is_active: boolean
          margin_percent: number
          min_price_cop: number
          name: string
          price_display: string
          pricing_mode: string
          site_anchor: string
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
          uses_global_vars: boolean
          volume_tiers: Json
          whatsapp_custom_message: string | null
        }
        Insert: {
          allow_file?: boolean
          allow_quantity?: boolean
          base_price_cop?: number
          created_at?: string
          description?: string
          gastos_extra_cop?: number
          has_calculator?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          margin_percent?: number
          min_price_cop?: number
          name: string
          price_display?: string
          pricing_mode?: string
          site_anchor?: string
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          uses_global_vars?: boolean
          volume_tiers?: Json
          whatsapp_custom_message?: string | null
        }
        Update: {
          allow_file?: boolean
          allow_quantity?: boolean
          base_price_cop?: number
          created_at?: string
          description?: string
          gastos_extra_cop?: number
          has_calculator?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          margin_percent?: number
          min_price_cop?: number
          name?: string
          price_display?: string
          pricing_mode?: string
          site_anchor?: string
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          uses_global_vars?: boolean
          volume_tiers?: Json
          whatsapp_custom_message?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          answers: Json
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          design_state: string
          estimated_total_cop: number
          file_name: string | null
          file_path: string | null
          finish: string
          height_cm: number | null
          id: string
          length_cm: number | null
          material: string
          notes: string
          quantity: number
          service_id: string | null
          service_name: string
          size_label: string
          status: string
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          design_state?: string
          estimated_total_cop?: number
          file_name?: string | null
          file_path?: string | null
          finish?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          material?: string
          notes?: string
          quantity?: number
          service_id?: string | null
          service_name?: string
          size_label?: string
          status?: string
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          answers?: Json
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          design_state?: string
          estimated_total_cop?: number
          file_name?: string | null
          file_path?: string | null
          finish?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          material?: string
          notes?: string
          quantity?: number
          service_id?: string | null
          service_name?: string
          size_label?: string
          status?: string
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "quoter_services"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_quotes: {
        Row: {
          created_at: string
          id: string
          items: Json
          total_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          total_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          total_price?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          section: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          section?: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          section?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_services: {
        Row: {
          bullets: Json
          color: string
          created_at: string
          custom_buttons: Json
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          kiara_tip: string
          lead: string
          media_type: string
          quoter_service_id: string | null
          requires_file: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          whatsapp_template: string | null
        }
        Insert: {
          bullets?: Json
          color?: string
          created_at?: string
          custom_buttons?: Json
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          kiara_tip?: string
          lead?: string
          media_type?: string
          quoter_service_id?: string | null
          requires_file?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          whatsapp_template?: string | null
        }
        Update: {
          bullets?: Json
          color?: string
          created_at?: string
          custom_buttons?: Json
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          kiara_tip?: string
          lead?: string
          media_type?: string
          quoter_service_id?: string | null
          requires_file?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          whatsapp_template?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      category_descendants: {
        Args: { _slug: string }
        Returns: {
          id: string
          slug: string
        }[]
      }
      next_working_slot: {
        Args: {
          _days: number[]
          _end_hour: number
          _from: string
          _start_hour: number
          _tz: string
        }
        Returns: string
      }
      verify_cron_secret: { Args: { _secret: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
      order_status:
        | "pendiente"
        | "empacando"
        | "enviado"
        | "entregado"
        | "cancelado"
      payment_method_type:
        | "manual_transfer"
        | "gateway"
        | "gateway_redirect"
        | "cash_on_delivery"
        | "cash_point"
        | "crypto"
      payment_status:
        | "esperando_pago"
        | "comprobante_enviado"
        | "pagado"
        | "rechazado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      order_status: [
        "pendiente",
        "empacando",
        "enviado",
        "entregado",
        "cancelado",
      ],
      payment_method_type: [
        "manual_transfer",
        "gateway",
        "gateway_redirect",
        "cash_on_delivery",
        "cash_point",
        "crypto",
      ],
      payment_status: [
        "esperando_pago",
        "comprobante_enviado",
        "pagado",
        "rechazado",
      ],
    },
  },
} as const
