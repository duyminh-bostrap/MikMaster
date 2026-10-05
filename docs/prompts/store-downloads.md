# Prompt: trang tải file cài MikMaster trên web Portfolio (Store)

Dán phần trong khung dưới vào phiên Claude Code mở trong repo **Mike-Portfolio**. Làm **sau hoặc song song** với [store-license.md](store-license.md)
(trang tải về là nơi khách nhận file cài; trang tài khoản / thanh toán trỏ về đây). Prompt bằng tiếng Anh để agent làm chính xác.

## Việc bạn cần làm một lần trước (phía MikMaster)

Repo MikMaster đang **private** nên link Releases hiện tại người ngoài không tải được. Chọn cách rẻ và ít việc nhất: một repo **công khai chỉ chứa file cài**.

1. GitHub → **New repository** → `MikMaster-releases`, **Public**, không cần code (chỉ README ngắn).
2. GitHub → Settings → Developer settings → **Fine-grained personal access token**: chỉ chọn repo `MikMaster-releases`, quyền **Contents: Read and write**, hạn 1 năm.
3. Repo **MikMaster** → Settings → Secrets and variables → Actions:
   - **Variables** → `RELEASES_REPO` = `duyminh-bostrap/MikMaster-releases`
   - **Secrets** → `RELEASES_REPO_TOKEN` = token ở bước 2
4. Mỗi lần có bản mới: đợi *Build executables* xong, chỉnh ghi chú phát hành, rồi vào Actions → **Sync release to public repo** → Run workflow → nhập tag (vd. `v0.5.7`). Workflow chép file cài, ghi chú và `SHA256SUMS.txt` sang repo công khai.

Không ai có thể tải file cài mà không cần đăng nhập app? Được — file cài công khai là chuyện bình thường: **app tự khóa bằng tài khoản / license**, tải về không cho ai dùng miễn phí quá 30 ngày. Nếu bạn muốn bắt đăng nhập mới được tải, dùng phương án R2 ở cuối prompt.

---

```text
You are working in the repo "Mike-Portfolio" (Vite + React 19 + TypeScript + Tailwind + react-router-dom + @supabase/supabase-js, deployed on Vercel as a static SPA with serverless functions in /api — if /api does not exist yet, create it and fix vercel.json so /api/* is NOT rewritten to index.html; see vercel.json, SETUP.md, src/pages/Store.tsx, ProductDetail.tsx, src/lib/auth.tsx).

GOAL
Add a public "Download" page to the Store where visitors download the installers of my desktop app "MikMaster" (AV projector control software). The installers are NOT stored in this repo or on Vercel. They live as assets of GitHub Releases in a PUBLIC repo `duyminh-bostrap/MikMaster-releases` (a CI workflow in my private MikMaster repo copies each release there: installer files, release notes, and a SHA256SUMS.txt). Your page reads that public release data and links straight to the GitHub download URLs.

Files in each release (names are stable):
- MikMaster-Setup.exe   Windows 64-bit installer (recommended, no admin rights needed)
- MikMaster.exe         Windows 64-bit portable (no install)
- MikMaster-Setup.pkg   macOS (Apple Silicon) installer (recommended)
- MikMaster.dmg         macOS (Apple Silicon) drag-and-drop image
- SHA256SUMS.txt        lines "<sha256>  <filename>"
Older releases may miss the .pkg or SHA256SUMS.txt — handle missing files gracefully.

BEFORE WRITING CODE
1. Read the files above; summarise (8 lines) how routing, i18n/copy, styling and the Store pages work.
2. Ask me and WAIT: (a) exact public repo name/owner if different, (b) site languages for the new page, (c) whether downloads must require sign-in (default: NO — the app itself is protected by the account/license system; free trial = 30 days per account and per machine), (d) any legal text/links to show (Terms, Privacy).
3. Work on a branch `feature/store-downloads`, small commits. Do not touch the 3D hero/gallery components.

WHAT TO BUILD
A. Serverless endpoint `api/releases.ts` (GET):
   - Fetch `https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=10` (RELEASES_REPO from a server env var, default the repo above). Optional `GITHUB_TOKEN` env (no VITE_ prefix) only to raise the rate limit; the repo is public so it is not required.
   - Keep drafts/prereleases out. For each release return: version (tag without "v"), tag, publishedAt, notes (markdown string), assets [{ name, size, url, platform: 'windows'|'macos', kind: 'installer'|'portable'|'image', sha256? }]. Get sha256 by downloading and parsing SHA256SUMS.txt from the release assets (cache it). Only accept asset URLs that start with `https://github.com/${RELEASES_REPO}/releases/download/` and file names from an allow-list (the five above).
   - Cache: `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`. On upstream failure return the last good payload if you have one, else a JSON error {error:'unavailable'} with status 502 (the page must still work — see fallback).
B. Page `/download` (lazy-loaded route; add links from the Store nav and from the MikMaster product page, and to the future /account and checkout-success pages):
   - Hero: app name, latest version, release date, one big primary button for the visitor's OS detected from navigator.userAgentData / userAgent / platform (Windows → MikMaster-Setup.exe, macOS → MikMaster-Setup.pkg), with size and a secondary line "Other downloads" listing the remaining files. Mac note: the current build is Apple Silicon (M1 and later) only — show that clearly; Intel Mac users must not get a false promise. Linux/mobile: show a neutral "MikMaster is available for Windows and macOS" message with all links.
   - "Free 30 days" call to action: create an account (/signup) or sign in, then sign in inside the app; the trial starts at first sign-in on that computer.
   - Integrity: show SHA-256 per file with a copy button and the verify commands (macOS/Linux: `shasum -a 256 <file>`, Windows PowerShell: `Get-FileHash <file> -Algorithm SHA256`).
   - Install guide (collapsible, per OS), in the site's languages:
       Windows: run MikMaster-Setup.exe -> "Windows protected your PC" (the installer is not code-signed yet) -> More info -> Run anyway. Data lives in %APPDATA%\MikMaster; updating = run the newer installer (it closes the running app).
       macOS: quit any running MikMaster first (menu-bar icon / logo menu -> Quit), double-click MikMaster-Setup.pkg (right-click -> Open if macOS blocks it, or System Settings -> Privacy & Security -> Open Anyway), then open /Applications/MikMaster.app. Allow "Local Network" when asked, otherwise projectors are not found. The app runs in the background and opens the browser at http://mikmaster.localhost:8787.
       Both: the app is not notarized/signed yet, say so honestly.
   - Release notes: render the latest release's markdown safely (react-markdown WITHOUT raw HTML, or sanitize with DOMPurify; links open with rel="noopener noreferrer" target="_blank"). Show older versions in an accordion ("Previous versions") with their files.
   - System requirements block: Windows 10/11 64-bit; macOS 11+ on Apple Silicon; the computer must be on the same network as the projectors; internet only for account sign-in / 30-day license check.
   - States: skeleton while loading; error state with a plain link to `https://github.com/${RELEASES_REPO}/releases/latest`; empty state. Responsive, accessible (buttons are real <a>/<button>, focus styles, alt text), same visual language as the site.
C. Optional (ask first): anonymous download counter — table `download_events(id, created_at, version, file, platform)` with RLS that allows INSERT for anon through a security-definer RPC `log_download(p_version text, p_file text)` that validates the values, no PII stored, plus a simple count in Admin. Skip if I say no.
D. Docs: update SETUP.md (env vars RELEASES_REPO, optional GITHUB_TOKEN; how a new release shows up: after my "Sync release to public repo" workflow runs, the page updates within ~5 minutes).

SECURITY / QUALITY RULES
- Never bundle installers into the repo or the Vercel deploy. Never expose tokens to the browser. No secrets in git.
- Treat all upstream data as untrusted: validate shapes, allow-list file names and hosts, sanitize markdown, escape everything.
- No third-party trackers. Keep bundle impact small (lazy route, no heavy libraries beyond a markdown renderer).
- Unit-test the release transform (missing files, missing checksums, prerelease/draft filtering, bad URLs rejected) with vitest and mock the GitHub API; `npm run build` must pass.

OUTPUT
Push the branch / open a PR listing: files changed, env vars, how to test locally with a mocked /api/releases, screenshots or a description of desktop + mobile layouts, and anything not verified (for example the real GitHub API response if the public repo has no release yet).
```

## Phương án thay thế: bắt đăng nhập mới được tải (Cloudflare R2)

Nếu bạn muốn chỉ người đã đăng nhập (hoặc đã mua) mới tải được, bảo agent làm thế này thay cho repo công khai:
lưu file trong bucket **Cloudflare R2** (miễn phí 10 GB, không tính phí băng thông ra), hàm `/api/download` kiểm JWT Supabase rồi trả **URL ký sẵn hết hạn sau vài phút**.
Đổi lại bạn phải tự tải file lên R2 mỗi bản (workflow `sync-release.yml` cần thêm bước upload) và giữ khóa API R2 trong biến môi trường Vercel.
