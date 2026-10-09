// PostToolUse hook: typecheck after .ts/.tsx edits; exit 2 feeds errors back to Claude.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const input = JSON.parse(await new Promise((r) => { let s = ''; process.stdin.on('data', (c) => (s += c)).on('end', () => r(s || '{}')) }))
const file = input.tool_input?.file_path ?? ''
if (!/\.tsx?$/.test(file) || !existsSync('node_modules')) process.exit(0) // deps not installed: nothing to check against

const res = spawnSync('pnpm typecheck', { shell: true, encoding: 'utf8', cwd: input.cwd })
if (res.status === 0) process.exit(0)
console.error(((res.stdout ?? '') + (res.stderr ?? '')).split('\n').slice(0, 30).join('\n'))
process.exit(2)
