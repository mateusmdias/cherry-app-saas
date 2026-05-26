-- Disclaimer column image removed from product; drop unused column.
alter table public.business_settings
  drop column if exists invoice_disclaimer_image_path;
