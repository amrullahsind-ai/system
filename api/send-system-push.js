async function getAdmin() {
  const admin = await import('firebase-admin');
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum dipasang di Vercel.');
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, title = 'SYSTEM ORDER', body = 'Current Order menunggu.' } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing target token.' });

    const admin = await getAdmin();
    const response = await admin.messaging().send({
      token,
      notification: { title, body },
      data: {
        source: 'ARISE_SYSTEM',
        body
      },
      webpush: {
        notification: {
          icon: '/icon.svg',
          badge: '/icon.svg',
          requireInteraction: true
        },
        fcmOptions: { link: '/' }
      }
    });

    return res.status(200).json({ ok: true, response });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to send push.' });
  }
}
