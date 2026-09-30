// Đóng gói MikMaster thành MỘT file chạy (Node Single Executable Application):
// gateway + giao diện web nhúng sẵn; máy chạy không cần cài Node hay pnpm.
//
//   pnpm build:exe          → release/MikMaster.exe (Windows), release/MikMaster.dmg + release/MikMaster-Setup.pkg (macOS), release/MikMaster (Linux)
//
// File chạy được build cho đúng hệ điều hành đang chạy lệnh (Windows → .exe). Bản .exe build sẵn
// trên máy Windows của GitHub Actions: workflow "Build executables".
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
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
  const { rcedit } = await import('rcedit')
  await rcedit(exe, {
    icon: path.join(root, 'build-assets/icon.ico'),
    'file-version': pkg.version, 'product-version': pkg.version,
    'version-string': { ProductName: 'MikMaster', FileDescription: 'MikMaster — AV projector control', CompanyName: 'MikMaster', OriginalFilename: 'MikMaster.exe' },
  })
}

const postject = path.join(root, 'node_modules/postject/dist/cli.js')
run(process.execPath, [postject, exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', FUSE,
  ...(platform === 'darwin' ? ['--macho-segment-name', 'NODE_SEA'] : [])])
if (platform === 'darwin') run('codesign', ['--sign', '-', exe])

let result = exe
if (platform === 'darwin') result = packageMac(exe)

fs.rmSync(work, { recursive: true, force: true })
const mb = (fs.statSync(result).size / 1024 / 1024).toFixed(0)
console.log(`\n✓ ${path.relative(root, result)} (${mb} MB)`)

/**
 * macOS: MikMaster.app trong MikMaster.dmg (kéo vào Applications).
 * Tệp chạy chính của .app là một script nhỏ: khởi động gateway chạy nền rồi thoát ngay, để lần mở sau
 * macOS chạy lại script (thay vì chỉ "gọi lên" app đang chạy) → gateway đang chạy thì chỉ mở lại trình duyệt.
 * Log: ~/Library/Logs/MikMaster.log. Tắt: menu logo → Quit MikMaster.
 */
function packageMac(binary) {
  step('Building MikMaster.app')
  const app = path.join(out, 'MikMaster.app')
  fs.rmSync(app, { recursive: true, force: true })
  const contents = path.join(app, 'Contents')
  fs.mkdirSync(path.join(contents, 'MacOS'), { recursive: true })
  fs.mkdirSync(path.join(contents, 'Resources'), { recursive: true })
  fs.renameSync(binary, path.join(contents, 'Resources', 'mikmaster-gateway'))
  fs.copyFileSync(path.join(root, 'build-assets/AppIcon.icns'), path.join(contents, 'Resources', 'AppIcon.icns'))

  const launcher = path.join(contents, 'MacOS', 'MikMaster')
  fs.writeFileSync(launcher, [
    '#!/bin/sh',
    '# Chạy gateway nền (log vào ~/Library/Logs/MikMaster.log); gateway tự mở trình duyệt,',
    '# hoặc — nếu MikMaster đã chạy — chỉ mở lại trình duyệt rồi thoát.',
    'DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"',
    'mkdir -p "$HOME/Library/Logs"',
    'nohup "$DIR/mikmaster-gateway" >> "$HOME/Library/Logs/MikMaster.log" 2>&1 &',
    '',
  ].join('\n'), { mode: 0o755 })

  const plist = {
    CFBundleName: 'MikMaster', CFBundleDisplayName: 'MikMaster', CFBundleIdentifier: 'com.mikmaster.app',
    CFBundleExecutable: 'MikMaster', CFBundleIconFile: 'AppIcon', CFBundlePackageType: 'APPL',
    CFBundleShortVersionString: pkg.version, CFBundleVersion: pkg.version,
    LSMinimumSystemVersion: '11.0', LSUIElement: true, NSHighResolutionCapable: true,
    // macOS 15+: xin quyền "Local Network" để quét và điều khiển máy chiếu trong mạng LAN.
    NSLocalNetworkUsageDescription: 'MikMaster connects to projectors on your local network to scan for and control them.',
  }
  const value = v => typeof v === 'boolean' ? `<${v}/>` : `<string>${v}</string>`
  fs.writeFileSync(path.join(contents, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
${Object.entries(plist).map(([k, v]) => `  <key>${k}</key>${value(v)}`).join('\n')}
</dict></plist>
`)
  // Ký ad-hoc cả gói (chưa có chứng chỉ Apple Developer → lần đầu mở vẫn cần "Open Anyway").
  run('codesign', ['--force', '--deep', '--sign', '-', app])

  step('Creating MikMaster.dmg')
  const staging = path.join(work, 'dmg')
  fs.mkdirSync(staging, { recursive: true })
  run('ditto', [app, path.join(staging, 'MikMaster.app')])
  fs.symlinkSync('/Applications', path.join(staging, 'Applications'))
  const dmg = path.join(out, 'MikMaster.dmg')
  fs.rmSync(dmg, { force: true })
  // hdiutil tự ước lượng dung lượng từ -srcfolder đôi khi thiếu ("No space left on device") → đặt -size dư ra.
  let bytes = 0
  // Chỉ đếm .app — không đi theo symlink /Applications.
  for (const e of fs.readdirSync(path.join(staging, 'MikMaster.app'), { recursive: true, withFileTypes: true })) {
    if (e.isFile()) bytes += fs.statSync(path.join(e.parentPath, e.name)).size
  }
  const sizeMb = Math.ceil(bytes / 1024 / 1024 * 1.25) + 32
  // hdiutil trên máy macOS của CI thỉnh thoảng lỗi "Resource busy" → thử lại vài lần.
  for (let attempt = 1; ; attempt++) {
    try {
      run('hdiutil', ['create', '-volname', 'MikMaster', '-srcfolder', staging, '-size', `${sizeMb}m`, '-fs', 'HFS+', '-ov', '-format', 'UDZO', dmg])
      break
    } catch (err) {
      if (attempt >= 3) throw err
      console.warn(`  hdiutil failed (attempt ${attempt}), retrying…`)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000 * attempt)
    }
  }

  // Bộ cài .pkg (bấm đúp → Installer → cài vào /Applications), tương đương MikMaster-Setup.exe bên Windows.
  // preinstall tắt gateway của bản cũ đang chạy nền — nếu không, mở bản mới sẽ chỉ mở lại bản cũ ("Port 8787 is already in use").
  step('Creating MikMaster-Setup.pkg')
  const scripts = path.join(work, 'pkg-scripts')
  fs.mkdirSync(scripts, { recursive: true })
  fs.writeFileSync(path.join(scripts, 'preinstall'), [
    '#!/bin/sh',
    'pkill -f "MikMaster.app/Contents/Resources/mikmaster-gateway" 2>/dev/null',
    'exit 0',
    '',
  ].join('\n'), { mode: 0o755 })
  const setupPkg = path.join(out, 'MikMaster-Setup.pkg')
  fs.rmSync(setupPkg, { force: true })
  // Không cho Installer "relocate": mặc định gói .pkg tìm bản .app cùng bundle id ở BẤT KỲ đâu trên máy (vd. release/MikMaster.app
  // của lần build cũ) và cập nhật bản đó thay vì cài vào /Applications.
  const pkgRoot = path.join(work, 'pkg-root')
  fs.mkdirSync(pkgRoot, { recursive: true })
  run('ditto', [app, path.join(pkgRoot, 'MikMaster.app')])
  const componentPlist = path.join(work, 'component.plist')
  fs.writeFileSync(componentPlist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><array><dict>
  <key>RootRelativeBundlePath</key><string>MikMaster.app</string>
  <key>BundleIsRelocatable</key><false/>
  <key>BundleIsVersionChecked</key><false/>
  <key>BundleHasStrictIdentifier</key><false/>
  <key>BundleOverwriteAction</key><string>upgrade</string>
</dict></array></plist>
`)
  run('pkgbuild', ['--root', pkgRoot, '--component-plist', componentPlist, '--install-location', '/Applications', '--scripts', scripts,
    '--identifier', 'com.mikmaster.app.pkg', '--version', pkg.version, setupPkg])
  return dmg
}
