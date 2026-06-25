export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const expectedToken = process.env.SYSTEM_API_TOKEN;
  const providedToken = req.headers['x-system-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (expectedToken && providedToken !== expectedToken) return res.status(401).json({ ok: false, error: 'Unauthorized SYSTEM request.' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(501).json({
      ok: false,
      error: 'Supabase sync belum aktif. Pasang SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel.'
    });
  }

  try {
    const { action, playerId, state } = req.body || {};
    const id = String(playerId || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'playerId kosong.' });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'save') {
      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from('arise_player_states').upsert({
        player_id: id,
        state,
        updated_at: updatedAt
      }, { onConflict: 'player_id' });
      if (error) throw error;
      return res.status(200).json({ ok: true, action, playerId: id, updatedAt });
    }

    if (action === 'load') {
      const { data, error } = await supabase
        .from('arise_player_states')
        .select('state, updated_at')
        .eq('player_id', id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ ok: true, action, playerId: id, state: data?.state || null, updatedAt: data?.updated_at || null });
    }

    return res.status(400).json({ ok: false, error: 'Action tidak dikenal.' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Database sync failed.' });
  }
}
