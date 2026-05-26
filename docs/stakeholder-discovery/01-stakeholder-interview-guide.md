# Stakeholder interview guide

Use this guide in discovery sessions before building features. Adapt sections to each interviewee (business owner, baker/operations, sales, end customer, accountant).

**Product context:** online sales for homemade cakes and custom party/event orders.

**Tech note (for your awareness, not stakeholder decision):** the app will be built with **React** and **TypeScript**; API calls use **`fetch` only** (no axios).

---

## 1. Business context and goals

1. What problem should this application solve that you cannot solve well today (phone, WhatsApp, spreadsheet, paper)?
2. Who are the primary users? (e.g. bakery owner, staff, end customers, both)
3. What does success look like in 6–12 months? (revenue, order volume, fewer errors, less admin time)
4. What is the **minimum** you need on day one (MVP) vs what can wait?
5. How many orders per day/week do you handle today? What peak (holidays, weekends) should the system support?
6. Do you sell only in one city/region or nationwide? Any legal or food-safety rules we must respect in the product?

---

## 2. Catalog and products

7. What do you sell today? (standard cakes, custom cakes, cupcakes, savory items, add-ons, party packages)
8. Do products have **fixed prices** or **quotes per order**?
9. What options must customers choose? (size, flavor, filling, theme, decoration level, dietary: gluten-free, vegan, nut-free)
10. Do you need **photos** per product or per finished order? Who uploads them?
11. Should some items be **hidden** when out of stock or when lead time is too short?
12. Do you offer **seasonal** or **limited-time** products? How should they appear and expire?

---

## 3. Custom and party orders

13. Walk through a typical **party order** from first contact to delivery/pickup.
14. What information is mandatory for a party order? (event date/time, guest count, venue, theme, budget, contact person)
15. Is the flow **quote → customer approval → deposit → production**, or pay upfront?
16. How long before the event must orders be placed? Do you block dates when capacity is full?
17. How do you handle **changes** after the customer confirmed (date, design, quantity)?
18. Do you need **approval workflows** internally before sending a quote to the customer?

---

## 4. Ordering and checkout (customer-facing)

19. Should customers **browse and order without an account**, or is registration required?
20. What payment methods do you need? (PIX, card, cash on pickup, deposit + balance, payment link)
21. Do you require a **deposit**? Fixed amount or percentage? When is the balance due?
22. Pickup, delivery, or both? If delivery: zones, fees, minimum order, delivery windows?
23. Can customers choose **date and time slot** for pickup/delivery? What rules apply (blackout dates, max orders per slot)?
24. Should customers attach **reference images** (Pinterest, theme photos) to an order?
25. Do you need a **cart** for multiple items or mostly one custom order at a time?
26. Order confirmation: email, WhatsApp, SMS, or in-app only?

---

## 5. Operations and production

27. Who manages orders inside the bakery? One person or several roles?
28. What **order statuses** do you use today? (e.g. received, quoted, approved, in production, ready, delivered, cancelled)
29. Do you need a **production calendar** or kitchen queue view?
30. How do you track **capacity** (max cakes per day, per oven, per decorator)?
31. Do you print **labels**, **production sheets**, or **invoices** from the system?
32. How should **cancellations and refunds** work? Who can approve them?

---

## 6. Customer communication

33. How do customers ask questions today? Should the app replace or complement WhatsApp/phone?
34. Which **notifications** are required? (order received, quote ready, payment received, ready for pickup, delayed)
35. Should customers see **real-time order status** in the app?
36. Do you need a simple **FAQ** or **policies** page (allergens, cancellation, lead times)?

---

## 7. Accounts, staff, and permissions

37. Will **staff log in** with different permissions? (admin, sales, kitchen, delivery)
38. What should each role be allowed to do? (edit prices, cancel orders, issue refunds, view financial reports)
39. Do you need an **audit trail** (who changed price, status, or quote)?

---

## 8. Pricing, promotions, and finance

40. Discount codes, loyalty, or birthday promotions needed for MVP?
41. Do you need **tax documents** (NF-e) integration now or later?
42. What **reports** do you need? (sales by period, best sellers, outstanding quotes, unpaid balances)
43. Should the system integrate with an **accounting** or **ERP** tool?

---

## 9. Usability and user experience

44. Who is the least technical user we must support? Describe them.
45. Primary devices: **mobile**, tablet, desktop? Should staff use phones in the kitchen?
46. Language: Portuguese only, or multi-language?
47. Branding: do you have logo, colors, fonts we must follow?
48. Accessibility: any users with vision or motor difficulties we should plan for?
49. What should be doable in **under 2 minutes** for a repeat customer placing a familiar order?
50. What mistakes must the UI **prevent**? (wrong date, order too soon, missing allergy info)
51. On slow internet, what is the minimum that must still work?
52. Show us (or describe) an app or website you like and why.

---

## 10. Non-functional requirements

53. How many **concurrent users** do you expect (customers + staff)?
54. Acceptable downtime? (e.g. can the shop work offline for a few hours if the app is down?)
55. **Data privacy:** what customer data can staff see? retention period? LGPD concerns?
56. **Security:** who can access payment data? PCI handled by payment provider only?
57. **Backup and recovery:** how painful is losing one day of orders?
58. Performance expectations: max wait time for pages and for placing an order?

---

## 11. Integrations and existing tools

59. What tools do you use today? (Instagram, WhatsApp Business, Google Sheets, iFood, marketplaces, email)
60. Must orders from **Instagram/WhatsApp** be entered manually or integrated later?
61. Do you need **Google Maps** or address validation for delivery?
62. Analytics: Google Analytics, Meta Pixel, or internal dashboards only?

---

## 12. Launch, training, and support

63. Who will **test** the app before launch? Can they join a pilot?
64. Do you need **training** or short in-app tutorials for staff?
65. Who provides **first-line support** after launch (you vs developer)?
66. Rollout: big-bang or parallel run with current process for a few weeks?

---

## 13. Prioritization and constraints

67. Rank these for MVP: catalog, custom quotes, online payment, delivery scheduling, staff dashboard, reports, notifications.
68. Hard **deadlines** (event season, holiday)?
69. **Budget** constraints that affect scope or hosting?
70. Anything that is **explicitly out of scope** for version 1?

---

## 14. Open discussion

71. What is your biggest fear if we build the wrong thing?
72. What would make you recommend this system to another bakery?
73. What did we not ask that we should know?

---

## After the interview

- Save filled answers using [02-interview-response-template.md](02-interview-response-template.md) under `responses/`.
- Tag each answer: **MVP** / **Later** / **Out of scope**.
- Log **open questions** and **assumptions** for follow-up.
