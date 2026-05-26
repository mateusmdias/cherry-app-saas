-- Bottom accent bar on printed estimates (see Branding → footer stripe color)
alter table public.business_settings
  add column if not exists invoice_footer_stripe_color text default '#f472b6';

comment on column public.business_settings.invoice_footer_stripe_color is
  'Full-width bar at the bottom of the printed estimate / PDF (hex, default pink).';

update public.business_settings
set
  invoice_footer_stripe_color = coalesce(nullif(trim(invoice_footer_stripe_color), ''), '#f472b6')
where invoice_footer_stripe_color is null;
