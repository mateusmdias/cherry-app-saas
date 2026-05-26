export type PricingType = 'fixed' | 'quote_only'
export type EstimateStatus = 'estimate' | 'order'
export type FulfillmentType = 'delivery' | 'pickup'

export type Profile = {
  id: string
  display_name: string | null
  locale: 'en' | 'pt-BR'
  created_at: string
  updated_at: string
}

export type BusinessSettings = {
  id: string
  user_id: string
  business_name: string | null
  logo_path: string | null
  /** Default takeout address; prefill for pickup estimates (overridable per quote). */
  pickup_address_default: string | null
  /** Shown on estimate screen and printed invoice footer for all estimates. */
  invoice_disclaimer: string | null
  /** Base body font size (px) on printed estimates; 10–24. */
  invoice_font_size_px: number
  /** Section labels (uppercase); null = auto from body. */
  invoice_font_size_labels_px: number | null
  /** Invoice table heading row size (px); null = auto. */
  invoice_font_size_line_items_heading_px: number | null
  /** Table + footer subtotals; null = auto from body. */
  invoice_font_size_table_px: number | null
  /** Bill-to customer name; null = auto from body. */
  invoice_font_size_customer_name_px: number | null
  /** Business name under logo; null = auto from body. */
  invoice_font_size_business_name_px: number | null
  /** Large mono invoice #; null = auto from body. */
  invoice_font_size_invoice_number_px: number | null
  /** Disclaimer fine print; null = auto from table size. */
  invoice_font_size_disclaimer_px: number | null
  /** Grand total row; null = auto from body. */
  invoice_font_size_grand_total_px: number | null
  /** Main body text color (hex) on printed estimates. */
  invoice_text_color: string | null
  /** Label / muted text color (hex) on printed estimates. */
  invoice_muted_text_color: string | null
  /** Optional `branding` bucket path for invoice background image. */
  invoice_background_image_path: string | null
  /** Bottom accent bar on printed estimate / PDF (hex). */
  invoice_footer_stripe_color: string | null
  /** Printed estimate: section captions, “Phone:”, subtotal labels; null = muted. */
  invoice_label_text_color: string | null
  /** Printed estimate: section headings (Bill to, Fulfillment, …); null = secondary. */
  invoice_section_title_color: string | null
  /** Printed estimate: table thead text; null = section title color. */
  invoice_table_header_text_color: string | null
  /** Printed estimate: table thead background; null = #f5f5f4. */
  invoice_table_header_bg_color: string | null
  invoice_customer_name_color: string | null
  invoice_business_name_color: string | null
  invoice_invoice_number_color: string | null
  invoice_footer_value_color: string | null
  invoice_grand_total_label_color: string | null
  invoice_grand_total_amount_color: string | null
  invoice_disclaimer_text_color: string | null
  invoice_product_note_color: string | null
  /** Venmo @handle, link, or instructions on estimates. */
  payment_venmo_tag: string | null
  /** Zelle email or phone on estimates. */
  payment_zelle_tag: string | null
  /** Display name for Zelle recipient (e.g. name on bank account). */
  payment_zelle_recipient_name: string | null
  primary_color: string | null
  secondary_color: string | null
  currency: string
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type EstimateSummary = {
  id: string
  user_id: string
  customer_id: string
  estimate_number?: string
  status: EstimateStatus
  event_date: string
  guest_count?: number | null
  party_occasion?: string | null
  fulfillment_type?: FulfillmentType | null
  delivery_address?: string | null
  /** Takeout / pickup location when fulfillment is pickup. */
  pickup_address?: string | null
  delivery_fee?: string | number | null
  subtotal?: string | number
  discount?: string | number
  total: string | number
  balance_paid: boolean
  created_at: string
}

export type Product = {
  id: string
  user_id: string
  name: string
  notes?: string | null
  pricing_type: PricingType
  base_price: string | number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type ProductOptionGroup = {
  id: string
  user_id: string
  product_id: string
  label: string
  sort_order: number
  created_at: string
}

export type ProductOption = {
  id: string
  user_id: string
  group_id: string
  label: string
  price_delta: string | number | null
  sort_order: number
  created_at: string
}

/** One line on an estimate / quote. */
export type EstimateLine = {
  id: string
  user_id: string
  estimate_id: string
  product_id: string | null
  description: string
  quantity: string | number
  unit_price: string | number
  line_total: string | number
  selected_options: unknown
  sort_order: number
  created_at: string
}

export type ProductOptionGroupWithOptions = ProductOptionGroup & {
  product_options: ProductOption[] | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      business_settings: {
        Row: BusinessSettings
        Insert: Partial<BusinessSettings> & { user_id: string }
        Update: Partial<BusinessSettings>
        Relationships: []
      }
      customers: {
        Row: Customer
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: EstimateSummary
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      products: {
        Row: Product
        Insert: {
          id?: string
          user_id: string
          name: string
          notes?: string | null
          pricing_type: PricingType
          base_price?: string | number | null
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          name?: string
          notes?: string | null
          pricing_type?: PricingType
          base_price?: string | number | null
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      product_option_groups: {
        Row: ProductOptionGroup
        Insert: {
          id?: string
          user_id: string
          product_id: string
          label: string
          sort_order?: number
        }
        Update: {
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_options: {
        Row: ProductOption
        Insert: {
          id?: string
          user_id: string
          group_id: string
          label: string
          price_delta?: string | number | null
          sort_order?: number
        }
        Update: {
          label?: string
          price_delta?: string | number | null
          sort_order?: number
        }
        Relationships: []
      }
      estimate_lines: {
        Row: EstimateLine
        Insert: {
          id?: string
          user_id: string
          estimate_id: string
          product_id?: string | null
          description: string
          quantity?: string | number
          unit_price?: string | number
          line_total?: string | number
          selected_options?: unknown
          sort_order?: number
        }
        Update: {
          product_id?: string | null
          description?: string
          quantity?: string | number
          unit_price?: string | number
          line_total?: string | number
          selected_options?: unknown
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      pricing_type: PricingType
      estimate_status: EstimateStatus
      fulfillment_type: FulfillmentType
    }
  }
}
