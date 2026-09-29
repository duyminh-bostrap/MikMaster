/*
 * Cache đăng nhập theo phiên trình duyệt (sessionStorage): mất khi đóng tab, không nằm lại trên đĩa ở dạng thường.
 * Lưu bền vững = nút Save Project (gateway mã hoá mật khẩu khi ghi file).
 *   - theo từng máy (ip:port): chỉ ghi sau khi đăng nhập thành công
 *   - "mặc định": tài khoản dùng chung cho mọi hãng, để máy mới/máy chưa có tài khoản tự điền
 */
export interface Credentials {
  username?: string
  password?: string
}

const KEY = 'mikmaster.credentials.v1'

interface Store {
  devices: Record<string, Credentials>
  shared: Credentials | null
}

function read(): Store {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return { devices: {}, shared: null, ...JSON.parse(raw) }
  } catch { /* sessionStorage bị chặn → coi như không có cache */ }
  return { devices: {}, shared: null }
}

function write(store: Store): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(store)) } catch { /* bỏ qua */ }
}

const keyOf = (ip: string, port: number) => `${ip}:${port}`

export function getDeviceCredentials(ip: string, port: number): Credentials | null {
  return read().devices[keyOf(ip, port)] ?? null
}

export function saveDeviceCredentials(ip: string, port: number, creds: Credentials): void {
  const s = read()
  s.devices[keyOf(ip, port)] = creds
  write(s)
}

export function forgetDeviceCredentials(ip: string, port: number): void {
  const s = read()
  delete s.devices[keyOf(ip, port)]
  write(s)
}

export function getSharedCredentials(): Credentials | null {
  return read().shared
}

export function saveSharedCredentials(creds: Credentials | null): void {
  const s = read()
  s.shared = creds
  write(s)
}
