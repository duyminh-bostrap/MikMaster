import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'

// Luồng chính ở chế độ SIMULATED (không gateway). Mỗi test bắt đầu với bộ nhớ trình duyệt sạch.

async function createProject(page: Page, name = 'E2E Show', login = true) {
  await page.goto('/')
  await page.getByRole('button', { name: /Create & Scan/ }).click()
  await page.getByLabel('PROJECT NAME').fill(name)
  await page.getByLabel('New booth name').fill('Balcony')
  await page.getByLabel('New booth name').press('Enter')
  await expect(page.getByText('Balcony')).toBeVisible()
  await page.getByRole('button', { name: /NEXT: SCAN/ }).click()
  // Quét giả lập ~5 giây; đợi quét xong để có đủ 6 máy.
  await expect(page.getByText('Scan complete')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('USERNAME')).toHaveValue('admin')
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

  await page.locator('header').getByRole('button', { name: 'Booth 1' }).click()
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
  await page.getByLabel('Booth name').fill('Upper Balcony')
  await page.getByLabel('Booth name').press('Enter')
  await expect(page.getByRole('tab', { name: /^Upper Balcony/ })).toBeVisible()

  // ADD BOOTH tạo "Booth N" và mở sẵn ô đổi tên.
  await sidebar(page).getByRole('button', { name: /ADD BOOTH/ }).click()
  await page.getByLabel('Booth name').fill('Truss')
  await page.getByLabel('Booth name').press('Enter')
  await expect(page.getByRole('tab', { name: /^Truss/ })).toBeVisible()

  await sidebar(page).getByText('Upper Balcony', { exact: true }).hover()
  await sidebar(page).getByRole('button', { name: 'Delete Upper Balcony' }).click()
  await page.getByRole('dialog', { name: 'DELETE BOOTH' }).getByRole('button', { name: /DELETE/ }).click()
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

  // Đã đăng nhập: bấm tên tài khoản (góc phải) để đổi / đăng xuất; Cancel đóng.
  await page.locator('header').getByRole('button', { name: /admin/ }).click()
  await expect(page.getByRole('dialog', { name: 'CHANGE LOGIN' })).toBeVisible()
  await page.getByRole('dialog', { name: 'CHANGE LOGIN' }).getByRole('button', { name: 'CANCEL' }).click()
  await expect(page.getByRole('dialog', { name: 'CHANGE LOGIN' })).toHaveCount(0)

  // Máy không cần đăng nhập (Christie) không bao giờ hiện ô đăng nhập.
  await page.goto('/#/project/projectors/PJ-01')
  await expect(page.getByText(/LOGIN REQUIRED|CHANGE LOGIN/)).toHaveCount(0)
  await expect(page.locator('header').getByRole('button', { name: /SIGN IN/ })).toHaveCount(0)
})

test('booth page: ALL ON one by one, ALL OFF asks first; filter and add projectors', async ({ page }) => {
  await createProject(page, 'Booth Show')
  // Tab Tất cả cũng có điều khiển hàng loạt (nút icon, tên nằm ở aria-label).
  await expect(page.getByRole('button', { name: /^All on/ })).toBeVisible()
  await page.getByRole('tab', { name: /^Booth 1/ }).click()
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
