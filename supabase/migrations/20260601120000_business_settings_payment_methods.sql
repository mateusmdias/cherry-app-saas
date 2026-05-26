-- Venmo / Zelle instructions shown on estimate detail and printed invoice.
alter table public.business_settings
  add column if not exists payment_venmo_tag text;

alter table public.business_settings
  add column if not exists payment_zelle_tag text;

alter table public.business_settings
  add column if not exists payment_zelle_recipient_name text;

comment on column public.business_settings.payment_venmo_tag is
  'Venmo @handle, link, or short instructions shown on estimates.';

comment on column public.business_settings.payment_zelle_tag is
  'Zelle email or phone shown on estimates.';

comment on column public.business_settings.payment_zelle_recipient_name is
  'Recipient display name for Zelle (e.g. legal name on the account).';
