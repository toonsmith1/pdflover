# PDF Lover tool UX guidance

Use the **Add Text** tool as the interaction model for document tools that need
review or placement:

- Keep one route per tool and use explicit stages: select, edit/configure,
  process, and result preview.
- After a file is selected, show a real document preview before processing.
- Give the editor a focused workspace that can expand to the available screen,
  with a visible toolbar and controls close to the preview.
- Keep the main action, undo/back action, and current settings visible without
  forcing the user to scroll away from the document.
- Make controls usable on narrow screens; collapse secondary controls only
  after the primary editing actions remain obvious.
- Do not process immediately after upload when the user needs to choose,
  position, crop, reorder, or inspect content.
- After processing, show a result preview before offering download.
- Reuse the warm neutral visual style and Thai/English/Japanese labels.
- Preserve user work when moving between stages and release object URLs when
  a preview is replaced or reset.

When improving another tool, first bring its layout to this staged,
full-workspace model, then add tool-specific controls. Avoid copying the text
editor's implementation details when a shared component would be clearer.

All tool routes now receive the workspace shell. Tools with a document editor
should fill it with a focused canvas and toolbar; simpler tools can use the
same space for their preview and settings without inventing a new page shell.
