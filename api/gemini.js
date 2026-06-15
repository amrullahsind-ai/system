export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY belum dipasang di Vercel Environment Variables.' });

    const { prompt, model = 'gemini-2.5-flash' } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt.' });

    const safeModel = String(model).replace(/[^a-zA-Z0-9._-]/g, '') || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.72, topP: 0.9, maxOutputTokens: 900 }
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini request failed.' });

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\\n') || '';
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected server error.' });
  }
}
