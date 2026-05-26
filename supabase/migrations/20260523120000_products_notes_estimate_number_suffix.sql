-- Free-form product description for quotes (separate from short product name)
alter table public.products
  add column if not exists notes text;

comment on column public.products.notes is
  'Owner-written description; can be shown on estimates with this product.';

-- Estimate public number: CH + 5 digits + '-' + 2-digit year from event_date (e.g. CH00101-26)
update public.estimates e
set estimate_number = e.estimate_number || '-' || to_char(e.event_date, 'YY')
where e.estimate_number is not null
  and e.estimate_number ~ '^CH[0-9]{5}$';

select setval(
  'public.estimate_ch_number_seq',
  greatest(
    100,
    coalesce(
      (
        select max(substring(estimate_number from '^CH([0-9]{5})')::integer)
        from public.estimates
        where estimate_number ~ '^CH[0-9]{5}-[0-9]{2}$'
      ),
      100
    )
  ),
  true
);

create or replace function public.estimates_assign_number()
returns trigger
language plpgsql
as $$
begin
  if new.estimate_number is null or trim(new.estimate_number) = '' then
    new.estimate_number :=
      'CH'
      || lpad(nextval('public.estimate_ch_number_seq')::text, 5, '0')
      || '-'
      || to_char(new.event_date, 'YY');
  end if;
  return new;
end;
$$;

comment on column public.estimates.estimate_number is
  'Sequential quote id: CH + 5 digits + hyphen + 2-digit event year (e.g. CH00101-26).';
