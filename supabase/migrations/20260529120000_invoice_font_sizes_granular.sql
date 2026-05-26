-- Granular print/PDF font sizes (px). Null = auto from body size in the app.
alter table public.business_settings
  add column if not exists invoice_font_size_labels_px integer
    check (invoice_font_size_labels_px is null or (invoice_font_size_labels_px >= 8 and invoice_font_size_labels_px <= 24));

alter table public.business_settings
  add column if not exists invoice_font_size_line_items_heading_px integer
    check (
      invoice_font_size_line_items_heading_px is null
      or (invoice_font_size_line_items_heading_px >= 9 and invoice_font_size_line_items_heading_px <= 28)
    );

alter table public.business_settings
  add column if not exists invoice_font_size_table_px integer
    check (invoice_font_size_table_px is null or (invoice_font_size_table_px >= 7 and invoice_font_size_table_px <= 22));

alter table public.business_settings
  add column if not exists invoice_font_size_customer_name_px integer
    check (
      invoice_font_size_customer_name_px is null
      or (invoice_font_size_customer_name_px >= 10 and invoice_font_size_customer_name_px <= 34)
    );

alter table public.business_settings
  add column if not exists invoice_font_size_business_name_px integer
    check (
      invoice_font_size_business_name_px is null
      or (invoice_font_size_business_name_px >= 9 and invoice_font_size_business_name_px <= 30)
    );

alter table public.business_settings
  add column if not exists invoice_font_size_invoice_number_px integer
    check (
      invoice_font_size_invoice_number_px is null
      or (invoice_font_size_invoice_number_px >= 12 and invoice_font_size_invoice_number_px <= 44)
    );

alter table public.business_settings
  add column if not exists invoice_font_size_disclaimer_px integer
    check (invoice_font_size_disclaimer_px is null or (invoice_font_size_disclaimer_px >= 6 and invoice_font_size_disclaimer_px <= 16));

alter table public.business_settings
  add column if not exists invoice_font_size_grand_total_px integer
    check (
      invoice_font_size_grand_total_px is null
      or (invoice_font_size_grand_total_px >= 12 and invoice_font_size_grand_total_px <= 40)
    );

comment on column public.business_settings.invoice_font_size_labels_px is
  'Printed estimate: uppercase section labels (Bill to, Invoice number, …). Null = auto from body.';

comment on column public.business_settings.invoice_font_size_line_items_heading_px is
  'Printed estimate: “Line items” section title. Null = auto.';

comment on column public.business_settings.invoice_font_size_table_px is
  'Printed estimate: line item table and footer subtotals. Null = auto from body.';

comment on column public.business_settings.invoice_font_size_customer_name_px is
  'Printed estimate: customer name (Bill to). Null = auto from body.';

comment on column public.business_settings.invoice_font_size_business_name_px is
  'Printed estimate: business name under logo. Null = auto from body.';

comment on column public.business_settings.invoice_font_size_invoice_number_px is
  'Printed estimate: large mono estimate / invoice number. Null = auto from body.';

comment on column public.business_settings.invoice_font_size_disclaimer_px is
  'Printed estimate: disclaimer fine print. Null = auto from table size.';

comment on column public.business_settings.invoice_font_size_grand_total_px is
  'Printed estimate: “Total” row emphasis. Null = auto from body.';
