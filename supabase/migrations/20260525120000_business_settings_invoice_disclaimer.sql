-- Footer text for printed estimates / invoices (editable per business in app branding settings)
alter table public.business_settings
  add column if not exists invoice_disclaimer text;

comment on column public.business_settings.invoice_disclaimer is
  'Shown on estimate detail and printed invoice footers. Plain text; applies to all estimates for this account.';

update public.business_settings
set invoice_disclaimer =
  'This quote is valid for 14 days from the date above. Final pricing, design details, and pickup or delivery times are subject to confirmation. A deposit may be required to place your order.'
where coalesce(trim(invoice_disclaimer), '') = '';
