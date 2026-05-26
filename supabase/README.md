# Supabase

Apply migrations so the app matches the schema (products, estimates, estimate lines, branding, delivery fee, etc.).

**CLI (local or linked project):**

```bash
supabase db push
```

**Hosted project:** run the SQL from each file in `migrations/` in order in the SQL Editor, or use `supabase link` + `db push`.

If PostgREST reports a missing column, the latest migrations have not been applied to that database yet.

**Estimate → Order enum:** `estimate_status` adds the value `order` in one migration and updates rows in the next (`20260602120000` + `20260602120001`), because Postgres does not allow using a newly added enum label in the same transaction as `ALTER TYPE ... ADD VALUE`.

Migrations also add **`estimates.estimate_number`** (public quote id `CH00101`, …) and a sequence/trigger — required for new estimate flows.

**`estimates.delivery_fee`** — optional delivery charge (`20260522120000_estimate_delivery_fee.sql`).
