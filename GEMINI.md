# GEMINI.md - PROTEIN FOOD CONSTITUTION (AXONID V6.0 - RULES 2610)

## 1. Project Overview & Identity
- **Project Name:** AX_PROTEIN_FOOD (بروتين فود)
- **Application Title:** بروتين فود - لتجهيز وحفظ اللحوم المجمدة
- **Domain:** Cold Chain Logistics, Meat Processing & Disassembly, Refrigerated Warehouses, Van Sales & Cash Drawer
- **Architecture:** Hybrid Standalone PWA (React 18 + Vite 6 + Tailwind CSS + IndexedDB + Supabase)
- **Primary Brand Colors:** Meat Red (`#991b1b`), Dark Burgundy Container (`#450a0a`), Crimson Red Accent (`#b91c1c`), Canvas Surface (`#f8fafc`).
- **Typography:** Cairo & Tajawal, JetBrains Mono.
- **Watermark:** `site-bg-watermark.png` applied fixed in background.
- **Production Domain:** https://protein-food.axsonid.com
- **Supabase Reference:** `gwxumpjezcwxhpuicwfi`
- **ImageKit Endpoint:** `https://ik.imagekit.io/c8zctprqq`

## 2. Mandatory Rules (AX_RULES_2610 & AX_DESIGN_ANTI_PATTERNS)
- **Zero Marketing Fluff:** Dry technical Arabic only. Extreme brevity. No jargon. No descriptive `<p>` subtitles.
- **Zero Empty Side Gutters:** Desktop layout MUST utilize full canvas (`w-full px-3 sm:px-6 lg:px-8`), avoid `max-w-7xl` centered containers.
- **Standard Navigation (H&A / Gezert Alarab Pattern):** Docked `AX_Sidebar` (w-64 / w-[72px]) on desktop + `AX_MobileNavbar` bottom pill on mobile. Never put tab rows in the center.
- **Blacklist Enforcement:** Strictly adhere to all 25 anti-patterns documented in `AX_DESIGN_ANTI_PATTERNS.md`.
- **WhatsApp & Social Link Previews:** Mandatory absolute HTTPS OG image (`https://<domain>/og-image.png`), 1200x630 branded card < 300KB, concise non-fluffy title & description.
- **Master Domain Dashboard:** Mandatory rich SVG charts via `ax_dashboard_charts_craft` whenever a dashboard exists (Single-line metrics, fast timeframe pills, 6 domain SVG charts).
- **System Users & Permissions:** Mandatory implementation of `ax_system_users_permissions_craft` (Granular permissions matrix, role presets, invite links, zero HR mixing).
- **Custom Dropdowns & Calendar:** `AX_CompanyDatePicker` mandatory. No native browser date or select elements. Custom pill dropdowns with soft borders.
- **PWA & Auto-Update:** Quad-Lock cache buster with `version.json` isolated from precache (`NetworkOnly`), monitored via `AppUpdateNotifier`.
- **Offline & Online:** Native IndexedDB (`ax_frozen_foods_db`) with `offline_queue` and automatic background sync on reconnect.
- **Loading & Modals:** No spinners (1:1 pulsing `AX_SkeletonLoader`). No `window.confirm` (`AX_ConfirmModal` only).

## 3. Security & Hard Architecture
- Zero secrets in frontend. All sensitive actions via Supabase Edge Functions.
- Mandatory RLS on 100% of tables with least privilege.
- Mandatory `ax_activity_logs` triggers.
- Hard limit of 500 lines per file.
