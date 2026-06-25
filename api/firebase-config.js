export default function handler(req, res) {
  const expectedToken = process.env.SYSTEM_API_TOKEN;
  const providedToken = req.headers['x-system-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (expectedToken && providedToken !== expectedToken) return res.status(401).json({ error: 'Unauthorized SYSTEM request.' });

  const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_VAPID_KEY'
  ];

  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({
      error: 'Missing Firebase env: ' + missing.join(', ')
    });
  }

  return res.status(200).json({
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    },
    vapidKey: process.env.FIREBASE_VAPID_KEY
  });
}
