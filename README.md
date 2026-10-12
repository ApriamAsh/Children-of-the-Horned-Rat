# Careerless WFRP d100 — Foundry VTT System

Unofficial homebrew system prototype inspired by the WFRP 2e-style percentile engine and a Dark Heresy 2e-style aptitude-based XP economy.

## Current scope (0.1.0)

- WFRP-style d100 roll-under tests.
- Nine percentile characteristics: WS, BS, S, T, Ag, Int, Per, WP, Fel.
- +5 characteristic advancement stages.
- Basic/advanced-style skill concept with known/trained/experienced/veteran progression.
- Aptitude-based advancement categories.
- XP earned, spent and available.
- Fate, Insanity, Magic, Wounds and armour tracking.
- Character sheet with Overview, Skills, Aptitudes, Talents & Gear and Notes tabs.
- Item types for Talents, Weapons, Armour and Equipment.
- Clickable characteristic and skill tests.

## Design notes

Careers are intentionally absent. Backgrounds are freeform character history and do not define advancement paths. The system is intended as a foundation; combat resolution, hit locations, criticals, weapon qualities, spellcasting, corruption and expanded item automation are planned for subsequent iterations.

## Installation

For development/manual installation, put the `careerless-wfrp` directory into:

`{Foundry User Data}/Data/systems/`

The directory containing `system.json` must be named `careerless-wfrp`.

## Compatibility

Built against Foundry VTT's modern v13/v14 system APIs. Foundry's System Development guidance recommends defining the Actor data model first and registering it against a document subtype; this prototype follows that architecture.
