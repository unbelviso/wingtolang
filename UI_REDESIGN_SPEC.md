# Wingto Language UI Redesign Specification

## Design direction

The interface will feel like a small, calm tool used in a forest village: warm ivory ground, sage-green structure, muted sky and peach accents, rounded paper-like cards, and restrained botanical ornaments. The design will remain original and will not reproduce any character, logo, or imagery from a specific game.

## Visual system

| Role | Token | Use |
|---|---|---|
| Page ground | `#FBF6EA` | Warm ivory background with a very subtle radial wash |
| Primary sage | `#6F9273` | Focus rings, headings, selected background swatches |
| Moss text | `#3D5644` | High-contrast main text |
| Peach CTA | `#EF9C83` | Convert button and warm interactive emphasis |
| Soft sky | `#DCEDEF` | Download button, secondary cards, gentle contrast |
| Butter | `#F6DF9B` | Small decorative accents |

## Layout

The page uses a single mobile-first tool column. The title and its botanical decoration introduce the tool; input, conversion, settings, result, download, and help are arranged in the same task order. The result card is the visual center, while the guide remains available below as a progressive-disclosure section.

## Functional UX changes

The text input receives a character count and a clear focus state. Convert uses a short loading state that prevents duplicate clicks without changing the conversion pipeline. Settings keep existing background, tint, and stroke controls, but add labels, selected-state checks, and better tooltips. PNG download retains canvas export and adds temporary completion feedback. A four-step use guide explains the existing input-to-download flow.

## Motion and accessibility

Interactive motion is limited to transform and opacity, remains under 200ms, and is disabled for reduced-motion preferences. Buttons retain visible keyboard focus, color options expose names via labels, and selection state is conveyed through more than color alone.
