-- Printed invoice: table column header row text and background (optional overrides).
alter table public.business_settings
  add column if not exists invoice_table_header_text_color text,
  add column if not exists invoice_table_header_bg_color text;

comment on column public.business_settings.invoice_table_header_text_color is
  'Printed estimate: table thead text color; null = same as invoice_section_title_color.';
comment on column public.business_settings.invoice_table_header_bg_color is
  'Printed estimate: table thead background; null = light neutral #f5f5f4.';
