-- Servings text on options and snapshot on estimate lines are no longer used.
alter table public.product_options
  drop column if exists approx_servings;

alter table public.estimate_lines
  drop column if exists servings_display;
