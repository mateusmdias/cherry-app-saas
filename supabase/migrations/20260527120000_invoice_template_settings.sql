-- Printable estimate / invoice template (colors, typography, optional background image)
alter table public.business_settings
  add column if not exists invoice_font_size_px integer not null default 14
    check (invoice_font_size_px >= 10 and invoice_font_size_px <= 24);

alter table public.business_settings
  add column if not exists invoice_text_color text default '#1c1917';

alter table public.business_settings
  add column if not exists invoice_muted_text_color text default '#57534e';

alter table public.business_settings
  add column if not exists invoice_background_image_path text;

comment on column public.business_settings.invoice_font_size_px is
  'Base font size (px) for printed estimate body text (10–24).';

comment on column public.business_settings.invoice_text_color is
  'Main body text color on printed estimates (hex).';

comment on column public.business_settings.invoice_muted_text_color is
  'Secondary / label text color on printed estimates (hex).';

comment on column public.business_settings.invoice_background_image_path is
  'Optional branding bucket path for a full-page background on printed estimates.';

update public.business_settings
set
  invoice_text_color = coalesce(nullif(trim(invoice_text_color), ''), '#1c1917'),
  invoice_muted_text_color = coalesce(nullif(trim(invoice_muted_text_color), ''), '#57534e')
where true;
