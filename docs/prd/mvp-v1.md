# MVP PRD v1 — Cherry (internal bakery operations)

**Owner:** Tatiane Corcini · **Author:** Product discovery · **Status:** Draft from stakeholder interview (2026-05-18)  
**Source:** [../stakeholder-discovery/responses/2026-05-18-tatiane-corcini.md](../stakeholder-discovery/responses/2026-05-18-tatiane-corcini.md)

---

## 1. Problem statement

The owner creates quotes/invoices manually in **Canva**, which is slow and prevents fast follow-up. There is **no centralized customer list**, **no quote history**, and no simple way to see **what each customer ordered and spent**. Sales happen on **WhatsApp and Instagram**; she needs to send professional quotes quickly (PDF) before customers drop off.

---

## 2. Goals


| Goal                                 | Measure                                            |
| ------------------------------------ | -------------------------------------------------- |
| Create a branded estimate in minutes | Time to send quote < 5 min for repeat customer     |
| Never lose quote history             | 100% of quotes stored and searchable               |
| Know customers and spend             | Customer profile shows all orders + lifetime total |
| Run production from one place        | Orders move Estimate → In Production → Ready       |


---

## 3. Users


| User            | Access            | Needs                                          |
| --------------- | ----------------- | ---------------------------------------------- |
| Owner (Tatiane) | Full internal app | Quotes, customers, orders, reports, PDF export |
| End customers   | **None** (v1)     | Receive PDF via WhatsApp/Instagram only        |


---

## 4. Scope

### 4.1 In scope (MVP)

#### Customers

- Create, edit, search customers (name, phone, address, notes)
- Customer detail: list of estimates/orders, **lifetime spend**
- Quick action: **new estimate** from customer profile

#### Products (lightweight catalog)

- Product types: custom decorated cakes, custom birthday candies, Brazilian desserts
- Every product will have variables, add a buttom so she can add as she needs
- Per product: name, **fixed price** OR **quote-only** flag
- Per variable choice (especially size): optional price delta vs base price
- No product photos in v1
- Seasonal flag: **post-MVP** (priority 8 in discovery)

#### Estimates / quotes (invoices)

- Multi-line items on one estimate (party / multiple products)
- **Party / order fields (required when applicable):** guest count, address, delivery vs pickup, description, quantity, party occasion, event date (recommended—confirm with owner)
- **Pricing:** line totals, subtotal, optional discount, total
- **Branding:** logo, business name, colors/fonts (configurable template—replace Canva) | you can add a section where she can configure it herself
- **Statuses:** `Estimate` → `In Production` → `Ready`
- **Payment tracking (manual, no gateway):** accepted, 50% received, balance due/paid; methods noted as Zelle/Venmo
- **Business rule:** block or warn on edits when event is within **10 days**
- Duplicate / copy from previous estimate
- **PDF export** for WhatsApp sharing
- add event date on quote
- She will need report of income

#### Reports

- At minimum (confirm with owner):
  - Sales total by period
  - Open estimates (not yet in production)
  - Revenue by customer (top customers)

#### App shell

- Owner **login** (single tenant for MVP)
- **i18n:** English + Portuguese (BR)
- **Responsive:** iPhone + desktop
- **Stack:** React, TypeScript, `fetch` only ([technical constraints](../technical-constraints.md))

### 4.2 Out of scope (v1)

- Customer portal or accounts
- In-app payments (Zelle/Venmo/Stripe)
- WhatsApp Business API / auto-create client from messages
- Instagram integration
- Stock, lead times, production calendar, capacity
- Staff roles, audit log
- NF-e / tax integrations
- Automated notifications (SMS/email/push)
- Product image gallery
- have costs set tup so she can see her income and profit

### 4.3 Later (prioritized from discovery)

1. WhatsApp integration (new client from message)
2. Seasonal products
3. Rich product customization builder
4. Production calendar + capacity
5. Additional staff users and permissions

---

## 5. User flows (MVP)

### Flow A — New customer, new quote

1. Owner adds customer (phone from WhatsApp).
2. Owner creates estimate, adds line items, fills party fields if needed.
3. Owner generates PDF and sends via WhatsApp.
4. Customer accepts → owner marks accepted + 50% received.
5. Owner sets status **In Production** → **Ready** → records balance paid at pickup/delivery.

### Flow B — Returning customer

1. Owner searches customer.
2. Opens history, duplicates prior estimate, adjusts lines.
3. PDF → WhatsApp.

### Flow C — Reports

1. Owner opens Reports.
2. Views period sales and open estimates.

---

## 6. Acceptance criteria (summary)

### Customers

- CRUD customer with phone and notes
- Customer page lists all estimates and **total spent**

### Estimates

- Create multi-line estimate with fixed and quote-only lines
- Required party fields validated when order type is party/event
- Status transitions: Estimate → In Production → Ready
- Payment flags: accepted, 50% received, balance paid (manual)
- Warning or lock if editing within 10 days of event date
- PDF matches branding settings and is downloadable
- List/filter estimates by status and customer

### Reports

- Sales by date range
- List open estimates
- Per-customer spend ranking

### Non-functional

- UI in EN and PT-BR
- Usable on mobile Safari and desktop Chrome
- Owner authentication required for all routes

---

## 7. Open decisions (owner sign-off)

- Required fields on every estimate vs party-only
- Exact report definitions
- Order volume / hosting sizing
- Logo and brand kit delivery
- Tax line on PDF (yes/no)

---

## 8. Success criteria for MVP launch

Owner can run a full week without Canva: all new quotes from the app, PDFs sent on WhatsApp, customers and history visible, production statuses updated, basic reports viewed.

---

## 9. Next engineering steps

1. ~~Owner sign-off on this PRD~~ — scope accepted for v1
2. Follow [implementation plan](../implementation-plan.md): Phase 0 → Phase 1 (database + auth) → customers → products → estimates → PDF → reports → i18n
3. Resolve remaining open decisions in section 7 during Phase 5–6 (branding assets, income report rules)

