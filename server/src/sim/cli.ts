import { ChristieSimulator } from './christieSim.ts'
import { PanasonicSimulator } from './panasonicSim.ts'
import { PjlinkSimulator } from './pjlinkSim.ts'

/**
 * Ba máy giả lập trên loopback, cổng mặc định của từng giao thức, để thử quét subnet 127.0.0
 * (Linux chấp nhận cả dải 127/8; macOS cần `sudo ifconfig lo0 alias 127.0.0.22`, `.23`).
 */
const sims = [
  new PjlinkSimulator({ host: '127.0.0.21', port: 4352, name: 'Sim PJLink', model: 'SIM-PJ' }),
  new PanasonicSimulator({ host: '127.0.0.22', port: 1024, model: 'RQ35K' }),
  new ChristieSimulator({ host: '127.0.0.23', port: 3002 }),
]
for (const sim of sims) {
  await sim.start().then(
    () => console.log(`${sim.constructor.name} on ${sim.host}:${sim.port}`),
    err => console.error(`${sim.constructor.name} failed on ${sim.host}:${sim.port}: ${err.message}`),
  )
}
