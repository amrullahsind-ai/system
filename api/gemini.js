export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(200).json({ text: fallback(req.body) });

    const body = req.body || {};
    const model = body.model || body?.player?.model || 'gemini-2.5-flash';
    const prompt = `
Kamu adalah SYSTEM fitness bergaya status-window RPG gelap, otoriter, dan intimidatif.
Jangan sebut kamu AI. Jangan menyebut error, API, Gemini, quota, fallback, server, atau teknis.
Bahasa Indonesia.
Boleh panjang dan lengkap. Jangan potong kalimat di tengah.
Format:
PLAYER:
JUDGEMENT:
CURRENT ORDER:
REWARD / PENALTY:
SYSTEM NOTE:

DATA:
${JSON.stringify(body, null, 2)}
`;

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.72, maxOutputTokens: 4096 }
      })
    });
    if (!r.ok) return res.status(200).json({ text: fallback(body) });
    const data = await r.json();
    let text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim() || '';
    if (text.length < 30) text = fallback(body);
    if (text.length > 9000) text = text.slice(0, 9000).replace(/\s+\S*$/, '') + '...';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(200).json({ text: fallback(req.body || {}) });
  }
}
function fallback(body={}){
  const name = body?.profile?.name || 'Unknown';
  const level = body?.player?.level || 1;
  const rank = body?.player?.rank || 'E';
  return `PLAYER:
${name}

JUDGEMENT:
SYSTEM membaca status player. Rank ${rank}. Level ${level}. Tidak ada kerusakan sistem. Tidak ada alasan. Hanya data yang belum cukup kuat.

CURRENT ORDER:
Selesaikan satu quest fisik sekarang. Catat progress. Simpan proof. Jangan kembali ke layar ini tanpa bukti.

REWARD / PENALTY:
Quest clear akan memberi EXP dan pertumbuhan stat. Completion di bawah 60% akan membuka Penalty Zone.

SYSTEM NOTE:
Kamu tidak sedang menunggu motivasi. Kamu sedang menunda eksekusi. Bergerak.`;
}
