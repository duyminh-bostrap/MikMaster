import { FakeSupabase } from './supabaseSim.ts'

// Máy chủ Supabase GIẢ để chạy thử màn hình đăng nhập không cần Supabase thật:
//   node server/src/sim/supabaseCli.ts            → http://127.0.0.1:54321 (khoá anon: anon-key)
//   MIKMASTER_SUPABASE_URL=http://127.0.0.1:54321 MIKMASTER_SUPABASE_ANON_KEY=anon-key pnpm run server
const sb = new FakeSupabase()
await sb.start(Number(process.env.PORT ?? 54321))
console.log(`Fake Supabase on ${sb.url}  (anon key: ${sb.anonKey}; email confirmation off)`)
