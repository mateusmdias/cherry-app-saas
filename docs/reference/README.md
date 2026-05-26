# Reference materials

Drop **sample estimates**, **PDFs**, **screenshots**, or other layout references here so they stay in the repo and are easy to point to in chat (e.g. `docs/reference/your-file.png`).

- Prefer **PNG/JPEG** for full-page layouts if PDF tooling is limited.
- Large binaries are fine; keep filenames descriptive (`tatiane-quote-2025-01.png`).
- This folder is for **internal product/design reference**, not customer PII you must not store—use redacted samples when possible.

## Printed estimate layout

The in-app **Print / PDF** estimate matches the branding controls under **Branding → Estimate print template**, including a **full-width wavy footer** under the disclaimer (SVG wave, not a flat bar). Its fill is **`invoice_footer_stripe_color`** (default pink `#f472b6`); change it in Branding as **Bottom stripe (printed invoice)**.

If you have a **reference mock** (PNG/PDF), add it beside this README (e.g. `docs/reference/estimate-footer-wave.png`) so the wave path can be matched to your model.

Typography on the printed invoice is controlled per role in **Branding** (body, labels, table, invoice #, disclaimer, etc.) and stored in `business_settings` columns `invoice_font_size_*`.
