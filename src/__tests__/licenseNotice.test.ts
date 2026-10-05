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

  it('lifetime license: warns 30 days before the update period ends; an outdated build is red', () => {
    expect(licenseNotice({ ...base, updatesInDays: 200 })).toBeNull()
    expect(licenseNotice({ ...base, updatesInDays: 25 })).toMatchObject({ tone: 'warn', text: 'UPDATES END IN {n} day(s)', vars: { n: 25 } })
    expect(licenseNotice({ ...base, state: 'outdated', restricted: true })).toMatchObject({ tone: 'danger', text: 'THIS VERSION IS NEWER THAN YOUR UPDATES' })
  })

  it('does not nag about the online window when online verification is not configured', () => {
    expect(licenseNotice({ ...base, online: { configured: false } })).toBeNull()
  })

  it('is red when a key has a problem (expired, revoked, not verified, outdated, sign in)', () => {
    for (const state of ['expired', 'revoked', 'unverified', 'outdated', 'signin'] as const) {
      expect(licenseNotice({ ...base, state, restricted: true })?.tone).toBe('danger')
    }
  })

  it('just invites to unlock Pro (yellow) when there is no license at all (Free edition)', () => {
    expect(licenseNotice({ ...base, state: 'unlicensed', restricted: true })).toMatchObject({ tone: 'warn', text: 'FREE EDITION · UNLOCK PRO' })
  })
})
