const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const templates = require('./email-templates');

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_PASSWORD;
const canSendEmail = Boolean(gmailUser && gmailPassword);

const transporter = canSendEmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    })
  : null;

const DRIP_COLLECTION = 'waitlist_drip_tasks';

const scheduleConfig = [
  { days: 2, templateId: 'transform' },
  { days: 5, templateId: 'case-study' },
  { days: 10, templateId: 'teaser' },
];

function scheduleDate(daysFromNow) {
  return admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  );
}

async function sendDripEmail(taskDoc) {
  const data = taskDoc.data();
  const { email, name, templateId } = data;
  const template = templates[templateId];

  if (!template) {
    logger.error('Unknown template', { templateId, taskId: taskDoc.id });
    return false;
  }

  if (!canSendEmail || !transporter) {
    logger.warn('Missing email credentials for drip sequence');
    return false;
  }

  const html = template.render({ name });
  const mailOptions = {
    from: `Coach Core AI <${gmailUser}>`,
    to: email,
    subject: template.subject,
    html,
  };

  await transporter.sendMail(mailOptions);
  logger.info('Drip email sent', { taskId: taskDoc.id, templateId });
  return true;
}

exports.scheduleWaitlistDrip = onDocumentCreated('waitlist/{docId}', async event => {
  try {
    const waitlistData = event.data.data();
    const waitlistId = event.params.docId;

    const batch = admin.firestore().batch();
    scheduleConfig.forEach(schedule => {
      const taskRef = admin
        .firestore()
        .collection(DRIP_COLLECTION)
        .doc();

      batch.set(taskRef, {
        email: waitlistData.email,
        name: waitlistData.name || '',
        templateId: schedule.templateId,
        scheduledFor: scheduleDate(schedule.days),
        sent: false,
        waitlistId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    logger.info('Drip tasks scheduled', { waitlistId, tasks: scheduleConfig.length });
  } catch (error) {
    logger.error('Failed to schedule drip tasks', error);
  }
});

exports.processScheduledEmails = onSchedule('0 * * * *', async context => {
  const now = admin.firestore.Timestamp.now();
  const tasksRef = admin.firestore()
    .collection(DRIP_COLLECTION)
    .where('sent', '==', false)
    .where('scheduledFor', '<=', now)
    .limit(50);

  const snapshot = await tasksRef.get();
  if (snapshot.empty) {
    logger.info('No drip tasks ready to send');
    return null;
  }

  logger.info('Processing drip emails', { count: snapshot.size });

  const batch = admin.firestore().batch();

  await Promise.all(
    snapshot.docs.map(async docSnap => {
      const sent = await sendDripEmail(docSnap);
      if (sent) {
        batch.update(docSnap.ref, {
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    })
  );

  await batch.commit();
  return null;
});
