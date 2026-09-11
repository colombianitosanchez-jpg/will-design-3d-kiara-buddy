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
          shipping_address?: string
          shipping_city?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cop?: number
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
          active: boolean
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          images: Json
          kiara_tip: string
          name: string
          price_cop: number
          short: string
          sku: string | null
          slug: string
          specs: Json
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          images?: Json
          kiara_tip?: string
          name: string
          price_cop?: number
          short?: string
          sku?: string | null
          slug: string
          specs?: Json
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          images?: Json
          kiara_tip?: string
          name?: string
          price_cop?: number
          short?: string
          sku?: string | null
          slug?: string
          specs?: Json
          stock?: number
          updated_at?: string
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
          icon: string
          id: string
          is_active: boolean
          margin_percent: number
          min_price_cop: number
          name: string
          site_anchor: string
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          allow_file?: boolean
          allow_quantity?: boolean
          base_price_cop?: number
          created_at?: string
          description?: string
          gastos_extra_cop?: number
          icon?: string
          id?: string
          is_active?: boolean
          margin_percent?: number
          min_price_cop?: number
          name: string
          site_anchor?: string
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          allow_file?: boolean
          allow_quantity?: boolean
          base_price_cop?: number
          created_at?: string
          description?: string
          gastos_extra_cop?: number
          icon?: string
          id?: string
          is_active?: boolean
          margin_percent?: number
          min_price_cop?: number
          name?: string
          site_anchor?: string
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
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
    }
    Enums: {
      app_role: "admin" | "staff"
      order_status:
        | "pendiente"
        | "empacando"
        | "enviado"
        | "entregado"
        | "cancelado"
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
    },
  },
} as const
