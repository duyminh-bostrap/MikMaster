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

test('the All tab groups the cards under their group; a single group tab shows no headings', async ({ page }) => {
  await createProject(page)
  await card(page, 'PJ-01').click({ button: 'right' })
  await page.getByRole('menu').getByRole('menuitem', { name: 'Balcony' }).click()
  const main = page.locator('main')
  const balcony = main.getByRole('region', { name: 'Balcony' })
  await expect(balcony).toContainText('1 device')
  await expect(balcony.locator('article')).toHaveCount(1)
  await expect(balcony.locator('article')).toContainText('PJ-01')
  const first = main.getByRole('region', { name: 'Group 1' })
  await expect(first.locator('article')).toHaveCount(5)
  await expect(first.locator('article', { hasText: 'PJ-01' })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/all-by-group.png' })
  await page.getByRole('tab', { name: /^Balcony/ }).click()
  await expect(main.getByRole('region')).toHaveCount(0)
  await expect(main.locator('article')).toHaveCount(1)
})

test('All tab: collapse groups one by one; the Dashboard view lists every projector in the monitoring tables', async ({ page }) => {
  await createProject(page)
  await card(page, 'PJ-01').click({ button: 'right' })
  await page.getByRole('menu').getByRole('menuitem', { name: 'Balcony' }).click()
  const main = page.locator('main')

  // Thu gọn / mở từng group (không có nút thu gọn / mở tất cả).
  const first = main.getByRole('region', { name: 'Group 1' })
  await first.getByRole('button', { name: /Group 1/ }).click()
  await expect(first.locator('article')).toHaveCount(0)
  await expect(first).toContainText('5 device') // vẫn thấy số máy khi thu gọn
  await first.getByRole('button', { name: /Group 1/ }).click()
  await expect(first.locator('article')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Collapse all groups' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: '2D map' })).toHaveCount(0) // sơ đồ 2D đã bỏ

  // Dashboard: các bảng theo dõi.
  await page.getByRole('radio', { name: 'Dashboard' }).click()
  const monitor = page.getByTestId('monitor')
  for (const title of ['TEMPERATURE · TIME SINCE POWER ON', 'BRIGHTNESS', 'STATUS', 'LOG & ERRORS']) {
    await expect(monitor.getByRole('heading', { name: title })).toBeVisible()
  }
  await expect(monitor.getByRole('table', { name: 'STATUS' }).locator('tbody tr')).toHaveCount(6) // đủ 6 máy, mọi trạng thái
  await expect(monitor.getByText('No projector is on, or none reports a temperature.')).toBeVisible() // giả lập: chưa có số đo nhiệt độ
  // Bấm hàng → mở trang máy.
  await monitor.getByRole('table', { name: 'STATUS' }).locator('tbody tr', { hasText: 'PJ-03' }).click()
  await expect(page).toHaveURL(/projectors\/PJ-03/)
})

test('Dashboard: one overview chart (temperature vs time since power on; hover a line for that projector, colour legend beside), brightness, status, log and errors (gateway mocked, no real device)', async ({ page }) => {
  await createProject(page, 'Monitor Show')
  await page.route('**/api/health', r => r.fulfill({ json: { ok: true, drivers: {}, authRequired: false, authorized: true } }))
  let unreachable = false
  await page.route('**/api/devices/status', r => unreachable
    ? r.fulfill({ status: 502, json: { error: { code: 'connect', message: 'Cannot reach the projector' } } })
    : r.fulfill({ json: { power: 'on', temperatureC: 27, errors: [] } }))
  await page.route('**/api/devices/preview', r => r.fulfill({ json: { state: 'no-signal' } }))
  await page.getByRole('button', { name: /NO GATEWAY/ }).click()
  await expect(page.getByText(/GATEWAY CONNECTED/)).toBeVisible()
  await page.getByRole('radio', { name: 'Dashboard' }).click()
  const monitor = page.getByTestId('monitor')
  // Một biểu đồ chung: nhiệt độ theo thời gian từ lúc bật máy; mỗi máy một đường, khung bên cạnh ghi màu của từng máy.
  const chart = monitor.getByRole('group', { name: 'Temperature since power on' })
  await expect(chart).toBeVisible({ timeout: 10_000 })
  await expect(chart.locator('[data-series]')).toHaveCount(6)
  const legend = monitor.getByRole('complementary', { name: 'Projector colours' })
  await expect(legend.locator('li')).toHaveCount(6)
  await expect(legend).toContainText('Center Fill')
  await expect(legend).toContainText('27°C')
  await expect(legend.locator('li').first()).toContainText('ON') // kèm trạng thái kết nối của từng máy
  // Chưa trỏ vào đường nào → không có khung thông tin; trỏ vào đường của một máy → hiện thông tin máy đó.
  const tip = page.getByTestId('chart-tip')
  await expect(tip).toHaveCount(0)
  const dot = await chart.locator('[data-series="PJ-03"] circle').boundingBox()
  await page.mouse.move(dot!.x + dot!.width / 2, dot!.y + dot!.height / 2)
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('27°C')
  await expect(tip).toContainText(/\d+m/)
  await expect(tip).toContainText('PJ-0') // mã máy đang trỏ vào
  await page.mouse.move(dot!.x + dot!.width / 2, dot!.y - 150) // ra khỏi đường
  await expect(tip).toHaveCount(0)
  // Trỏ vào khung màu → đường tương ứng nổi lên; bấm → mở trang máy.
  await legend.locator('[data-legend="PJ-03"] button').hover()
  await expect(chart.locator('[data-series="PJ-02"]')).toHaveAttribute('opacity', '0.18')
  await legend.locator('[data-legend="PJ-03"] button').click()
  await expect(page).toHaveURL(/projectors\/PJ-03/)
  await page.goBack()
  await page.getByRole('radio', { name: 'Dashboard' }).click()
  await expect(monitor.getByRole('table', { name: 'BRIGHTNESS' }).locator('tbody tr')).toHaveCount(6)
  await expect(monitor.getByRole('table', { name: 'STATUS' }).locator('tbody tr').first()).toContainText('ON')
  // Mất kết nối → hàng đầu của bảng trạng thái là máy cần chú ý, có mục trong nhật ký.
  await expect(monitor.getByText('No events')).toBeVisible()
  unreachable = true
  await page.getByRole('button', { name: 'Refresh all projectors' }).click()
  await expect(monitor.getByRole('table', { name: 'STATUS' }).locator('tbody tr').first()).toContainText('OFFLINE', { timeout: 10_000 })
  await expect(monitor.getByText('No events')).toHaveCount(0)
  // Khung màu vẫn liệt kê mọi máy, kèm trạng thái mất kết nối (máy chưa có đường thì ô màu nét đứt).
  const legendAfter = monitor.getByRole('complementary', { name: 'Projector colours' })
  await expect(legendAfter.locator('li')).toHaveCount(6)
  await expect(legendAfter.locator('li').first()).toContainText('OFFLINE')
  await monitor.getByRole('radio', { name: 'Errors', exact: true }).click()
  await expect(monitor.getByText(/ACTIVE ERRORS/)).toBeVisible()
  await page.screenshot({ path: 'test-results/monitor.png' })
})

test('detail page: no ADVANCED block on the projector; brightness control sits under the lens presets and needs the projector on', async ({ page }) => {
  await createProject(page)
  await card(page, 'PJ-01').click()
  await expect(page.locator('aside').first().getByRole('button', { name: /ADVANCED/ })).toHaveCount(0)
  const right = page.locator('aside').last()
  // Độ sáng nằm dưới LENS PRESETS.
  const presets = await right.getByText('LENS PRESETS').boundingBox()
  const bright = await right.getByText('BRIGHTNESS', { exact: true }).boundingBox()
  expect(bright!.y).toBeGreaterThan(presets!.y)
  // Máy tắt → không chỉnh được.
  await expect(right.getByRole('slider', { name: 'BRIGHTNESS' })).toBeDisabled()
  await page.locator('aside').first().getByRole('button', { name: 'ON', exact: true }).first().click()
  await expect(right.getByRole('slider', { name: 'BRIGHTNESS' })).toBeEnabled()
  await right.getByRole('button', { name: 'BRIGHTNESS 50%' }).click()
  await expect(right.getByRole('slider', { name: 'BRIGHTNESS' })).toHaveValue('50')
  await right.getByRole('button', { name: 'Brightness up' }).click()
  await expect(right.getByRole('slider', { name: 'BRIGHTNESS' })).toHaveValue('55')
  await expect(page.locator('aside').first()).toContainText('55%') // dòng BRIGHTNESS trong STATUS
  await page.screenshot({ path: 'test-results/brightness.png' })
})

test('detail page: LOG and RAW COMMAND live behind one TERMINAL button (Ctrl+` toggles)', async ({ page }) => {
  await createProject(page, 'Term Show')
  await page.route('**/api/health', r => r.fulfill({ json: { ok: true, drivers: {}, authRequired: false, authorized: true } }))
  await page.route('**/api/devices/status', r => r.fulfill({ json: { power: 'on', errors: [] } }))
  await page.route('**/api/devices/raw', r => r.fulfill({ json: { reply: 'PONG' } }))
  await page.getByRole('button', { name: /NO GATEWAY/ }).click()
  await expect(page.getByText(/GATEWAY CONNECTED/)).toBeVisible()
  await card(page, 'PJ-03').click()
  // Không còn khối EVENT LOG / RAW COMMAND rời trong cột trái.
  await expect(page.locator('aside').first().getByText('EVENT LOG')).toHaveCount(0)
  await expect(page.locator('aside').first().getByText('RAW COMMAND')).toHaveCount(0)
  const dock = page.locator('#terminal-dock')
  const toggle = page.getByRole('button', { name: /TERMINAL/ })
  await expect(dock).toBeHidden()
  await toggle.click()
  await expect(dock).toBeVisible()
  await expect(dock.getByText('No events').or(dock.getByText(/Reconnected|Connection|Command/).first())).toBeVisible()
  await page.getByRole('tab', { name: 'RAW COMMAND' }).click()
  await dock.getByLabel('Raw command').fill('QPW')
  await dock.getByLabel('Raw command').press('Enter')
  await expect(dock.getByText('< PONG')).toBeVisible()
  await expect(dock.getByText('> QPW')).toBeVisible()
  await page.getByRole('tab', { name: 'LOG' }).click()
  await page.getByRole('tab', { name: 'RAW COMMAND' }).click()
  await expect(dock.getByText('< PONG')).toBeVisible() // lịch sử còn nguyên khi chuyển thẻ
  await page.screenshot({ path: 'test-results/terminal.png' })
  await page.keyboard.press('Control+`')
  await expect(dock).toBeHidden()
})

test('license: Free edition = power + shutter only, the license page is skippable; a key unlocks Pro (orange PRO next to the logo); a key can be released', async ({ page }) => {
  const base = { freeLimit: 3, machineCode: 'AAAA-1111-BBBB-2222', trialDaysLeft: 0 }
  let status: Record<string, unknown> = { ...base, state: 'unlicensed', edition: 'free', gate: true, restricted: true }
  await createProject(page, 'Edition Show')
  await page.route('**/api/health', r => r.fulfill({ json: { ok: true, drivers: {}, authRequired: false, authorized: true } }))
  await page.route('**/api/devices/status', r => r.fulfill({ json: { power: 'on', errors: [] } }))
  await page.route('**/api/license', async r => {
    const m = r.request().method()
    if (m === 'PUT') status = { ...base, state: 'licensed', edition: 'pro', gate: false, restricted: false, licensee: 'ACME', id: 'k1', maxProjectors: 0, bound: true }
    if (m === 'DELETE') status = { ...base, state: 'unlicensed', edition: 'free', gate: true, restricted: true, releaseCode: 'MIKR1.TESTCODE' }
    await r.fulfill({ json: status })
  })
  await page.getByRole('button', { name: /NO GATEWAY/ }).click()
  const gate = page.getByRole('dialog', { name: 'Sign in to MikMaster' })
  await expect(gate).toBeVisible({ timeout: 15_000 })
  await expect(gate.getByRole('heading', { name: 'LICENSE REQUIRED' })).toBeVisible()
  await expect(gate.getByRole('tab')).toHaveCount(0) // chưa cấu hình tài khoản: chỉ có ô nhập khoá
  await expect(gate.getByText('AAAA-1111-BBBB-2222')).toBeVisible()
  // Bỏ qua → bản Free: OSD / test pattern bị khoá, không có nhãn PRO cạnh logo.
  await gate.getByRole('button', { name: 'CONTINUE WITH THE FREE EDITION' }).click()
  await expect(gate).toBeHidden()
  await expect(page.locator('aside').first().getByText('PRO', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'OSD on for all' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Show test pattern on all' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Turn on' }).first()).toBeEnabled()
  // Máy: Pro bị khoá, có nút mở khoá.
  await card(page, 'PJ-03').click()
  await expect(page.getByRole('button', { name: 'UNLOCK PRO' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'UNLOCK PRO' }).first().click()
  await expect(gate).toBeVisible()
  await gate.getByLabel('License key').fill('MIKM2-FAKEKEY')
  await gate.getByRole('button', { name: 'ACTIVATE' }).click()
  await expect(gate).toBeHidden()
  // Pro: nhãn PRO màu cam cạnh logo, hết khoá.
  await expect(page.locator('header').getByText('PRO', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'UNLOCK PRO' })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/pro-logo.png' })
})
