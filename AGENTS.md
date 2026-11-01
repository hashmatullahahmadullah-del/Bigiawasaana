# BIGI AWASAANA — LOCAL SEO & BLOG ENGINE INSTRUCTIONS

This repository contains the production code and content engine for **Bigi Awasaana** (https://www.bigiawasaana.com), an authentic, 100% Zabiha Halal Afghan street food and charcoal grill trailer in Reseda, Los Angeles.

---

## 🛑 MANDATORY STEP 0: KEYWORD & TOPIC CANNIBALIZATION AUDIT (NEVER SKIP)
Before writing, planning, or publishing ANY new blog post, you MUST analyze all existing posts to prevent duplicate topics and keyword cannibalization:

1. **Run the Topic Auditor**:
   ```bash
   node scripts/analyze-topics-and-keywords.cjs --title "<Proposed Title>" --keywords "<Target Keywords>"
   ```
2. **If a collision is detected (Exit Code 1)**:
   - **Do NOT publish a duplicate or competing post.**
   - Pivot the search intent: shift from a broad commercial query to a specific local landmark, a specific macro/dietary focus, or culinary food science/history.
   - Alternatively, expand or update the existing post rather than generating a competing URL.

---

## 📍 VERIFIED BUSINESS FACTS (MANDATORY IN EVERY POST)
- **Business Name:** Bigi Awasaana
- **Tagline:** "Born From the Silk Road. Grilled in Los Angeles."
- **Address:** 18411 Victory Blvd, Reseda, CA 91335 (Corner of Reseda Blvd & Victory Blvd, across from Reseda Park)
- **Hours (STRICT):**
  - **Monday to Saturday: 01:00 PM – 10:30 PM**
  - **Sunday: Closed**
  *(NEVER write 12:00 PM, never write 'open every day' or 'open 7 days a week')*
- **Phone:** (323) 921-1646
- **Meat Standard:** 100% hand-slaughtered Zabiha Halal meat (beef, lamb, chicken) — zero machine-cut meat or fillers.

---

## 🎨 LOCKED COVER IMAGE VISUAL STYLE
Every generated cover image must strictly adhere to the unified visual identity:
- **Aspect Ratio:** 16:9 landscape.
- **Style:** Editorial, cinematic close-up food and street-culture photography shot on a 35mm lens with shallow depth of field and subtle 24fps film grain.
- **Lighting & Color:** Matte black background (`#0B0B0B`) with warm neon ember-orange rim lighting (`#FF6A00`), authentic charcoal grill smoke, and natural highlights on glistening charred meat textures and fresh herbs.
- **Strict Prohibitions:** ZERO text, ZERO typography, ZERO watermarks, ZERO logos, ZERO cartoons/3D styles. 100% photorealistic.
- **Storage & CDN:** Upload to Firebase Storage bucket `bigi-awasaana-7b3ce.firebasestorage.app/img/blog/` with a public UUID download token.

---

## 📝 BLOG POST ARCHITECTURE FOR GOOGLE AI OVERVIEWS & SEO
1. **50-Word Direct Answer Hook (Paragraph 1):** Answer the primary search intent directly within the first 50 words so Google AI Overviews pulls Bigi Awasaana as the #1 answer.
2. **Scannable Question Headings:** Format H2 and H3 subheadings as natural conversational search queries people type into Google.
3. **Live Menu Lookup:** Inspect `scratch/live_menu_dump.json` or `scripts/menu-items-data.cjs` for live prices, exact dish names, and dish photo paths.
4. **Internal Links:** Always include clean internal links to `/menu`, `/catering`, `/specials`, and `/locations`.
5. **Structured Schema:** Include a 3–4 question FAQ section with valid JSON-LD `FAQPage` schema markup.
6. **Banned AI Filler:** Never use robotic phrases like *"bustling culinary landscape"*, *"tantalize your taste buds"*, *"nestled in the heart of"*, *"symphony of flavors"*, *"delve"*, *"tapestry"*, or *"look no further"*.

---

## 📱 MANDATORY UI & FRONTEND DESIGN STANDARDS
Whenever designing, building, refactoring, or fixing any section of the website:
1. **Mobile-First & Small Screen Responsive:** Every section MUST look flawless on mobile, specifically smaller mobile screens (no horizontal scroll/overflow, readable font scaling, proper tap targets, clean stacked layouts).
2. **Modern & Flat UI:** Strict modern flat design language. Crisp borders, solid contrasts, clean negative space, and sleek typography.
3. **No Background Shadows:** Absolutely NO `box-shadow`, drop-shadows, or heavy glow/blur filters. Keep cards and containers cleanly bordered or flat-filled.
4. **No Emojis:** Zero emojis anywhere in headings, copy, badges, buttons, or UI components.
5. **No Unnecessary Icons:** Strip out decorative or superfluous icons. Use icons strictly when functional and essential for utility (e.g. close, menu toggle).
