/**
 * exportUtils.js – Play export utilities (PNG & PDF)
 * - PNG: single play via canvas.toDataURL
 * - PDF: multi-play call sheet via jsPDF
 */

import { renderPlayToDataURL } from './drawUtils';

/**
 * Trigger a browser file download.
 * @param {string} dataURL
 * @param {string} filename
 */
function triggerDownload(dataURL, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Sanitize a play name for use as a filename.
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  return (name || 'Play').replace(/[^a-zA-Z0-9_\-]/g, '_');
}

/**
 * Export the current play as a PNG file.
 * Uses an offscreen canvas to render the full play diagram at 2× resolution.
 *
 * @param {Array} players - Player objects
 * @param {Array} routes - Route objects
 * @param {string} playName - Name for the downloaded file
 * @param {{ width?: number, height?: number }} [options]
 */
export function exportPlayAsPNG(players, routes, playName = 'Play', options = {}) {
  const { width = 800, height = 500 } = options;
  const dataURL = renderPlayToDataURL(players, routes, width, height, 2);
  const filename = `${sanitizeFilename(playName)}.png`;
  triggerDownload(dataURL, filename);
}

/**
 * Export all plays as a landscape PDF call sheet (2×2 grid per page).
 *
 * @param {Array<{ name: string, players: Array, routes: Array }>} plays
 * @returns {Promise<void>}
 */
export async function exportCallSheetPDF(plays) {
  // Dynamic import so jspdf only loads when actually used
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF('landscape', 'in', 'letter'); // 11 × 8.5 in

  const pageWidth = 11;
  const pageHeight = 8.5;
  const margin = 0.4;
  const cols = 2;
  const rows = 2;
  const playsPerPage = cols * rows;

  const cellWidth = (pageWidth - margin * (cols + 1)) / cols;  // ~4.9 in
  const cellHeight = (pageHeight - margin * (rows + 1) - 0.5) / rows; // ~3.5 in
  const labelHeight = 0.25; // space for play name label

  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < plays.length; i++) {
    const posOnPage = i % playsPerPage;

    // New page (except for very first play)
    if (i > 0 && posOnPage === 0) {
      pdf.addPage();
    }

    const col = posOnPage % cols;
    const row = Math.floor(posOnPage / cols);
    const x = margin + col * (cellWidth + margin);
    const y = margin + 0.5 + row * (cellHeight + labelHeight + margin); // 0.5 for header

    // Render play to image
    const imgData = renderPlayToDataURL(
      plays[i].players || [],
      plays[i].routes || [],
      800,
      500,
      2
    );

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', x, y, cellWidth, cellHeight);

    // Play name label below
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    pdf.text(
      plays[i].name || `Play ${i + 1}`,
      x + cellWidth / 2,
      y + cellHeight + 0.15,
      { align: 'center' }
    );

    // Page header (only on first play of each page)
    if (posOnPage === 0) {
      const pageNum = Math.floor(i / playsPerPage) + 1;
      const totalPages = Math.ceil(plays.length / playsPerPage);

      pdf.setFontSize(11);
      pdf.setTextColor(20, 20, 80);
      pdf.text('Coach Core AI — Call Sheet', margin, margin + 0.3);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(today, pageWidth / 2, margin + 0.3, { align: 'center' });
      pdf.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth - margin,
        margin + 0.3,
        { align: 'right' }
      );
    }
  }

  const filename = `Call_Sheet_${today}.pdf`;
  pdf.save(filename);
}
