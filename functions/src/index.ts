// Cloud Function: enrich waitlist metadata on create
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

initializeApp();

export const onWaitlistCreate = onDocumentCreated('waitlist/{id}', async (event) => {
  const id = event.params.id as string;
  const db = getFirestore();

  // Limited metadata available in Firestore triggers; IP/UA not present.
  const data = event.data?.data() || {};

  await db.collection('waitlistMetadata').doc(id).set({
    userId: (event as any).auth?.uid || null,
    source: data.source ?? null,
    batchProcessed: data.batchProcessed ?? null,
    capturedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
});

// CSP Report Handler
export const cspReport = onRequest({
  cors: true,
  region: 'us-central1'
}, async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const db = getFirestore();
    let reportData = req.body;
    
    // Handle Buffer data (from curl)
    if (Buffer.isBuffer(reportData)) {
      reportData = JSON.parse(reportData.toString());
    }
    
    // Validate CSP report structure
    if (!reportData || !reportData['csp-report']) {
      logger.warn('Invalid CSP report received:', { body: req.body });
      res.status(400).send('Invalid CSP report format');
      return;
    }

    const cspReport = reportData['csp-report'];
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer = req.headers['referer'] || 'unknown';

    // Store CSP violation report
    await db.collection('cspViolations').add({
      timestamp: FieldValue.serverTimestamp(),
      clientIP,
      userAgent,
      referer,
      documentUri: cspReport['document-uri'] || 'unknown',
      violatedDirective: cspReport['violated-directive'] || 'unknown',
      effectiveDirective: cspReport['effective-directive'] || 'unknown',
      originalPolicy: cspReport['original-policy'] || 'unknown',
      blockedUri: cspReport['blocked-uri'] || 'unknown',
      sourceFile: cspReport['source-file'] || 'unknown',
      lineNumber: cspReport['line-number'] || 0,
      columnNumber: cspReport['column-number'] || 0,
      statusCode: cspReport['status-code'] || 0,
      report: cspReport
    });

    logger.info('CSP violation reported', {
      violatedDirective: cspReport['violated-directive'],
      blockedUri: cspReport['blocked-uri'],
      documentUri: cspReport['document-uri']
    });

    res.status(204).send(); // No content response

  } catch (error) {
    logger.error('Error processing CSP report:', error);
    res.status(500).send('Internal Server Error');
  }
});

