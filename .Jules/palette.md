# Palette's Journal - Critical UX/A11y learnings

## 2025-03-04 - [Clear Recent Searches Option]
**Learning:** Modern search dialogs that retain search history locally for better user persistence must provide users with explicit control and ownership over their stored data. Leaving no visible or functional option to clear search logs compromises privacy expectations and creates UI clutter.
**Action:** When saving user input queries to local history or localStorage, always pair the history display with a clear, accessible action button labeled appropriately (e.g. "Effacer", "Clear") and provided with proper aria-label properties.
