---
no-new-exports:
  - app-shell/AppFooter.astro
  - app-shell/AppHeader.astro
  - app-shell/FooterMechanism.astro
  - canvas-frame/CanvasFrame.astro
  - canvas-frame/CanvasSettingsPopup.astro
  - controls/Chevron.astro
  - controls/Icon.astro
  - controls/IconButton.astro
  - form/FormField.astro
  - form/FormFieldRow.astro
  - form/InputWithUnit.astro
  - popup/PopupBox.astro
  - popup/TriggerButton.astro
  - profile-bar/ProfileBar.astro
  - result-grid/ResultGrid.astro
  - result-grid/ResultSide.astro
  - side-panel/EwarField.astro
  - side-panel/LauncherPanel.astro
  - side-panel/PanelHeading.astro
  - side-panel/PropulsionGroup.astro
  - side-panel/ShipPanel.astro
  - side-panel/SkillsField.astro
  - side-panel/TurretPanel.astro
  - side-panel/WeaponKindSwitch.astro
---

# components

Astro components for static markup. Each subdirectory groups components by UI region. Components receive pure data props from `src/pages/index.astro` or parent components; element IDs are declared in `src/ui/controls/elementContract.ts`. i18n uses `data-i18n*` attributes resolved by the i18n controller at runtime. No client-side scripts run inside `.astro` files; all dynamic behavior is owned by controllers under `src/ui/controls/`.
