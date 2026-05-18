---
name: PicSpy
description: AI prompt library and creator economy for generative visuals
colors:
  gallery-periwinkle: "#7986eb"
  studio-violet: "#7c3aed"
  deep-canvas: "#0f0f13"
  panel-smoke: "#1a1a24"
  charcoal-slate: "#222230"
  dim-slate: "#2a2a3d"
  founder-amber: "#d97706"
  success-mint: "#4ade80"
  error-coral: "#ef4444"
  tinted-white: "#f5f3ff"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Outfit, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Plus Jakarta Sans, Outfit, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "oklch(52% 0.28 285)"
    textColor: "{colors.tinted-white}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "oklch(56% 0.28 285)"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.07)"
    textColor: "oklch(88% 0.005 285)"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-ghost-hover:
    backgroundColor: "rgba(255,255,255,0.12)"
  input-default:
    backgroundColor: "{colors.charcoal-slate}"
    textColor: "{colors.tinted-white}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  card-default:
    backgroundColor: "{colors.panel-smoke}"
    rounded: "{rounded.xl}"
    padding: "20px"
  chip-default:
    backgroundColor: "rgba(139,92,246,0.15)"
    textColor: "oklch(75% 0.22 285)"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: PicSpy

## 1. Overview

**Creative North Star: "The Generative Gallery"**

PicSpy is a curated gallery of AI-generated visuals where every surface prioritizes the artwork and its workflow. The interface recedes into dark, tinted surfaces so the content glows. Interactions feel tactile and rewarding: buttons depress with inset shadows, cards lift on hover, and token balances pulse when updated. The system respects that its users are creators working at night in dim rooms, hunting for the exact prompt that unlocks their next piece.

What this system explicitly rejects: Replicate's sterile API-dashboard energy. Shutterstock's legacy stock-site feel. OpenSea's speculative clutter and NFT baggage. Generic SaaS landing pages with hero-metric templates and identical icon-card grids. MidJourney's chaotic Discord UI with no hierarchy. Every screen should feel like walking into a well-lit gallery, not scrolling through a feed.

**Key Characteristics:**
- Dark-first, always. Not dark as fashion; dark as function for creative tools used past midnight.
- Liquid glass as the primary elevation language: purposeful frosted surfaces that earn their blur.
- Accent restraint with moments of committed color on plan cards, AI tool badges, and primary CTAs.
- Image-forward layouts where the generated artwork is the largest element on every surface.
- Token economy always one glance away: balances, tier badges, and earning signals visible without hunting.

## 2. Colors: The Gallery Palette

The palette is dark and hue-tinted, never pure black or pure white. Every neutral carries a trace of violet (hue 285) so surfaces feel cohesive under the brand accent. The new primary accent, Gallery Periwinkle, sits at the cool blue-violet intersection: distinctive from generic "SaaS purple" while retaining the generative, creative energy the brand needs.

### Primary
- **Gallery Periwinkle** (#7986eb / oklch(62% 0.16 270)): The new primary accent. Used on active states, primary CTAs, AI tool badges, and interactive highlights. Cooler and more distinctive than pure violet; reads as creative technology, not corporate SaaS.
- **Studio Violet** (#7c3aed / oklch(52% 0.28 285)): The legacy brand violet. Retained for gradient anchors (brand gradient from Studio Violet to Gallery Periwinkle), subscription-tier accents on Pro plan cards, and high-emphasis CTA buttons where maximum contrast is needed. Never used alone as a flat fill on large surfaces.

### Secondary
- **Founder Amber** (#d97706 / oklch(72% 0.18 65)): Exclusive to the Founder's Plan tier. Badges, slot counters, and the free-token claim button. Warm and distinct from the violet family so it reads as a separate reward channel.

### Tertiary
- **Success Mint** (#4ade80 / oklch(72% 0.2 145)): Confirmations, "Đang dùng" badges, upload success states.
- **Error Coral** (#ef4444 / oklch(62% 0.24 25)): Destructive actions, validation errors, rejected-post states.

### Neutral
- **Deep Canvas** (#0f0f13 / oklch(11% 0.012 285)): The page background. Not #000; hue-tinted toward 285 so it sits in the violet family. All content floats on this.
- **Panel Smoke** (#1a1a24 / oklch(15% 0.01 285)): Cards, panels, bottom navigation background. One step up from Deep Canvas.
- **Charcoal Slate** (#222230 / oklch(19% 0.01 285)): Input fields, secondary card surfaces, elevated containers.
- **Dim Slate** (#2a2a3d / oklch(23% 0.01 285)): Hover states on neutral surfaces, scrollbar tracks, tertiary backgrounds.
- **Tinted White** (#f5f3ff / oklch(97% 0.005 285)): Primary text color. Never pure white; carries a hint of violet warmth.

### Named Rules
**The Tinted Neutral Rule.** No surface uses `#000` or `#fff`. Every neutral is hue-tinted toward 285. This prevents the interface from feeling clinical and keeps the gallery atmosphere cohesive.

**The Restraint with Ceremony Rule.** The base UI is Restrained (accent on less than 10% of any given screen). Plan cards, hero sections, and tier badges are Committed (accent carries 30-60% of the surface). The distinction is intentional: the gallery is quiet, the commerce is vivid.

## 3. Typography

**Display Font:** Bricolage Grotesque (with Outfit fallback)
**Body Font:** Outfit (with system-ui fallback)
**Headline Font:** Plus Jakarta Sans (used on HomePage hero and PricingPage; Outfit elsewhere)

**Character:** The pairing is modern-grotesque meets geometric warmth. Bricolage Grotesque's optical sizing and ink traps give display headlines a generative, almost-algorithmic personality without being cold. Outfit handles everything from body copy to button labels with consistent legibility at small sizes. Plus Jakarta Sans appears on hero surfaces where extra weight and tighter letter-spacing are needed.

### Hierarchy
- **Display** (800, clamp(2.5rem, 6vw, 4.5rem), 1.06): Hero headlines only. PricingPage and HomePage hero. Letter-spacing -0.04em.
- **Headline** (700, 1.5rem, 1.2): Section headings, FAQ titles, modal headings. Letter-spacing -0.02em.
- **Title** (600, 1.125rem, 1.3): Card headings, plan names, panel titles.
- **Body** (400, 0.875rem, 1.6): Paragraph text, descriptions, feature lists. Max line length 65ch.
- **Label** (600, 0.75rem, 1, 0.04em tracking): Uppercase labels on plan tiers, section markers, metadata. Always uppercase with wide tracking.

### Named Rules
**The No Display in Controls Rule.** Display fonts (Bricolage Grotesque) are prohibited in buttons, inputs, chips, navigation items, and data labels. Controls use Outfit exclusively.

## 4. Elevation: The Liquid Glass System

Surfaces are flat at rest. Elevation is expressed through the Liquid Glass treatment: purposeful backdrop-blur with tinted transparency, inset highlight edges, and outer depth shadows. Glass is never decorative; it appears on surfaces that need to read as floating above the content (modals, navigation, CTAs on image backgrounds, pricing cards).

### Liquid Glass Vocabulary
- **Glass Standard** (`background: rgba(255,255,255,0.04); backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.09); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.35)`): The workhorse. Buttons over images, category pills, nav bars, feed filter toggles.
- **Glass Strong** (`background: rgba(32,31,34,0.45); backdrop-filter: blur(40px) saturate(200%); border: 1px solid rgba(255,255,255,0.10); box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.4)`): Modals, pricing cards, overlay panels that need maximum separation from the content behind them.
- **Glass Hover** (`background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 40px rgba(0,0,0,0.45), 0 0 40px rgba(124,58,237,0.08)`): Hover state on any glass surface. The faint violet glow (0.08 opacity) ties the interaction back to the brand accent without being overt.
- **CTA Tactile** (`background: oklch(52% 0.28 285); box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 8px 28px rgba(109,40,217,0.5)`): Primary action buttons. The inset top highlight and bottom darken create a physical "pressable" surface. The outer glow signals importance.

### Named Rules
**The Earned Glass Rule.** Liquid Glass is reserved for surfaces that float over image content or need visual separation from the Deep Canvas. Navigation bars, floating action buttons, and overlay modals earn glass. Standard cards, form containers, and list items do not. A page with glass on every element is a page with glass on nothing.

## 5. Components

### Buttons
Tactile and rewarding. Every button feels like it has physical depth.
- **Shape:** Generously rounded (24px radius for standard, pill/9999px for hero CTAs).
- **Primary:** Studio Violet background (oklch(52% 0.28 285)) with inset gloss highlight (top 1.5px white at 0.28 opacity), inset bottom darken (2px black at 0.22), and outer glow shadow (8px 28px violet at 0.5). Text in Tinted White. Min-height 44px (Apple HIG). Hover brightens to oklch(56%) and scales 1.02.
- **Ghost:** rgba(255,255,255,0.07) background with subtle inset gloss. Border 1px solid rgba(255,255,255,0.11). Text in oklch(88%). Hover brightens background to 0.12.
- **Danger:** Red-600 background, white text. Same inset gloss pattern as Primary.
- **Disabled:** 50% opacity, cursor-not-allowed, pointer-events-none on all variants.
- **Focus:** 2px ring in violet-400, 2px offset, on all variants. Uses `:focus-visible` only.

### Chips / Badges
- **AI Tool Badge:** Each AI tool has a distinct color (Midjourney violet, DALL-E green, Flux yellow, SD blue). Pill-shaped (9999px radius), small (padding 4px 12px), with tinted background at 0.15 opacity and matching text color. Used on feed cards and post detail.
- **Tier Badge:** Subscription tier indicators. Free: slate. Founder: amber. Pro: violet. Ultimate: cyan. Same pill shape, border at 0.22-0.30 opacity.
- **Status Badge:** Approved (mint), Pending (amber), Rejected (coral). Pill, 0.6 opacity background with matching border.

### Cards / Containers
- **Standard Card:** Panel Smoke background, 1px border at rgba(255,255,255,0.05), 24px radius. No shadow at rest. Internal padding 20px.
- **Pricing Card (Standard):** Liquid Glass Standard treatment. 24px radius. Varies per plan: free gets slate orb, founder gets amber orb, pro gets violet orb with glassCardPro treatment (elevated glow), ultimate gets cyan orb.
- **Pricing Card (Pro):** Distinguished by glassCardPro: violet-tinted glass (rgba(109,40,217,0.13)), stronger border (rgba(167,139,250,0.42)), large outer glow (0 0 90px rgba(109,40,217,0.22)). "Most Popular" banner at top. Hover lifts 8px (vs 6px for others).

### Inputs / Fields
- **Default:** Charcoal Slate background (#222230), 1px border rgba(255,255,255,0.10), 16px radius. Placeholder text at rgba(255,255,255,0.40). Min-height 44px.
- **Focus:** 2px ring in Gallery Periwinkle (#7986eb), border becomes transparent. Smooth transition 200ms.
- **Error:** Ring color shifts to Error Coral.
- **Disabled:** 50% opacity.

### Navigation
- **Desktop Header:** Sticky top, Deep Canvas at 80% opacity with backdrop-blur-xl. Height 64px. Logo (gradient brand icon 32x32 rounded-xl) left-aligned. Nav links use ghost button style. Actions right-aligned: token balance chip, upload CTA (primary button), notification bell, avatar (36px circle with 2px brand border).
- **Mobile Bottom Nav:** Fixed bottom, Panel Smoke at 90% opacity with backdrop-blur-xl. Border-top 1px rgba(255,255,255,0.05). 5 items max. Upload button is elevated: 48px rounded-2xl with brand gradient (violet-500 to violet-700), shadow glow. Active indicator: 4px dot in Gallery Periwinkle below icon. Labels at 10px font size.
- **Active state:** Gallery Periwinkle text color on active nav items. Dot indicator uses `layoutId` for animated transitions between items.

### Liquid Glass Button (Signature Component)
The secondary hero CTA. Pill-shaped (9999px), Liquid Glass Standard treatment, text at rgba(255,255,255,0.8). On hover: text brightens to full white, glass background strengthens. Used for "Explore Gallery" and secondary actions over image backgrounds. Transition: all 300ms ease.

## 6. Do's and Don'ts

### Do:
- **Do** tint every neutral surface toward hue 285 (violet). Even backgrounds at 0.5% chroma maintain palette cohesion.
- **Do** use Liquid Glass exclusively on surfaces floating over image content or requiring visual separation. The glass earns its blur.
- **Do** maintain a 44px minimum touch target on all interactive elements. Every button, link, and input respects Apple HIG.
- **Do** use `prefers-reduced-motion` on all Framer Motion animations. Reduce to opacity-only transitions when the media query matches.
- **Do** use OKLCH for all color definitions in inline styles. Tailwind classes for layout; OKLCH for brand-critical color.
- **Do** show the generated image as the largest element on every surface. The artwork is the product; the UI serves it.
- **Do** keep token balances and tier badges visible in the header at all times. Reward is visible; never buried.
- **Do** vary pricing cards per plan (different orb colors, border treatments, glow intensities). Identical card grids are prohibited.

### Don't:
- **Don't** use pure `#000` or `#fff` anywhere. Use Deep Canvas (#0f0f13) and Tinted White (#f5f3ff). (PRODUCT.md: "Dark for focus," not dark for harshness.)
- **Don't** apply gradient-text (`background-clip: text` with gradients) on any new surfaces. The legacy `.hero-gradient-text` in HomePage is retained temporarily; do not propagate it. Use a single solid color for emphasis.
- **Don't** use Liquid Glass on standard cards, list items, or form containers. Glass on every surface nullifies its meaning. (PRODUCT.md: "Craft signals quality" requires restraint.)
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or alerts.
- **Don't** create hero-metric templates (big number, small label, gradient accent). PicSpy shows the work first, not vanity metrics.
- **Don't** create identical card grids with same-sized cards repeating icon + heading + text. Vary by content, plan, or visual weight.
- **Don't** use display fonts (Bricolage Grotesque) in buttons, inputs, chips, or nav items. Controls are Outfit only.
- **Don't** animate CSS layout properties (width, height, top, left). Use transform and opacity exclusively. (Shared design law.)
- **Don't** build anything that resembles Replicate's API dashboard, Shutterstock's stock-site chrome, OpenSea's speculative clutter, or MidJourney's Discord chaos. (PRODUCT.md anti-references.)
- **Don't** use bounce or elastic easing. Ease-out with exponential curves (cubic-bezier(0.22, 1, 0.36, 1) is the project standard).
