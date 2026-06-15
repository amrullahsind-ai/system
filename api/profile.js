// Optional database endpoint for future sync.
// Personal version runs fully with localStorage.
// To enable cloud sync later, use Supabase and db/schema.sql.

export default async function handler(req, res) {
  return res.status(501).json({
    message: 'Database sync belum diaktifkan. Pakai Supabase schema di /db/schema.sql untuk versi multi-user.'
  });
}
