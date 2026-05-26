-- Optional delivery charge (null = no fee / free delivery)
alter table public.estimates
  add column if not exists delivery_fee numeric(12, 2);

comment on column public.estimates.delivery_fee is
  'Optional delivery charge in addition to line subtotal; null when pickup or free delivery.';
