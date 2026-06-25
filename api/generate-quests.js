export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const expectedToken = process.env.SYSTEM_API_TOKEN;
  const providedToken = req.headers['x-system-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (expectedToken && providedToken !== expectedToken) return res.status(401).json({ error: 'Unauthorized SYSTEM request.' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY belum dipasang di Vercel Environment Variables.' });

    const { profile, system, model = 'gemini-2.5-flash' } = req.body || {};
    if (!profile || !system) return res.status(400).json({ error: 'Missing profile or system data.' });

    const safeModel = String(model).replace(/[^a-zA-Z0-9._-]/g, '') || 'gemini-2.5-flash';
    
    // We explicitly ask Gemini to return JSON using its instruction syntax
    const systemInstruction = `Kamu adalah SYSTEM AI yang bertugas meracik jadwal olahraga harian. Keluarkan hanya JSON valid. Format array objek dengan properti: id (string random 7 karakter), title (string ala militer/Sistem, misal 'Current Order: Push Protocol'), desc (deskripsi eksekusi tegas dan jelas), type (Strength/Cardio/Core/Recovery/dll), value (string angka + satuan target, misal '50 reps' atau '10 min'), proof (string tipe validasi, misal 'Counter / manual'), done (boolean, wajib false). Berikan 5-6 quest bervariasi sesuai data player berikut. Pastikan intensitas realistis namun menantang. Jangan pakai markdown backtick, hanya array JSON mentah.`;
    
    const userPrompt = `DATA PLAYER: 
Goal: ${profile.goal}
Condition: ${profile.condition}
Activity: ${profile.activity}
Focus: ${profile.focus?.join(',') || 'Full Body'}
Equipment: ${profile.equipment?.join(',') || 'None'}
Stats Saat Ini: ${JSON.stringify(system.currentStats || {})}
Kemampuan Maks: Pushup ${profile.ability?.pushup||10}, Squat ${profile.ability?.squat||20}, Situp ${profile.ability?.situp||15}, Plank ${profile.ability?.plank||30}s.
    
Buatkan array JSON jadwal hari ini (5-6 quest) sesuai aturan. Harus ada variasi gerakan.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { 
          temperature: 0.7, 
          topP: 0.9, 
          maxOutputTokens: 1500,
          response_mime_type: "application/json"
        }
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini request failed.' });

    let text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '[]';
    
    try {
      const quests = JSON.parse(text);
      if(!Array.isArray(quests)) throw new Error('Not an array');
      return res.status(200).json({ quests });
    } catch(err) {
      return res.status(502).json({ error: 'AI output was not valid JSON array', raw: text });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected server error.' });
  }
}
