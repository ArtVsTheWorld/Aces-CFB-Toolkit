# Editing UI text and defaults

Most basic wording can be changed without touching the save-editing algorithms.

- `src/shared/toolRegistry.js`: tool names, sidebar names, versions, icons, and short descriptions.
- `src/renderer/renderer.js`: page headings, option labels, helper text, Help content, and HTML control defaults (`value`, `checked`, and selected options).
- `src/renderer/index.html`: the window shell, brand, navigation utilities, and Active Dynasty header.
- `src/shared/localization.js`: user-facing position names.
- `package.json`: application version, package name, executable metadata, and bundled resources.

When changing a default, update both the rendered control and the matching backend normalizer fallback so API callers and the GUI agree. Backend option parsing lives beside each tool under `src/main/tools/`. Run `npm test` after changes; several tests intentionally protect important labels and defaults.

Do not edit files under `test/legacy-reference/` to change app behavior. They are frozen parity references.
