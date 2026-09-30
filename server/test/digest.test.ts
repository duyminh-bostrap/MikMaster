import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, beforeEach, describe, test } from 'node:test'
import { digestGet, digestResponse, parseChallenge, resetDigestState } from '../src/net/digest.ts'

describe('HTTP Digest', () => {
  test('matches the RFC 2617 example (qop=auth, MD5)', () => {
    const c = parseChallenge('Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"')!
    assert.equal(c.qop, 'auth')
    assert.equal(digestResponse(c, { username: 'Mufasa', password: 'Circle Of Life', method: 'GET', uri: '/dir/index.html', nc: '00000001', cnonce: '0a4f113b' }), '6629fae49393a05397450978507c4ef1')
  })

  test('parses the projector style challenge and rejects unsupported ones', () => {
    assert.deepEqual(parseChallenge('Digest realm="WEB Zone", nonce="abc", algorithm="MD5", qop="auth"'), { realm: 'WEB Zone', nonce: 'abc', qop: 'auth', algorithm: 'MD5' })
    assert.equal(parseChallenge('Basic realm="x"'), null)
    assert.equal(parseChallenge('Digest realm="x", nonce="n", algorithm=SHA-512-256'), null)
  })
})

describe('digestGet against a Digest-protected web server', () => {
  const user = 'admin', pass = 'admin-pw', nonce = 'n0nce'
  const requests: string[] = []
  const md5 = (x: string) => crypto.createHash('md5').update(x).digest('hex')
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`)
    const f = Object.fromEntries([...(req.headers.authorization ?? '').matchAll(/(\w+)=(?:"([^"]*)"|([^\s,]+))/g)].map(m => [m[1], m[2] ?? m[3]]))
    const ok = f.username === user && f.nonce === nonce && f.response === md5(`${md5(`${user}:WEB Zone:${pass}`)}:${nonce}:${f.nc}:${f.cnonce}:auth:${md5(`GET:${req.url}`)}`)
    if (!ok) return void res.writeHead(401, { 'WWW-Authenticate': `Digest realm="WEB Zone", nonce="${nonce}", algorithm="MD5", qop="auth"` }).end('no')
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('hello')
  })
  let port = 0
  const get = (password: string, uri = '/x') => digestGet({ host: '127.0.0.1', port, uri, username: user, password, timeoutMs: 2000 })
  beforeEach(() => { resetDigestState(); requests.length = 0 })
  after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)) })
  test('setup', async () => { await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); port = (server.address() as AddressInfo).port })

  test('signs in, then reuses the nonce (one request per call)', async () => {
    assert.equal((await get(pass)).body.toString(), 'hello')
    requests.length = 0
    assert.equal((await get(pass, '/y')).body.toString(), 'hello')
    assert.equal(requests.length, 1)
  })

  test('a wrong password is tried ONCE, then not again for a while (protects the projector from locking the account)', async () => {
    await assert.rejects(get('wrong'), (e: { code?: string }) => e.code === 'auth')
    const before = requests.length
    await assert.rejects(get('wrong'), (e: { code?: string; message: string }) => e.code === 'auth' && /not retrying/.test(e.message))
    assert.equal(requests.length, before)
    assert.equal((await get(pass)).status, 200) // tài khoản đúng (khoá chặn theo từng tài khoản) thì được ngay
  })
})
