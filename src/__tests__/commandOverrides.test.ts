import { describe, expect, it } from 'vitest'
import { commandBrandOf, effectiveCapabilities, mergeCommands } from '../../shared/api.ts'

describe('command overrides (shared helpers)', () => {
  it('maps a protocol to its brand group', () => {
    expect(['panasonic-nt-control', 'christie-serial-ip', 'barco-pulse', 'pjlink-class2', 'pjlink-class1', 'generic-tcp'].map(commandBrandOf))
      .toEqual(['panasonic', 'christie', 'barco', 'pjlink', 'pjlink', null])
  })

  it('projector-level commands win over the brand level, empty ones do not', () => {
    expect(mergeCommands({ powerOn: 'A', powerOff: 'B' }, { powerOn: 'C', powerOff: '  ' })).toEqual({ powerOn: 'C', powerOff: 'B' })
    expect(mergeCommands(undefined, undefined)).toBeUndefined()
  })

  it('a brand-level test pattern pair enables the test pattern for a vendor protocol without one built in', () => {
    expect(effectiveCapabilities('barco-pulse', undefined)).not.toContain('testPattern')
    expect(effectiveCapabilities('barco-pulse', mergeCommands({ testPatternOn: 'pattern.on', testPatternOff: 'pattern.off' }, undefined))).toContain('testPattern')
    // Panasonic RQ35K2 đã có test pattern dựng sẵn (OTS / QTS).
    expect(effectiveCapabilities('panasonic-nt-control', undefined)).toContain('testPattern')
  })
})
