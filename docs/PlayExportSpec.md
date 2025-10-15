# Play Export Specification

## Overview
The play export service produces printable artifacts (PDF/PNG) from Smart Playbook data while preserving metadata for downstream analytics. Exports must render consistently across web and mobile triggers and support version history.

_Assumption:_ Exports are generated via a Node.js Cloud Function using `pdfkit` and `svg2pdf` for canvas rendering.

## Layout Requirements
- **Page Size:** Letter (8.5 in × 11 in), portrait orientation.
- **Margins:** 0.5 in top/bottom, 0.75 in left/right.
- **Header:** Team name, date, play name, formation, author. Use grid layout with team logo (optional) left aligned.
- **Field Diagram:** 2D field using 53⅓ yd wide proportion, offensive direction left-to-right. Show player icons, labels, and color-coded routes (offense blue, defense red, special teams gold). Include motion arrows (dashed) and blocking paths (solid).
- **Notes Section:** Two-column bullet region labelled “Coaching Points” (left) and “Adjustments” (right).
- **Sidebar:** Right side vertical panel (2.5 in width) listing player assignments table (`Position`, `Assignment`, `Primary Read` columns).
- **Footer:** Version number, AI suggestion indicator (“AI Assisted ✅/❌”), confidentiality notice (“Internal use only – do not distribute without authorization”).

### Typography
| Element | Font | Size | Weight |
| --- | --- | --- | --- |
| Header title | Inter | 18pt | SemiBold |
| Subheader text | Inter | 12pt | Medium |
| Body copy | Inter | 11pt | Regular |
| Notes headings | Inter | 12pt | Bold |
| Footer | Inter | 9pt | Medium |

Use vector-safe fonts embedded in PDF to avoid substitution. Provide fallback to system `Arial` when Inter unavailable.

## Metadata Schema
Every export writes a metadata JSON document alongside the PDF in Cloud Storage.

```json
{
  "exportId": "exp_20251011_abcd1234",
  "teamId": "team_456",
  "playId": "play_789",
  "playVersion": "v4",
  "generatedBy": "coach_123",
  "generatedAt": "2025-10-11T15:32:10Z",
  "aiSuggested": true,
  "formation": "Trips Right 44",
  "exportFormat": "pdf",
  "exportDurationMs": 842,
  "fieldHash": "sha256:...",
  "notesCount": 6,
  "assignments": [
    {"position": "QB", "assignment": "3-step drop", "primaryRead": "Slot seam"},
    {"position": "RB", "assignment": "Pass pro left", "primaryRead": null}
  ]
}
```

Store metadata in Firestore collection `play_exports/{exportId}` for auditing and analytics.

## Export Pipeline
```pseudo
function handlePlayExportRequest(playId, format):
  play = loadPlayWithRoutes(playId)
  ensureUserCanExport(play.teamId)
  layout = composeLayout(play)

  if format == "pdf":
    pdfDoc = initPdf({
      pageSize: "LETTER",
      margins: {top:36,right:54,bottom:36,left:54}
    })
    renderHeader(pdfDoc, play)
    renderFieldDiagram(pdfDoc, play.diagramSvg)
    renderNotes(pdfDoc, play.notes)
    renderSidebar(pdfDoc, play.assignments)
    renderFooter(pdfDoc, play.metadata)
    output = pdfDoc.finalize()
  else if format == "png":
    output = renderCanvasToPng(layout)
  else:
    throw InvalidFormatError()

  metadata = buildMetadata(play, format, output.durationMs)
  persistMetadata(metadata)
  uploadToStorage(output.file, metadata.exportId)
  logAnalyticsEvent("play_exported", metadata)
  return buildResponse(metadata)
```

**Dependencies:** `pdfkit`, `canvas`, `@coachcore/design-tokens`, `@coachcore/field-renderer`.

## Acceptance Criteria
- [ ] Export completes within 1.5 seconds for plays with ≤22 players and ≤10 routes on standard hardware.
- [ ] Header, field diagram, notes, sidebar, and footer render without overlap at 100% scale.
- [ ] Color contrast meets WCAG 2.2 AA.
- [ ] Metadata JSON stored and match schema.
- [ ] AI suggestion indicator matches latest play version state.
- [ ] Export accessible via share link with signed URL expiring in 7 days.

## Unit & Integration Test Checklist
- [ ] `renderHeader()` formats team/date/play correctly with timezone adjustments.
- [ ] `renderFieldDiagram()` correctly color-codes routes and includes motion markers.
- [ ] `renderSidebar()` renders table rows for all assignments and handles >11 players by auto-scrolling region.
- [ ] Metadata builder sets `exportDurationMs` and `aiSuggested` accurately.
- [ ] Error thrown for unsupported format.
- [ ] Snapshot test for generated PDF with golden sample (approve route layout within tolerance).
- [ ] Storage upload mock ensures ACL `project-private` set.
- [ ] Analytics event dispatched with correct properties.

## Future Enhancements (Backlog)
- SVG export for third-party playbook imports.
- Localization of header text (e.g., date formats).
- Multi-play batch export pipeline with queue-based throttling.
