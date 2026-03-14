import { EnginePlay } from '../types/playbook';
import { FIELD_WIDTH_YARDS } from '../config/fieldConfig';
import { getRouteById } from './routeDefinitions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WristbandExportOptions {
  plays: EnginePlay[];
  teamName?: string;
  format: 'wristband-standard';
  colorMode: 'color' | 'blackwhite';
  playsPerCard: 16 | 12 | 8;
}

// ---------------------------------------------------------------------------
// Wristband PDF Generator
// ---------------------------------------------------------------------------

/**
 * Generates a printable wristband card PDF containing play thumbnails.
 * jsPDF is loaded dynamically so it never bloats the main bundle.
 */
export async function exportWristbandPDF(options: WristbandExportOptions): Promise<void> {
  const jspdfModule = await import('jspdf');
  const jsPDF = jspdfModule.default || jspdfModule.jsPDF || (jspdfModule as any);

  const { plays, teamName, colorMode, playsPerCard } = options;

  if (plays.length === 0) return;

  // Wristband card: 4.75" x 2.75" landscape
  const cardWidth = 4.75;
  const cardHeight = 2.75;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [cardHeight, cardWidth], // jsPDF format is [height, width] for landscape
  });

  // Grid layout
  const cols = playsPerCard === 16 ? 4 : playsPerCard === 12 ? 4 : 4;
  const rows = playsPerCard / cols;

  const margin = 0.1;
  const cellWidth = (cardWidth - margin * 2) / cols;
  const cellHeight = (cardHeight - margin * 2 - 0.2) / rows; // 0.2 for header

  // Header
  const textColor = colorMode === 'blackwhite' ? 0 : 30;
  doc.setFontSize(8);
  doc.setTextColor(textColor);
  doc.text(teamName ?? 'Playbook', margin, margin + 0.1);

  const totalPages = Math.ceil(plays.length / playsPerCard);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage([cardHeight, cardWidth], 'landscape');
      doc.setFontSize(8);
      doc.setTextColor(textColor);
      doc.text(teamName ?? 'Playbook', margin, margin + 0.1);
    }

    const pageStart = page * playsPerCard;
    const pagePlays = plays.slice(pageStart, pageStart + playsPerCard);

    for (let i = 0; i < pagePlays.length; i++) {
      const play = pagePlays[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = margin + col * cellWidth;
      const y = margin + 0.2 + row * cellHeight;

      // Cell border
      doc.setDrawColor(textColor);
      doc.setLineWidth(0.005);
      doc.rect(x, y, cellWidth, cellHeight);

      // Play name
      doc.setFontSize(5);
      doc.setTextColor(textColor);
      const displayName = play.name.length > 18 ? play.name.slice(0, 17) + '…' : play.name;
      doc.text(displayName, x + 0.03, y + 0.08);

      // Formation
      doc.setFontSize(4);
      doc.text(play.formation, x + 0.03, y + 0.15);

      // Draw player dots and routes as simple shapes
      const thumbW = cellWidth - 0.06;
      const thumbH = cellHeight - 0.2;
      const thumbX = x + 0.03;
      const thumbY = y + 0.18;

      // Field background
      if (colorMode === 'color') {
        doc.setFillColor(34, 139, 34); // green
        doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(thumbX, thumbY, thumbW, thumbH, 'F');
      }

      // Draw players as small dots
      for (const player of play.players) {
        const px = thumbX + (player.x / FIELD_WIDTH_YARDS) * thumbW;
        const py = thumbY + (player.y / 100) * thumbH; // assuming y in yards 0–100

        if (colorMode === 'color') {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(0, 0, 0);
        }
        doc.circle(px, py, 0.015, 'F');

        // Draw route line if assigned
        if (player.assignedRoute && player.routeWaypoints && player.routeWaypoints.length > 0) {
          if (colorMode === 'color') {
            doc.setDrawColor(255, 70, 70);
          } else {
            doc.setDrawColor(0);
          }
          doc.setLineWidth(0.003);

          let lastX = px;
          let lastY = py;
          for (const wp of player.routeWaypoints) {
            const wpx = lastX + (wp.dx / FIELD_WIDTH_YARDS) * thumbW;
            const wpy = lastY - (wp.dy / 100) * thumbH; // negative because downfield is "up" on card
            doc.line(lastX, lastY, wpx, wpy);
            lastX = wpx;
            lastY = wpy;
          }
        }
      }
    }
  }

  doc.save(`${teamName ?? 'playbook'}-wristband.pdf`);
}
