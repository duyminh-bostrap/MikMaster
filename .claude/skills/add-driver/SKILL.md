---
name: add-driver
description: Add a new projector brand/protocol driver end to end (shared types, server driver, scan/identify, simulator, tests, UI catalog). Use when adding support for a new projector brand or control protocol.
disable-model-invocation: true
argument-hint: <brand-or-protocol-id>
---

Add driver `$ARGUMENTS`. Use the Barco Pulse driver as the reference (smallest complete example): grep `barco` / `barcoPulse` to see every place it is wired, and mirror each one.

## Checklist (all required)

1. **`shared/api.ts`**: add the id to `DriverProtocol`; add its supported `Capability[]` to `LIVE_CAPABILITIES`. List only commands with a documented source and comment the source. If it has its own command group, extend `COMMAND_BRANDS`, `commandBrandOf`, and `QUICK_LOGIN_BRANDS` if it uses logins; if the web UI needs a login, add to `WEB_LOGIN_PROTOCOLS`.
2. **`server/src/drivers/<name>.ts`**: implement `Driver` from `types.ts` (`status`, `command`, `raw`, `probe`, optional `identify`). Reuse helpers in `server/src/net/`. `probe` returns `null` when the port is not this device. Unsupported commands must throw a clear "unsupported" error, never be sent.
3. **`server/src/drivers/index.ts`**: register in `DRIVERS` (typecheck fails until every `DriverProtocol` is present).
4. **`server/src/scan.ts`, `server/src/identify.ts`**: add to `SCAN_PROTOCOLS` / identification so network scan finds it.
5. **`server/src/sim/<name>Sim.ts`** (extend `SimServer` from `sim/base.ts`) and register it in `sim/cli.ts`. Include a stray notification/garbage frame if the real protocol can push unsolicited data.
6. **`server/test/drivers.test.ts`**: add a `describe` block like the Barco one (power on/off, shutter, status, an unsupported command, raw, probe). Run `pnpm test:server`.
7. **UI**: `src/constants/protocols.ts` (`PROTOCOL_OPTIONS`), `src/constants/models.ts` (`MODEL_PRESETS`), `src/constants/commandCatalog.ts`, `src/types/protocol.ts`, `src/i18n/vi.ts` strings. Unsupported test patterns must stay greyed out (see `TEST_PATTERNS`).
8. **README "Driver" section**: record that the driver is untested on real hardware unless it was.

## Finish
Run `pnpm typecheck && pnpm test && pnpm test:server`. Report which capabilities are verified vs. taken from documentation only.
