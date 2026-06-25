async function getAdmin() {
  const adminModule = await import('firebase-admin');
  const admin = adminModule.default || adminModule;

  if (!admin.apps || !admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum dipasang di Vercel.');
    }

    let serviceAccount;
    try {
      // Supports normal JSON pasted into Vercel env.
      serviceAccount = JSON.parse(raw);
    } catch (firstError) {
      try {
        // Optional fallback if user stores base64 JSON.
        serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      } catch (secondError) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON tidak valid. Copy seluruh isi file JSON dari { sampai }, atau pakai base64 JSON.');
      }
    }

    // Vercel sometimes stores \n as literal escaped characters; normalize private key.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  return admin;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expectedToken = process.env.SYSTEM_API_TOKEN;
  const providedToken = req.headers['x-system-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (expectedToken && providedToken !== expectedToken) return res.status(401).json({ error: 'Unauthorized SYSTEM request.' });

  try {
    const { token, title = 'SYSTEM ORDER', body = 'Current Order menunggu.' } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing target token. Klik Enable Push dulu sampai token muncul.' });

    const admin = await getAdmin();
    const response = await admin.messaging().send({
      token,
      notification: { title, body },
      data: {
        source: 'ARISE_SYSTEM',
        title,
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
