export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY belum dipasang di Vercel Environment Variables.' });

    const { prompt, model = 'gemini-2.5-flash' } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt.' });

    const safeModel = String(model).replace(/[^a-zA-Z0-9._-]/g, '') || 'gemini-2.5-flash';
    const finalPrompt = `Jawab harus selesai. Jangan markdown. Jangan berhenti di label kosong. Kalau memakai label PLAYER/JUDGEMENT/ORDER, setiap label wajib ada isinya.\n\n${prompt}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        generationConfig: { temperature: 0.55, topP: 0.9, maxOutputTokens: 320 }
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini request failed.' });

    let text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\\n') || '';
    text = text
      .replace(/```[a-zA-Z]*\\n?/g, '')
      .replace(/```/g, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/\[SYSTEM TRANSMISSION\]/gi, '')
      .trim();
    if (text.length > 650) text = text.slice(0, 650).replace(/\s+\S*$/, '') + '...';

    const bad = !text || text.length < 24 || /^\s*PLAYER\s*:?\s*$/i.test(text) || text.split(/\s+/).length < 5;
    if (bad) {
      text = 'PLAYER: Unknown\nJUDGEMENT: AI Core mengembalikan data tidak lengkap. SYSTEM memakai fallback command.\nORDER 1: Buka Current Order.\nORDER 2: Selesaikan satu quest sekarang.\nORDER 3: Catat progress sebelum keluar.';
    }

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected server error.' });
  }
}
