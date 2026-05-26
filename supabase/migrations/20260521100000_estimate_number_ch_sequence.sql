-- Public estimate numbers: CH + 5 digits, first value CH00101 (numeric 101).

alter table public.estimates
  add column if not exists estimate_number text;

-- Existing rows: stable order by created_at
with ordered as (
  select
    id,
    row_number() over (order by created_at asc) as rn
  from public.estimates
  where coalesce(trim(estimate_number), '') = ''
)
update public.estimates e
set estimate_number = 'CH' || lpad((o.rn + 100)::text, 5, '0')
from ordered o
where e.id = o.id;

create sequence if not exists public.estimate_ch_number_seq
  as integer
  start with 101
  minvalue 101
  increment by 1;

select setval(
  'public.estimate_ch_number_seq',
  greatest(
    100,
    coalesce(
      (
        select max(substring(estimate_number from 3)::integer)
        from public.estimates
        where estimate_number ~ '^CH[0-9]{5}$'
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
    new.estimate_number := 'CH' || lpad(nextval('public.estimate_ch_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists estimates_assign_number_trg on public.estimates;
create trigger estimates_assign_number_trg
  before insert on public.estimates
  for each row
  execute function public.estimates_assign_number();

alter table public.estimates
  alter column estimate_number set not null;

create unique index if not exists estimates_estimate_number_uq
  on public.estimates (estimate_number);

comment on column public.estimates.estimate_number is
  'Sequential public quote number: CH + 5 digits starting at CH00101.';
