import type { DriverProtocol } from '../../../shared/api.ts'
import { christieDriver } from './christie.ts'
import { panasonicDriver } from './panasonic.ts'
import { pjlinkDriver } from './pjlink.ts'
import type { Driver } from './types.ts'

export const DRIVERS: Record<DriverProtocol, Driver> = {
  'pjlink-class1': pjlinkDriver,
  'pjlink-class2': pjlinkDriver,
  'panasonic-nt-control': panasonicDriver,
  'christie-serial-ip': christieDriver,
}
