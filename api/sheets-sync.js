export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const url = process.env.SHEETS_WEBAPP_URL;

    if (!url) {
      return res.status(500).json({
        ok: false,
        error: 'SHEETS_WEBAPP_URL belum dipasang di Vercel Environment Variables.'
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();

    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Apps Script tidak mengembalikan JSON valid.',
        raw: text
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Unknown server error'
    });
  }
}
