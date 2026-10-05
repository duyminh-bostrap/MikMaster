import { BarcoPulseSimulator } from './barcoPulseSim.ts'
import { ChristieSimulator } from './christieSim.ts'
import { PanasonicSimulator } from './panasonicSim.ts'
import { PjlinkSimulator } from './pjlinkSim.ts'
import type { SimServer } from './base.ts'

/**
 * Ba máy giả lập trên loopback, cổng mặc định của từng giao thức, để thử quét subnet 127.0.0.
 * Linux nhận cả dải 127/8. macOS chỉ có sẵn 127.0.0.1 → chạy `pnpm sim:mac-alias` một lần (cần sudo,
 * mất khi khởi động lại máy). Thiếu alias thì máy giả lập lùi về 127.0.0.1 (thêm tay bằng IP đó).
 */
const plan: Array<[string, (host: string) => SimServer]> = [
  ['127.0.0.21', host => new PjlinkSimulator({ host, port: 4352, name: 'Sim PJLink', model: 'SIM-PJ' })],
  ['127.0.0.22', host => new PanasonicSimulator({ host, port: 1024, model: 'RQ35K' })],
  ['127.0.0.23', host => new ChristieSimulator({ host, port: 3002 })],
  ['127.0.0.24', host => new BarcoPulseSimulator({ host, port: 9090 })],
]

let missingAlias = false
for (const [host, make] of plan) {
  let sim = make(host)
  try {
    await sim.start()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EADDRNOTAVAIL') {
      console.error(`${sim.constructor.name} failed on ${host}:${sim.port}: ${(err as Error).message}`)
      continue
    }
    missingAlias = true
    sim = make('127.0.0.1')
    try { await sim.start() } catch (e) {
      console.error(`${sim.constructor.name} failed on 127.0.0.1:${sim.port}: ${(e as Error).message}`)
      continue
    }
  }
  console.log(`${sim.constructor.name} on ${sim.host}:${sim.port}`)
}

if (missingAlias) {
  console.log('\n127.0.0.21–23 are not available (macOS). To scan subnet 127.0.0 with three separate devices, run once:')
  console.log('  pnpm sim:mac-alias      (asks for your password; lasts until reboot)')
  console.log('Meanwhile the simulators listen on 127.0.0.1 — add them manually by IP with the matching protocol.')
}
