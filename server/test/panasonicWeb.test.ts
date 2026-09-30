import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, beforeEach, describe, test } from 'node:test'
import { findImageCandidates, panasonicPreview, resetPanasonicPreview, toDataUrl } from '../src/drivers/panasonicWeb.ts'
import { digestResponse, parseChallenge, resetDigestState } from '../src/net/digest.ts'
import crypto from 'node:crypto'

// 1×1 JPEG hợp lệ (đủ để nhận diện bằng 2 byte đầu FFD8).
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')

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

/** "Máy chiếu" giả: web có Digest (realm WEB Zone) + trang preview.cgi có script + điểm cuối ảnh. */
function fakeProjector(opts: { imageAs?: 'jpeg' | 'base64' | 'html' } = {}) {
  const user = 'admin', pass = 'admin-pw'
  const requests: string[] = []
  const nonce = 'n0nce'
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`)
    const auth = req.headers.authorization ?? ''
    const f = Object.fromEntries([...auth.matchAll(/(\w+)=(?:"([^"]*)"|([^\s,]+))/g)].map(m => [m[1], m[2] ?? m[3]]))
    const ok = f.username === user && f.nonce === nonce && f.response === crypto.createHash('md5').update(
      `${crypto.createHash('md5').update(`${user}:WEB Zone:${pass}`).digest('hex')}:${nonce}:${f.nc}:${f.cnonce}:auth:${crypto.createHash('md5').update(`GET:${req.url}`).digest('hex')}`).digest('hex')
    if (!ok) return void res.writeHead(401, { 'WWW-Authenticate': `Digest realm="WEB Zone", nonce="${nonce}", algorithm="MD5", qop="auth"` }).end('unauthorized')
    const url = new URL(req.url ?? '/', 'http://x')
    if (url.pathname === '/cgi-bin/preview.cgi') {
      return void res.writeHead(200, { 'Content-Type': 'text/html' }).end(`<html><body><div id="images"><img src=""></div><script>
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/cgi-bin/get_preview_image.cgi?t=' + new Date().getTime(), true);
        xhr.responseType = 'blob';
        var css = '/cgi-bin/style.css';
      </script></body></html>`)
    }
    if (url.pathname === '/cgi-bin/get_preview_image.cgi') {
      if (opts.imageAs === 'html') return void res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html>nope</html>')
      if (opts.imageAs === 'base64') return void res.writeHead(200, { 'Content-Type': 'text/plain' }).end(JPEG.toString('base64'))
      return void res.writeHead(200, { 'Content-Type': 'image/jpeg' }).end(JPEG)
    }
    res.writeHead(404).end()
  })
  return { server, user, pass, requests }
}

describe('Panasonic Remote preview over the projector web (Digest)', () => {
  let fp: ReturnType<typeof fakeProjector>
  let port = 0
  const target = (username?: string, password?: string) => ({ host: '127.0.0.1', port: 4352, timeoutMs: 2000, username, password })
  beforeEach(() => { resetDigestState(); resetPanasonicPreview() })
  const servers: http.Server[] = []
  const start = async (o?: Parameters<typeof fakeProjector>[0]) => { fp = fakeProjector(o); servers.push(fp.server); await new Promise<void>(r => fp.server.listen(0, '127.0.0.1', r)); port = (fp.server.address() as AddressInfo).port }
  after(async () => { for (const s of servers) { s.closeAllConnections(); await new Promise(r => s.close(r)) } })

  test('candidates: finds the XHR address, skips css / frames / other hosts', () => {
    const html = `xhr.open("GET", "/cgi-bin/get_preview_image.cgi?t=" + x); var a="/cgi-bin/style.css"; img.src = "http://evil.example/x.jpg"; var b='/cgi-bin/preview_status.cgi'`
    const c = findImageCandidates(html)
    assert.ok(c[0]!.startsWith('/cgi-bin/get_preview_image.cgi'))
    assert.ok(!c.some(u => /style\.css|evil|preview_status/.test(u)))
  })

  test('toDataUrl: raw JPEG, base64 text, and non-image answers', () => {
    assert.match(toDataUrl(JPEG, 'image/jpeg')!, /^data:image\/jpeg;base64,/)
    assert.match(toDataUrl(Buffer.from(JPEG.toString('base64')), 'text/plain')!, /^data:image\/jpeg;base64,/)
    assert.equal(toDataUrl(Buffer.from('<html>login</html>'), 'text/html'), null)
  })

  test('signs in with Digest, discovers the image endpoint on preview.cgi and returns the picture', async () => {
    await start()
    const r = await panasonicPreview(target(fp.user, fp.pass), port)
    assert.equal(r.state, 'image')
    assert.equal(r.image, `data:image/jpeg;base64,${JPEG.toString('base64')}`)
    // Lần sau dùng luôn địa chỉ đã dò (không đọc lại preview.cgi).
    fp.requests.length = 0
    await panasonicPreview(target(fp.user, fp.pass), port)
    assert.ok(!fp.requests.some(x => x.includes('preview.cgi')), fp.requests.join(' | '))
  })

  test('the image may come as base64 text', async () => {
    await start({ imageAs: 'base64' })
    assert.equal((await panasonicPreview(target(fp.user, fp.pass), port)).state, 'image')
  })

  test('a wrong password is tried ONCE, then not again for a while (protects the projector from locking the account)', async () => {
    await start()
    await assert.rejects(panasonicPreview(target(fp.user, 'wrong'), port), (e: { code?: string }) => e.code === 'auth')
    const before = fp.requests.length
    await assert.rejects(panasonicPreview(target(fp.user, 'wrong'), port), (e: { code?: string; message: string }) => e.code === 'auth' && /not retrying/.test(e.message))
    assert.equal(fp.requests.length, before) // lần 2 không gửi gì tới máy
    resetDigestState()
    assert.equal((await panasonicPreview(target(fp.user, fp.pass), port)).state, 'image') // tài khoản đúng thì được ngay
  })

  test('no account → asks for it without contacting the projector; unknown image format → clear error', async () => {
    await start({ imageAs: 'html' })
    await assert.rejects(panasonicPreview(target(), port), (e: { code?: string }) => e.code === 'auth')
    assert.equal(fp.requests.length, 0)
    await assert.rejects(panasonicPreview(target(fp.user, fp.pass), port), (e: Error) => /Could not find the preview image/.test(e.message))
  })
})
