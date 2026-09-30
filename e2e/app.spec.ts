import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'

// Luồng chính ở chế độ SIMULATED (không gateway). Mỗi test bắt đầu với bộ nhớ trình duyệt sạch.

async function createProject(page: Page, name = 'E2E Show', login = true) {
  await page.goto('/')
  await page.getByRole('button', { name: /Create & Scan/ }).click()
  await page.getByLabel('PROJECT NAME').fill(name)
  await page.getByLabel('New group name').fill('Balcony')
  await page.getByLabel('New group name').press('Enter')
  await expect(page.getByText('Balcony')).toBeVisible()
  await page.getByRole('button', { name: /NEXT: SCAN/ }).click()
  // Quét giả lập ~5 giây; đợi quét xong để có đủ 6 máy.
  await expect(page.getByText('Scan complete')).toBeVisible({ timeout: 15_000 })
  // Máy quét được có nhiều loại → mỗi loại một ô đăng nhập (Panasonic bắt buộc, điền sẵn admin).
  await expect(page.getByLabel('Panasonic USERNAME')).toHaveValue('admin')
  await page.getByRole('button', { name: login ? /LOGIN & LAUNCH/ : /LAUNCH WITHOUT LOGIN/ }).click()
  await expect(page).toHaveURL(/#\/project$/)
}

const sidebar = (page: Page) => page.locator('aside').first()
const card = (page: Page, id: string) => page.locator('article', { hasText: id })

test('new project: name + booths on one page → scan → login & launch', async ({ page }) => {
  await createProject(page)
  await expect(sidebar(page).getByText('E2E Show')).toBeVisible()
  await expect(page.getByRole('tab', { name: /^All/ })).toContainText('6')
  await expect(page.getByRole('tab', { name: /^Balcony/ })).toContainText('0')
  await expect(page.getByText('SIMULATED · NO GATEWAY')).toBeVisible()
})

test('move a projector to another booth by right-click and by drag and drop', async ({ page }) => {
  await createProject(page)
  await card(page, 'PJ-01').click({ button: 'right' })
  const menu = page.getByRole('menu')
  await menu.getByRole('menuitem', { name: 'Balcony' }).click()
  await expect(page.getByRole('tab', { name: /^Balcony/ })).toContainText('1')

  await card(page, 'PJ-02').dragTo(page.getByRole('tab', { name: /^Balcony/ }))
  await expect(page.getByRole('tab', { name: /^Balcony/ })).toContainText('2')
})

test('rename inline, unsaved marker, and the save prompt before leaving', async ({ page }) => {
  await createProject(page)
  await sidebar(page).getByText('E2E Show').dblclick()
  await page.getByLabel('Project name').fill('Renamed Show')
  await page.getByLabel('Project name').press('Enter')
  await expect(sidebar(page).getByText('UNSAVED')).toBeVisible()

  await sidebar(page).getByRole('button', { name: /File menu/ }).click()
  await page.getByRole('menuitem', { name: /New project/ }).click()
  const dialog = page.getByRole('dialog', { name: 'UNSAVED CHANGES' })
  await expect(dialog).toContainText('Renamed Show')
  await dialog.getByRole('button', { name: 'CANCEL' }).click()
  await expect(page).toHaveURL(/#\/project/)

  await sidebar(page).getByRole('button', { name: /UNSAVED/ }).click()
  await expect(sidebar(page).getByText('UNSAVED')).toBeHidden()
})

test('detail page: power ON/OFF only, ping needs the gateway, breadcrumb back to the booth', async ({ page }) => {
  await createProject(page)
  await card(page, 'PJ-01').click()
  await expect(page).toHaveURL(/projectors\/PJ-01/)
  await expect(page.getByRole('button', { name: 'STBY' })).toHaveCount(0)
  const left = page.locator('aside').first()
  await left.getByRole('button', { name: 'ON', exact: true }).first().click()
  await left.getByRole('button', { name: 'OFF', exact: true }).first().click()
  // Tắt máy luôn hỏi xác nhận.
  await page.getByRole('dialog', { name: 'TURN OFF PROJECTOR' }).getByRole('button', { name: 'TURN OFF' }).click()
  await expect(page.locator('header')).toContainText('OFF')
  await expect(page.getByRole('button', { name: /PING/ })).toBeDisabled()

  await page.locator('header').getByRole('button', { name: 'Group 1' }).click()
  await expect(page).toHaveURL(/booth=booth-1/)
})

test('export to file (no passwords) and open it again', async ({ page }) => {
  // Buộc dùng đường tải file / input file thay vì hộp thoại hệ điều hành.
  await page.addInitScript(() => {
    Object.assign(window, { showSaveFilePicker: undefined, showOpenFilePicker: undefined })
  })
  await createProject(page, 'File Show')

  const downloadPromise = page.waitForEvent('download')
  await sidebar(page).getByRole('button', { name: 'File menu' }).click()
  await page.getByRole('menuitem', { name: /Export to file/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('File Show.mikmaster.json')
  const path = await download.path()
  const text = fs.readFileSync(path, 'utf8')
  expect(text).toContain('"format": "mikmaster-project"')
  expect(text).not.toContain('"password"')

  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Open a project file/ }).click()
  await (await chooser).setFiles(path)
  await expect(page.getByText('Open Project File')).toBeVisible()
  await page.getByRole('button', { name: /LOGIN & LAUNCH/ }).click()
  await expect(sidebar(page).getByText('File Show')).toBeVisible()
})

test('saved projects can be deleted, samples cannot', async ({ page }) => {
  await createProject(page, 'Delete Me')
  await sidebar(page).getByRole('button', { name: 'File menu' }).click()
  await page.getByRole('menuitem', { name: /^Save/ }).click()
  await expect(page.getByRole('status')).toContainText('Saved')

  await page.goto('/')
  await page.getByRole('button', { name: /Resume Session/ }).click()
  await expect(page.getByRole('button', { name: 'Delete Grand Tech Summit 2026' })).toHaveCount(0)
  const row = page.locator('div.group', { hasText: 'Delete Me' })
  await row.hover()
  await row.getByRole('button', { name: 'Delete Delete Me' }).click()
  await row.getByRole('button', { name: 'YES' }).click()
  await expect(page.getByText('Delete Me')).toHaveCount(0)
})

test('double-click a booth to rename it; add and delete booths from the sidebar', async ({ page }) => {
  await createProject(page)
  await sidebar(page).getByText('Balcony', { exact: true }).dblclick()
  await page.getByLabel('Group name').fill('Upper Balcony')
  await page.getByLabel('Group name').press('Enter')
  await expect(page.getByRole('tab', { name: /^Upper Balcony/ })).toBeVisible()

  // ADD GROUP tạo "Booth N" và mở sẵn ô đổi tên.
  await sidebar(page).getByRole('button', { name: /ADD GROUP/ }).click()
  await page.getByLabel('Group name').fill('Truss')
  await page.getByLabel('Group name').press('Enter')
  await expect(page.getByRole('tab', { name: /^Truss/ })).toBeVisible()

  await sidebar(page).getByText('Upper Balcony', { exact: true }).hover()
  await sidebar(page).getByRole('button', { name: 'Delete Upper Balcony' }).click()
  await page.getByRole('dialog', { name: 'DELETE GROUP' }).getByRole('button', { name: /DELETE/ }).click()
  await expect(page.getByRole('tab', { name: /^Upper Balcony/ })).toHaveCount(0)
})

test('login screen only while a projector needs a login; controls hidden until then', async ({ page }) => {
  await createProject(page, 'Login Show', false)
  // PJ-03 là Panasonic (có xác thực) và chưa có mật khẩu.
  await card(page, 'PJ-03').click()
  const left = page.locator('aside').first()
  await expect(left.getByText('LOGIN REQUIRED')).toBeVisible()
  await expect(left.getByText('POWER', { exact: true })).toHaveCount(0)
  await expect(page.getByText('LENS SHIFT')).toHaveCount(0)
  await expect(page.getByText(/Sign in to this projector/)).toBeVisible()

  // Khung đăng nhập mở sẵn ở góc trên bên phải.
  const login = page.getByRole('dialog', { name: 'LOGIN REQUIRED' })
  await expect(login).toBeVisible()
  await login.getByLabel('USERNAME', { exact: true }).fill('admin')
  await login.getByLabel('PASSWORD', { exact: true }).fill('admin')
  await login.getByRole('button', { name: 'SIGN IN' }).click()
  await expect(left.getByText('LOGIN REQUIRED')).toHaveCount(0)
  await expect(left.getByText('POWER', { exact: true })).toBeVisible()
  await expect(page.getByText('LENS SHIFT')).toBeVisible()

  // Đã đăng nhập: bấm tên tài khoản (góc phải) → chỉ có ĐĂNG XUẤT (không có form, không có Huỷ); Esc đóng.
  await page.locator('header').getByRole('button', { name: /admin/ }).click()
  const account = page.getByRole('dialog', { name: 'ACCOUNT' })
  await expect(account).toBeVisible()
  await expect(account.getByRole('button', { name: 'SIGN OUT' })).toBeVisible()
  await expect(account.getByRole('button', { name: 'SIGN IN' })).toHaveCount(0)
  await expect(account.getByRole('button', { name: 'CANCEL' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(account).toHaveCount(0)

  // Đăng xuất → quay về trạng thái chưa đăng nhập: chỉ có form Đăng nhập (không có Đăng xuất).
  await page.locator('header').getByRole('button', { name: /admin/ }).click()
  await page.getByRole('dialog', { name: 'ACCOUNT' }).getByRole('button', { name: 'SIGN OUT' }).click()
  const again = page.getByRole('dialog', { name: 'LOGIN REQUIRED' })
  await expect(again).toBeVisible()
  await expect(again.getByRole('button', { name: 'SIGN IN' })).toBeVisible()
  await expect(again.getByRole('button', { name: 'SIGN OUT' })).toHaveCount(0)

  // Máy không cần đăng nhập (Christie) không bao giờ hiện ô đăng nhập.
  await page.goto('/#/project/projectors/PJ-01')
  await expect(page.getByText(/LOGIN REQUIRED|CHANGE LOGIN/)).toHaveCount(0)
  await expect(page.locator('header').getByRole('button', { name: /SIGN IN/ })).toHaveCount(0)
})

test('booth page: ALL ON one by one, ALL OFF asks first; filter and add projectors', async ({ page }) => {
  await createProject(page, 'Booth Show')
  // Tab Tất cả cũng có điều khiển hàng loạt (nút icon, tên nằm ở aria-label).
  await expect(page.getByRole('button', { name: /^All on/ })).toBeVisible()
  await page.getByRole('tab', { name: /^Group 1/ }).click()
  await page.getByRole('button', { name: 'All off' }).click()
  await page.getByRole('dialog', { name: 'TURN OFF PROJECTORS' }).getByRole('button', { name: 'CANCEL' }).click()
  // OSD và test pattern cho cả booth.
  await page.getByRole('button', { name: 'OSD off for all' }).click()
  await page.getByRole('button', { name: 'Show test pattern on all' }).click()
  await page.getByRole('dialog', { name: 'SHOW TEST PATTERN' }).getByRole('button', { name: 'SHOW PATTERN' }).click()
  await expect(page.locator('article', { hasText: 'PATTERN' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Hide test pattern on all' }).click()
  await page.getByRole('button', { name: /^All on/ }).click()
  await expect(page.getByText(/Powering on 1\/6/)).toBeVisible()
  await page.getByRole('button', { name: 'STOP' }).click()
  await expect(page.getByText(/Powering on/)).toHaveCount(0)

  // Tìm nhanh.
  await page.getByRole('tab', { name: /^All/ }).click()
  await page.getByLabel('Search projectors').fill('rq35k')
  await expect(page.locator('article')).toHaveCount(3)
  await page.getByLabel('Search projectors').fill('')

  // Thêm máy.
  await page.getByRole('button', { name: 'ADD PROJECTOR' }).click()
  const dialog = page.getByRole('dialog', { name: 'ADD PROJECTOR' })
  await dialog.getByLabel('IP ADDRESS').fill('192.168.1.200')
  await dialog.getByLabel('DISPLAY NAME (opt.)').fill('Spare')
  await dialog.getByRole('button', { name: 'ADD', exact: true }).click()
  await expect(page.locator('article', { hasText: 'Spare' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^All/ })).toContainText('7')

  // Sửa / gỡ bằng chuột phải.
  await page.locator('article', { hasText: 'Spare' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: /Remove from project/ }).click()
  await page.getByRole('dialog', { name: 'REMOVE PROJECTOR' }).getByRole('button', { name: 'REMOVE' }).click()
  await expect(page.locator('article', { hasText: 'Spare' })).toHaveCount(0)
})

test('REFRESH reads the status of every projector right away (gateway mocked, no real device)', async ({ page }) => {
  await createProject(page, 'Refresh Show')
  // Không có nút khi chưa có gateway (chế độ mô phỏng).
  await expect(page.getByRole('button', { name: 'Refresh all projectors' })).toHaveCount(0)

  const asked = new Set<string>()
  let calls = 0
  await page.route('**/api/health', r => r.fulfill({ json: { ok: true, drivers: {}, authRequired: false, authorized: true } }))
  await page.route('**/api/devices/status', async r => {
    calls++
    asked.add(JSON.parse(r.request().postData() ?? '{}').target?.ip)
    await r.fulfill({ json: { power: 'on', errors: [] } })
  })
  await page.getByRole('button', { name: /NO GATEWAY/ }).click()
  await expect(page.getByText(/GATEWAY CONNECTED/)).toBeVisible()

  const refresh = page.getByRole('button', { name: 'Refresh all projectors' })
  await expect(refresh).toBeVisible()
  asked.clear()
  const before = calls
  await refresh.click()
  await expect.poll(() => asked.size, { timeout: 8000 }).toBe(6)          // đủ 6 máy, mỗi máy được hỏi
  expect(calls - before).toBeGreaterThanOrEqual(6)
  await expect(page.getByRole('status').filter({ hasText: /\d\d:\d\d:\d\d/ })).toBeVisible()  // hiện giờ cập nhật
  await expect(refresh).toBeEnabled()
})

test('an HDCP-protected source shows "HDCP-protected content" (same text as the projector web page) instead of the placeholder', async ({ page }) => {
  await createProject(page, 'HDCP Show')
  await page.route('**/api/health', r => r.fulfill({ json: { ok: true, drivers: {}, authRequired: false, authorized: true } }))
  await page.route('**/api/devices/status', r => r.fulfill({ json: { power: 'on', errors: [] } }))
  await page.route('**/api/devices/preview', r => r.fulfill({ json: { state: 'hdcp' } }))
  await page.getByRole('button', { name: /NO GATEWAY/ }).click()
  await expect(page.getByText(/GATEWAY CONNECTED/)).toBeVisible()
  // Thẻ Dashboard của máy Panasonic (PJ-03) hiện dòng chữ HDCP…
  await expect(card(page, 'PJ-03').getByText('HDCP-protected content')).toBeVisible({ timeout: 10_000 })
  // …và trang máy cũng vậy (thay cho chữ "HDMI 1 · 85% BRT" của khung mô phỏng).
  await card(page, 'PJ-03').click()
  await expect(page.getByText('HDCP-protected content').first()).toBeVisible()
  await expect(page.getByText(/85% BRT/)).toHaveCount(0)
})

test('login panel detects the projector types and takes one account per type', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Create & Scan/ }).click()
  await page.getByRole('button', { name: /NEXT: SCAN/ }).click()
  await expect(page.getByText('Scan complete')).toBeVisible({ timeout: 15_000 })
  const panasonic = page.getByLabel('Panasonic USERNAME')
  await expect(panasonic).toHaveValue('admin')
  const christie = page.getByLabel('Christie USERNAME')
  await expect(christie).toHaveValue('') // tài khoản web của Christie: tuỳ chọn, để trống
  await panasonic.fill('panauser')
  await page.getByLabel('Christie PASSWORD').fill('c-pass')
  await christie.fill('chr')
  await page.screenshot({ path: 'test-results/login-per-type.png' })
  await page.getByRole('button', { name: /LOGIN & LAUNCH/ }).click()
  await expect(page).toHaveURL(/#\/project$/)
})
