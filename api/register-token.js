export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, player } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token.' });

  // Optional Supabase token storage.
  // If SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not set, we still return OK for personal use.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({
      ok: true,
      stored: false,
      message: 'Token accepted locally. Supabase env not set, so server storage skipped.',
      player
    });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.from('device_tokens').upsert({
      token,
      player_name: player?.name || null,
      player_rank: player?.rank || null,
      player_goal: player?.goal || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'token' });
    if (error) throw error;
    return res.status(200).json({ ok: true, stored: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to store token.' });
  }
}
