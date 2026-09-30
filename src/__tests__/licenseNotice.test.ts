import { describe, expect, it } from 'vitest'
import type { LicenseStatusDto } from '../../shared/api.ts'
import { licenseNotice } from '@/utils/licenseNotice'

const base: LicenseStatusDto = { state: 'licensed', freeLimit: 3, restricted: false, machineCode: 'AAAA-1111-BBBB-2222' }

describe('licenseNotice', () => {
  it('says nothing when everything is fine', () => {
    expect(licenseNotice({ ...base, expiresInDays: 200, online: { configured: true, daysLeft: 25 } })).toBeNull()
    expect(licenseNotice({ ...base, state: 'trial', trialDaysLeft: 20 })).toBeNull()
  })

  it('warns (yellow) when the trial, the key or the online-check window is close to its end', () => {
    expect(licenseNotice({ ...base, state: 'trial', trialDaysLeft: 5 })).toMatchObject({ tone: 'warn', vars: { n: 5 } })
    expect(licenseNotice({ ...base, expiresInDays: 9 })).toMatchObject({ tone: 'warn', text: 'LICENSE ENDS IN {n} day(s)', vars: { n: 9 } })
    expect(licenseNotice({ ...base, online: { configured: true, daysLeft: 3 } })).toMatchObject({ tone: 'warn', text: 'CONNECT TO THE INTERNET WITHIN {n} day(s)', vars: { n: 3 } })
  })

  it('does not nag about the online window when online verification is not configured', () => {
    expect(licenseNotice({ ...base, online: { configured: false } })).toBeNull()
  })

  it('is red when restricted', () => {
    for (const state of ['unlicensed', 'expired', 'revoked', 'unverified'] as const) {
      expect(licenseNotice({ ...base, state, restricted: true })?.tone).toBe('danger')
    }
  })
})
