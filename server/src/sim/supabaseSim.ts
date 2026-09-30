import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

const DAY = 86_400_000

/** Máy chủ Supabase giả: cùng logic với supabase/schema.sql (mỗi tài khoản một lần dùng thử, mỗi máy một lần). */
export class FakeSupabase {
  server = http.createServer((req, res) => this.handle(req, res))
  url = ''
  port = 0
  anonKey = 'anon-key'
  now = Date.now()
  requireConfirm = false
  down = false
  users = new Map<string, { id: string; password: string; confirmed: boolean }>()
  trials: { machine: string; user: string; startedAt: number }[] = []
  paid = new Map<string, number>() // user id → paid_until
  perpetual = new Map<string, number>() // user id → updates_until (dùng vĩnh viễn, cập nhật đến ngày đó)
  tokens = new Map<string, string>() // access / refresh token → user id
  requests: string[] = []

  async start(port = 0) { await new Promise<void>(r => this.server.listen(port, '127.0.0.1', r)); this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}` }
  async stop() { await new Promise(r => this.server.close(r)) }

  private tokensFor(id: string) {
    const a = `at-${crypto.randomUUID()}`, r = `rt-${crypto.randomUUID()}`
    this.tokens.set(a, id); this.tokens.set(r, id)
    return { access_token: a, refresh_token: r, expires_in: 3600 }
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      const send = (status: number, obj: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj))
      if (this.down) return void res.destroy()
      const u = new URL(req.url ?? '/', 'http://x')
      this.requests.push(`${req.method} ${u.pathname}${u.search}`)
      if (req.headers.apikey !== this.anonKey) return send(401, { message: 'No API key found' })
      const j = body ? JSON.parse(body) as Record<string, string> : {}
      if (u.pathname === '/auth/v1/signup') {
        if (this.users.has(j.email!)) return send(200, { user: { id: 'x', email: j.email, identities: [] } })
        const id = crypto.randomUUID()
        this.users.set(j.email!, { id, password: j.password!, confirmed: !this.requireConfirm })
        return send(200, this.requireConfirm ? { user: { id, email: j.email, identities: [{}] } } : { ...this.tokensFor(id), user: { id, email: j.email } })
      }
      if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
        const user = this.users.get(j.email!)
        if (!user || user.password !== j.password) return send(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        if (!user.confirmed) return send(400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' })
        return send(200, { ...this.tokensFor(user.id), user: { id: user.id, email: j.email } })
      }
      if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token') {
        const id = this.tokens.get(j.refresh_token!)
        if (!id) return send(400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
        const email = [...this.users].find(([, v]) => v.id === id)![0]
        return send(200, { ...this.tokensFor(id), user: { id, email } })
      }
      if (u.pathname.startsWith('/rest/v1/rpc/')) {
        const uid = this.tokens.get((req.headers.authorization ?? '').replace('Bearer ', ''))
        if (!uid) return send(401, { message: 'JWT expired' })
        const machine = j.p_machine!
        if (u.pathname.endsWith('claim_trial')) {
          if (!this.trials.some(t => t.user === uid) && !this.trials.some(t => t.machine === machine)) this.trials.push({ machine, user: uid, startedAt: this.now })
          return send(200, {})
        }
        if (u.pathname.endsWith('get_entitlement')) {
          const updatesUntil = this.perpetual.get(uid)
          if (updatesUntil !== undefined) return send(200, { state: 'paid', updates_until: new Date(updatesUntil).toISOString() })
          const paidUntil = this.paid.get(uid)
          if (paidUntil !== undefined && paidUntil > this.now) return send(200, { state: 'paid', expires_at: new Date(paidUntil).toISOString() })
          const mine = this.trials.find(t => t.user === uid)
          if (mine && mine.machine !== machine) return send(200, { state: 'other_machine' })
          if (mine) {
            const exp = mine.startedAt + 30 * DAY
            return send(200, { state: exp > this.now ? 'trial' : 'expired', expires_at: new Date(exp).toISOString() })
          }
          return send(200, { state: this.trials.some(t => t.machine === machine) ? 'machine_used' : 'none' })
        }
      }
      send(404, { message: 'not found' })
    })
  }
}

