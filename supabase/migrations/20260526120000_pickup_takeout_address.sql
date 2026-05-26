-- Default takeout / pickup location (editable in Branding); used to prefill new estimates.
alter table public.business_settings
  add column if not exists pickup_address_default text;

comment on column public.business_settings.pickup_address_default is
  'Default takeout address for pickup orders; staff can override on each estimate.';

update public.business_settings
set pickup_address_default = 'Cherry Bakehouse'
where coalesce(trim(pickup_address_default), '') = '';

-- Where to pick up when fulfillment is pickup / takeout.
alter table public.estimates
  add column if not exists pickup_address text;

comment on column public.estimates.pickup_address is
  'Takeout / pickup location for this quote when fulfillment_type is pickup.';
