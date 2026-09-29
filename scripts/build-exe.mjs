// Đóng gói MikMaster thành MỘT file chạy (Node Single Executable Application):
// gateway + giao diện web nhúng sẵn; máy chạy không cần cài Node hay pnpm.
//
//   pnpm build:exe          → release/MikMaster.exe (Windows) hoặc release/MikMaster (macOS / Linux)
//
// File chạy được build cho đúng hệ điều hành đang chạy lệnh (Windows → .exe). Bản .exe build sẵn
// trên máy Windows của GitHub Actions: workflow "Build executables".
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { build } from 'esbuild'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const out = path.join(root, 'release')
const work = path.join(out, '.sea')
const platform = process.platform
const exe = path.join(out, platform === 'win32' ? 'MikMaster.exe' : 'MikMaster')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// Node dùng để đóng gói: phải là bản chính thức (nodejs.org) — bản Homebrew không có "cầu chì" SEA.
// Mặc định là Node đang chạy script; chỉ định bản khác: `node scripts/build-exe.mjs --node /path/to/node`.
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
const nodeArg = process.argv.indexOf('--node')
const nodeBinary = nodeArg > 0 ? path.resolve(process.argv[nodeArg + 1] ?? '') : process.execPath
if (!fs.existsSync(nodeBinary) || !fs.readFileSync(nodeBinary).includes(FUSE)) {
  console.error(`${nodeBinary} cannot be packaged into a single executable.`)
  console.error('Use the official Node.js build from https://nodejs.org (Homebrew builds are not supported),')
  console.error('or point to one: node scripts/build-exe.mjs --node /path/to/official/node')
  process.exit(1)
}

const step = msg => console.log(`\n▸ ${msg}`)
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' })

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing — run `pnpm build` first (or use `pnpm build:exe`, which does it).')
  process.exit(1)
}
fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(work, { recursive: true })

step('Bundling the gateway')
await build({
  entryPoints: [path.join(root, 'server/src/sea.ts')],
  outfile: path.join(work, 'gateway.cjs'),
  bundle: true, platform: 'node', format: 'cjs', target: 'node22',
  legalComments: 'none', logLevel: 'warning',
})

step('Embedding the web app')
const files = []
for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue
  files.push(path.relative(dist, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
}
fs.writeFileSync(path.join(work, 'manifest.json'), JSON.stringify(files))
const assets = { 'manifest.json': path.join(work, 'manifest.json') }
for (const f of files) assets[`web/${f}`] = path.join(dist, f)
console.log(`  ${files.length} files`)

step('Creating the executable blob')
const blob = path.join(work, 'sea-prep.blob')
fs.writeFileSync(path.join(work, 'sea-config.json'), JSON.stringify({
  main: path.join(work, 'gateway.cjs'), output: blob,
  disableExperimentalSEAWarning: true, useSnapshot: false, useCodeCache: false, assets,
}))
run(nodeBinary, ['--experimental-sea-config', path.join(work, 'sea-config.json')]) // blob phải do đúng bản Node đó tạo

step(`Writing ${path.relative(root, exe)}`)
fs.copyFileSync(nodeBinary, exe)
fs.chmodSync(exe, 0o755)
if (platform === 'darwin') run('codesign', ['--remove-signature', exe])

if (platform === 'win32') {
  // Icon + thông tin phiên bản của file .exe (trước khi nhúng, vì rcedit ghi lại vùng resource).
  const rcedit = createRequire(import.meta.url)('rcedit')
  await (rcedit.default ?? rcedit)(exe, {
    icon: path.join(root, 'build-assets/icon.ico'),
    'file-version': pkg.version, 'product-version': pkg.version,
    'version-string': { ProductName: 'MikMaster', FileDescription: 'MikMaster — AV projector control', CompanyName: 'MikMaster', OriginalFilename: 'MikMaster.exe' },
  })
}

const postject = path.join(root, 'node_modules/postject/dist/cli.js')
run(process.execPath, [postject, exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', FUSE,
  ...(platform === 'darwin' ? ['--macho-segment-name', 'NODE_SEA'] : [])])
if (platform === 'darwin') run('codesign', ['--sign', '-', exe])

fs.rmSync(work, { recursive: true, force: true })
const mb = (fs.statSync(exe).size / 1024 / 1024).toFixed(0)
console.log(`\n✓ ${path.relative(root, exe)} (${mb} MB) — copy it to another ${platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'Mac' : 'Linux'} machine and double-click it.`)
