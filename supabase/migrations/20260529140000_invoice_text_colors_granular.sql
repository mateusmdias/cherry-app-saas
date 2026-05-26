-- Per-role print / PDF text colors (hex). Null = use theme default (accent, secondary, body, muted).
alter table public.business_settings
  add column if not exists invoice_label_text_color text;

alter table public.business_settings
  add column if not exists invoice_section_title_color text;

alter table public.business_settings
  add column if not exists invoice_customer_name_color text;

alter table public.business_settings
  add column if not exists invoice_business_name_color text;

alter table public.business_settings
  add column if not exists invoice_invoice_number_color text;

alter table public.business_settings
  add column if not exists invoice_footer_value_color text;

alter table public.business_settings
  add column if not exists invoice_grand_total_label_color text;

alter table public.business_settings
  add column if not exists invoice_grand_total_amount_color text;

alter table public.business_settings
  add column if not exists invoice_disclaimer_text_color text;

alter table public.business_settings
  add column if not exists invoice_product_note_color text;

comment on column public.business_settings.invoice_label_text_color is
  'Printed estimate: uppercase section labels, “Phone:”, subtotal row labels. Null = muted text color.';

comment on column public.business_settings.invoice_section_title_color is
  'Printed estimate: “Line items” title and table header row. Null = secondary color.';

comment on column public.business_settings.invoice_customer_name_color is
  'Printed estimate: Bill-to customer name. Null = body text color.';

comment on column public.business_settings.invoice_business_name_color is
  'Printed estimate: business name under logo. Null = accent (primary) color.';

comment on column public.business_settings.invoice_invoice_number_color is
  'Printed estimate: large mono invoice number. Null = body text color.';

comment on column public.business_settings.invoice_footer_value_color is
  'Printed estimate: currency values in subtotal / discount / delivery rows. Null = body text color.';

comment on column public.business_settings.invoice_grand_total_label_color is
  'Printed estimate: “Total” label on final row. Null = secondary color.';

comment on column public.business_settings.invoice_grand_total_amount_color is
  'Printed estimate: final total amount. Null = accent (primary) color.';

comment on column public.business_settings.invoice_disclaimer_text_color is
  'Printed estimate: disclaimer paragraph. Null = muted text color.';

comment on column public.business_settings.invoice_product_note_color is
  'Printed estimate: product notes under a line item. Null = muted text color.';
