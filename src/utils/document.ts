import type { Booth, Project, Projector } from '@/types'

/**
 * "Dấu vân tay" của phần người dùng chỉnh sửa rồi lưu: tên project, booth, và cấu hình từng máy
 * (tên, vị trí, model, booth, IP/giao thức/cổng, lens preset, vị trí trên sơ đồ). Không tính trạng thái sống
 * (power, shutter, input, nhiệt độ, log, kết nối) và tài khoản đăng nhập — chúng đổi liên tục
 * mà không phải là "sửa project", nên không được làm hiện cảnh báo chưa lưu.
 */
export function documentFingerprint(s: { project: Project | null; booths: Booth[]; projectors: Projector[] }): string {
  if (!s.project) return ''
  return JSON.stringify({
    name: s.project.name,
    booths: s.booths.map(b => [b.id, b.name]),
    projectors: s.projectors.map(p => [
      p.id, p.boothId, p.name, p.model,
      p.network.ip, p.network.protocol.type, p.network.protocol.port, p.network.protocol.commands ?? null,
      p.lens.presets, p.mapPos ?? null,
    ]),
  })
}
