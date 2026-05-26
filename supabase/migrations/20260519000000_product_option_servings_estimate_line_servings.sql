-- Approximate servings per product option (e.g. per cake size), owner-editable for quotes
alter table public.product_options
  add column if not exists approx_servings text;

comment on column public.product_options.approx_servings is
  'Optional text shown on estimates (e.g. "12–16 servings") when this option is selected on a line.';

-- Snapshot on estimate line so quotes do not change if catalog is edited later
alter table public.estimate_lines
  add column if not exists servings_display text;

comment on column public.estimate_lines.servings_display is
  'Copy of servings text at line save time, derived from selected product options.';
