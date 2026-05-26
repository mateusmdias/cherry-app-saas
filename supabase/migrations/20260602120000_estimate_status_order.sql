-- Part 1 of 2: add enum label only (must commit before using the new value in part 2).
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    join pg_namespace n on t.typnamespace = n.oid
    where n.nspname = 'public'
      and t.typname = 'estimate_status'
      and e.enumlabel = 'order'
  ) then
    alter type public.estimate_status add value 'order';
  end if;
end
$$;
