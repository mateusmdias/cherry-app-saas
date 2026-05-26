-- Part 2 of 2: migrate legacy statuses to `order` (runs in a new transaction after part 1).
update public.estimates
set status = 'order'::public.estimate_status
where status in ('in_production'::public.estimate_status, 'ready'::public.estimate_status);

update public.estimate_status_history
set status = 'order'::public.estimate_status
where status in ('in_production'::public.estimate_status, 'ready'::public.estimate_status);

-- Note: enum labels `in_production` and `ready` remain on the type for compatibility;
-- new rows should use only `estimate` or `order`.
