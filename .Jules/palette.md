# Palette's Journal - Critical UX/A11y learnings

## 2025-03-04 - [Clear Recent Searches Option]
**Learning:** Modern search dialogs that retain search history locally for better user persistence must provide users with explicit control and ownership over their stored data. Leaving no visible or functional option to clear search logs compromises privacy expectations and creates UI clutter.
**Action:** When saving user input queries to local history or localStorage, always pair the history display with a clear, accessible action button labeled appropriately (e.g. "Effacer", "Clear") and provided with proper aria-label properties.

## 2025-03-05 - [ARIA Combobox and Chip Focus Retention]
**Learning:** When building search panels with keyboard navigation (ArrowUp/ArrowDown to highlight results), screen-readers will not announce highlighted results without semantic combobox markup (`role="combobox"`, `aria-autocomplete`, `aria-activedescendant` linking to active item `id`). Additionally, selecting recent search chips must always restore focus back to the primary search input to prevent focus loss when the chip container is unmounted or updated.
**Action:** Always implement ARIA Combobox specifications on search bars with dropdown results, and ensure button chips that alter search state restore focus to the input element on click.

## 2025-03-06 - [Granular Local Data Ownership and Custom Accessibility Chips]
**Learning:** While clear-all functions provide general utility, fine-grained user data control requires allowing individual deletion of search history items. Splitting a chip into a text button (for search) and a small, accessible close button (for deletion) must be done without breaking layout, keyboard focus flow, or screen-reader accessibility.
**Action:** Compose dual-action chips using a `div` parent container with `focus-within` border indicators, an inner triggering button, and an icon-only delete button styled with explicit `aria-label` and `title` tags, maintaining focus retention on the main search input upon deletion.
