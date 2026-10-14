# Coach Core visual milestone

Approved source: Coach Drew's supplied concept board, used as visual direction only. Raster artwork cannot establish its original font files or layout measurements; the following are exact implementation tokens derived from its appearance, not a claim to recover source design metadata.

- Canvas #071019; inset #0B1622; panel #101F2D; raised #172A3B.
- Text #F4F8FC; secondary #B8C8D8; muted #96ABBE.
- Accent #00D4F4; accent hover #65E9FC; accent ink #031219.
- Border #324B60; focus #88EDFF; success #70E2B7; warning #FFD18A.
- System typography: Segoe UI, Inter if already installed, Arial, sans-serif. No remote fonts or paid assets. Body 16px/1.5; metadata 13px/1.5; heading 28–40px/1.1; logo bold with tight tracking.
- Spacing 4, 8, 12, 16, 24, 32, 48px; radii 6, 10, 16px; border 1px. Minimum target 44px. Focus 3px with 3px offset.
- Cyan reserved for selection, primary action and small brand accents; restrained 16px cyan glow at low alpha. No decorative photographic backdrop behind reading text.
- 320–639px: Today first, stacked panels, four-item bottom navigation. 640–1023px: compact sidebar, two-column support cards. 1024px+: full sidebar and calendar with companion Today column.
- Calendar changes to a day list below 768px. No hidden horizontal page overflow fix; layouts must fit. Reduced motion removes transitions and smooth scrolling.

Working navigation: My Week (Overview), Teams, Practice Plans, Smart Playbook. Planned features are static, separately labeled text. Authentication, editor saving, conflict recovery and team scope remain existing implementations.

No schedule/assignment backend exists. Authorized saved practice plans with valid dates may appear as untimed plans. Assignments use honest unavailable states. Sample preview is explicit, ephemeral, local-only and never written to cloud or device persistence. A standalone localhost preview bundles only pure visual components, without auth or Firebase.
