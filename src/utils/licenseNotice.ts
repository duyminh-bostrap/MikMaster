import type { LicenseStatusDto } from '../../shared/api.ts'

/** Trùng với server/src/license.ts: báo trước khi còn ngần này ngày. */
export const WARN_DAYS = 14

export interface LicenseNotice { tone: 'warn' | 'danger'; text: string; vars?: Record<string, string | number> }

/**
 * Điều cần nói với người dùng về bản quyền, hoặc null nếu mọi thứ ổn:
 * bị giới hạn (đỏ) → hết dùng thử / hết hạn / thu hồi / quá 30 ngày chưa kiểm tra mạng;
 * sắp tới hạn (vàng) → dùng thử còn ≤ WARN_DAYS ngày, khoá sắp hết hạn, sắp tới hạn phải kết nối mạng.
 */
export function licenseNotice(s: LicenseStatusDto): LicenseNotice | null {
  switch (s.state) {
    case 'unlicensed': return { tone: 'danger', text: 'TRIAL ENDED · ENTER LICENSE' }
    case 'expired': return { tone: 'danger', text: 'LICENSE EXPIRED' }
    case 'revoked': return { tone: 'danger', text: 'LICENSE REVOKED' }
    case 'unverified': return { tone: 'danger', text: 'CONNECT TO THE INTERNET TO VERIFY THE LICENSE' }
    case 'trial': return (s.trialDaysLeft ?? 99) <= WARN_DAYS ? { tone: 'warn', text: 'TRIAL · {n} day(s) left', vars: { n: s.trialDaysLeft ?? 0 } } : null
    case 'licensed':
      if (s.expiresInDays !== undefined && s.expiresInDays <= WARN_DAYS) return { tone: 'warn', text: 'LICENSE ENDS IN {n} day(s)', vars: { n: s.expiresInDays } }
      if (s.online?.configured && (s.online.daysLeft ?? 99) <= WARN_DAYS) return { tone: 'warn', text: 'CONNECT TO THE INTERNET WITHIN {n} day(s)', vars: { n: s.online.daysLeft ?? 0 } }
      return null
  }
}
