import type { CommandBrand, CommandTemplates } from '../../shared/api.ts'

/**
 * Tài liệu các lệnh điều khiển máy chiếu, hiển thị ở trang Nâng cao.
 *   device     = đã hỏi / chạy thử trên máy thật (chỉ lệnh hỏi, trừ khi ghi chú nói khác)
 *   doc        = có trong tài liệu chính thức của hãng nhưng chưa kiểm trên máy này
 *   unverified = nguồn thứ cấp hoặc suy ra, chưa xác nhận
 * `set` = lệnh ghi (đổi trạng thái máy); còn lại là lệnh hỏi (chỉ đọc).
 */
export type CommandStatus = 'device' | 'doc' | 'unverified'

export interface CatalogEntry {
  group: CommandBrand
  cmd: string
  set: boolean
  en: string
  vi: string
  status: CommandStatus
  source: string
  note?: { en: string; vi: string }
}

const SRC = {
  pjlink: 'PJLink spec · PT-RQ35K 192.168.1.176',
  pjlinkSpec: 'PJLink spec',
  griffyn: 'Griffyn 4K50 192.168.1.107',
  christie: 'Christie 4K7-HS/4K10-HS Serial Commands (020-102782-02)',
  griffynWeb: 'Griffyn web UI (compiled.js)',
  rez: 'Panasonic REZ15/REZ12 Control Commands (2024/3/18)',
  rq35k: 'Panasonic PT-RQ35K2 / RZ34K2 Control Commands (2025-08)',
  panaNotes: 'aot93/Panasonic-Multi-Controller notes',
  barco: 'Barco Pulse notes (user-provided)',
}

const q = (group: CommandBrand, cmd: string, en: string, vi: string, status: CommandStatus, source: string, note?: CatalogEntry['note']): CatalogEntry =>
  ({ group, cmd, set: false, en, vi, status, source, note })
const s = (group: CommandBrand, cmd: string, en: string, vi: string, status: CommandStatus, source: string, note?: CatalogEntry['note']): CatalogEntry =>
  ({ group, cmd, set: true, en, vi, status, source, note })

export const COMMAND_CATALOG: readonly CatalogEntry[] = [
  // ───────── PJLink (cổng 4352; RQ35K dùng PJLink theo khuyên của Panasonic)
  q('pjlink', '%1POWR ?', 'Power state', 'Trạng thái nguồn', 'device', SRC.pjlink, { en: '0 standby · 1 on · 2 cooling · 3 warm-up', vi: '0 standby · 1 bật · 2 làm nguội · 3 khởi động' }),
  s('pjlink', '%1POWR 1 / 0', 'Power on / off', 'Bật / tắt nguồn', 'doc', SRC.pjlinkSpec),
  q('pjlink', '%1INPT ?', 'Current input', 'Input hiện tại', 'device', SRC.pjlink, { en: '31 = HDMI 1, 32 = HDMI 2 on the RQ35K', vi: '31 = HDMI 1, 32 = HDMI 2 trên RQ35K' }),
  s('pjlink', '%1INPT 31 / 32', 'Select input', 'Chọn input', 'doc', SRC.pjlinkSpec),
  q('pjlink', '%1INST ?', 'Available inputs', 'Danh sách input', 'device', SRC.pjlink, { en: 'RQ35K: "31 32"', vi: 'RQ35K: "31 32"' }),
  q('pjlink', '%1AVMT ?', 'Shutter (AV mute)', 'Shutter (tắt hình / tiếng)', 'device', SRC.pjlink, { en: '30 = open (image on), 11 = video mute', vi: '30 = mở (có hình), 11 = tắt hình' }),
  s('pjlink', '%1AVMT 11 / 10', 'Close / open shutter', 'Đóng / mở shutter', 'doc', SRC.pjlinkSpec),
  q('pjlink', '%1LAMP ?', 'Light source hours', 'Giờ nguồn sáng', 'device', SRC.pjlink),
  q('pjlink', '%1ERST ?', 'Error status', 'Trạng thái lỗi', 'device', SRC.pjlink, { en: 'Six digits: fan, lamp, temperature, cover, filter, other', vi: 'Sáu chữ số: quạt, đèn, nhiệt, nắp, lọc, khác' }),
  q('pjlink', '%1NAME ?', 'Projector name', 'Tên máy', 'device', SRC.pjlink),
  q('pjlink', '%1INF1 ? / %1INF2 ?', 'Manufacturer / model', 'Hãng / model', 'device', SRC.pjlink),
  q('pjlink', '%1INFO ?', 'Other information', 'Thông tin khác', 'device', SRC.pjlink),
  q('pjlink', '%2SNUM ?', 'Serial number', 'Số serial', 'device', SRC.pjlink),
  q('pjlink', '%2SVER ?', 'Software version', 'Phiên bản phần mềm', 'device', SRC.pjlink),
  q('pjlink', '%2IRES ? / %2RRES ?', 'Input / recommended resolution', 'Độ phân giải tín hiệu vào / khuyến nghị', 'device', SRC.pjlink),
  q('pjlink', '%1CLSS ?', 'PJLink class', 'Lớp PJLink', 'device', SRC.pjlink, { en: 'RQ35K answers 2', vi: 'RQ35K trả lời 2' }),
  q('pjlink', 'PJLink has no temperature, lens or test pattern command', 'Not available', 'Không có nhiệt độ, lens, test pattern', 'doc', SRC.pjlinkSpec, { en: 'Use the vendor protocol or a custom command (below).', vi: 'Dùng giao thức của hãng hoặc lệnh tự khai báo (bên dưới).' }),

  // ───────── Christie (serial-over-IP, cổng 3002)
  q('christie', '(PWR?)', 'Power state', 'Trạng thái nguồn', 'device', SRC.griffyn, { en: '(PWR!001 "On")', vi: '(PWR!001 "On")' }),
  s('christie', '(PWR 1) / (PWR 0)', 'Power on / off', 'Bật / tắt nguồn', 'doc', SRC.christie),
  s('christie', '(PWR+STBM 0|1)', 'Standby mode (0.5 W / communication)', 'Chế độ chờ (0,5 W / giao tiếp)', 'doc', SRC.christie),
  q('christie', '(SHU?)', 'Shutter', 'Shutter', 'device', SRC.griffyn, { en: '0 = open, 1 = closed', vi: '0 = mở, 1 = đóng' }),
  s('christie', '(SHU 0) / (SHU 1)', 'Open / close shutter', 'Mở / đóng shutter', 'doc', SRC.christie),
  q('christie', '(SIN?)', 'Current input', 'Input hiện tại', 'device', SRC.griffyn, { en: '(SIN!001 "One-Port HDMI0")', vi: '(SIN!001 "One-Port HDMI0")' }),
  q('christie', '(CHA?)', 'Current channel', 'Kênh hiện tại', 'device', SRC.griffyn),
  s('christie', '(SIN+MAIN n)', 'Select input', 'Chọn input', 'unverified', SRC.christie, { en: 'Numbers in the 4K7-HS manual (3 = HDMI 1…) differ from the Griffyn — do not use before checking.', vi: 'Số input trong tài liệu 4K7-HS (3 = HDMI 1…) khác Griffyn — chưa dùng khi chưa kiểm.' }),
  q('christie', '(OSD?)', 'On-screen display state', 'Trạng thái OSD', 'device', SRC.griffyn),
  s('christie', '(OSD 1) / (OSD 0)', 'Show / hide OSD', 'Hiện / ẩn OSD', 'doc', SRC.christie, { en: 'Used by the OSD buttons.', vi: 'Dùng cho nút OSD.' }),
  q('christie', '(ITP?)', 'Test pattern state', 'Trạng thái test pattern', 'device', SRC.griffyn, { en: '(ITP!000 "Off")', vi: '(ITP!000 "Off")' }),
  s('christie', '(ITP n)', 'Test pattern', 'Test pattern', 'doc', SRC.christie, { en: '0 off · 1 grid · 2 white · 3 black · 4 checkerboard · 5 colour bars · 6 red · 7 green · 8 blue · 9 yellow · 10 magenta · 11 cyan · 12 boresight · 13 full screen. Numbers not yet checked on the Griffyn.', vi: '0 tắt · 1 lưới · 2 trắng · 3 đen · 4 ô cờ · 5 thanh màu · 6 đỏ · 7 xanh lá · 8 xanh dương · 9 vàng · 10 tím · 11 lục lam · 12 boresight · 13 toàn màn hình. Chưa kiểm số này trên Griffyn.' }),
  q('christie', '(LHO?) (LVO?) (ZOM?) (FCS?)', 'Lens position: shift H, shift V, zoom, focus', 'Vị trí lens: shift ngang, shift dọc, zoom, focus', 'device', SRC.griffyn, { en: 'Read-only: -3, -604, -50, 273 on the test unit.', vi: 'Chỉ đọc: -3, -604, -50, 273 trên máy thử.' }),
  s('christie', '(LHO n) (LVO n) (ZOM n) (FCS n)', 'Move lens axis', 'Di chuyển từng trục lens', 'unverified', SRC.christie, { en: 'Moves the lens. Not sent by MikMaster; test next to the projector.', vi: 'Làm ống kính chuyển động. MikMaster chưa gửi; thử khi đứng cạnh máy.' }),
  s('christie', '(LCB+HOME 1)', 'Move lens to centre (home)', 'Đưa lens về giữa', 'doc', `${SRC.christie}; ${SRC.griffynWeb}`),
  q('christie', '(LCB+LOCK?)', 'Lens motors locked', 'Khoá động cơ lens', 'device', SRC.griffyn),
  s('christie', '(LCB+LOCK 0|1)', 'Lock lens motors', 'Khoá động cơ lens', 'doc', SRC.christie),
  s('christie', '(LMA n) / (LMS n)', 'Lens memory: apply / save (slots 0–4)', 'Bộ nhớ lens: nạp / lưu (ô 0–4)', 'unverified', SRC.christie, { en: 'Not confirmed on the Griffyn ((LMS?) answered "Control Not Found").', vi: 'Chưa xác nhận trên Griffyn ((LMS?) trả "Control Not Found").' }),
  s('christie', '(KEY n)', 'Emulate a remote / keypad key', 'Giả lập một phím điều khiển', 'unverified', SRC.christie, { en: 'Key numbers are not listed in the manual text I could read.', vi: 'Bảng số phím không có trong phần tài liệu đọc được.' }),
  q('christie', '(SST+TEMP?)', 'Temperatures (all sensors)', 'Nhiệt độ (mọi cảm biến)', 'device', SRC.griffyn, { en: 'Multi-frame reply; intake temperature is the main value.', vi: 'Trả nhiều khung; nhiệt độ khí vào là giá trị chính.' }),
  q('christie', '(SST+LGHT?)', 'Light source: laser hours, cycles, faults', 'Nguồn sáng: giờ laser, số lần bật, lỗi', 'device', SRC.griffyn),
  q('christie', '(SST+SYST?)', 'System status and projector hours', 'Trạng thái hệ thống và giờ máy', 'device', SRC.griffyn),
  q('christie', '(SST+SIGN?)', 'Signal status per port', 'Trạng thái tín hiệu từng cổng', 'device', SRC.griffyn),
  q('christie', '(SST+CONF?) (SST+VERS?)', 'Model, serial, versions', 'Model, serial, phiên bản', 'device', SRC.griffyn),
  q('christie', '(ILI?)', 'Light source info', 'Thông tin nguồn sáng', 'doc', SRC.christie),
  q('christie', '(LPP?) (LOP?) (BRT?) (CON?)', 'Brightness / constant power', 'Độ sáng / công suất không đổi', 'device', SRC.griffyn, { en: 'The Griffyn answers "Control Not Found" for all of these.', vi: 'Griffyn trả "Control Not Found" cho tất cả.' }),
  q('christie', 'POST /cgi-bin/c4jweb/ session:connect → video:getInputInfo → GET /cgi-bin/thumbnail…', 'Live preview (projector web, needs the web account)', 'Hình trực tiếp (web của máy, cần tài khoản web)', 'device', SRC.griffynWeb, { en: 'Used by the live thumbnail.', vi: 'Dùng cho thumbnail trực tiếp.' }),

  // ───────── Panasonic NTCONTROL (cổng 1024) — RQ35K dùng PJLink; phần dưới là NTCONTROL
  q('panasonic', 'WebSocket ws://<ip>:8080 · sub-protocol pj-cast-protocol · send "start"', 'Live preview (Remote preview): JPEG 480×304, ~5 frames/s, no login', 'Hình trực tiếp (Remote preview): JPEG 480×304, ~5 khung/giây, không cần đăng nhập', 'device', 'PT-RQ35K web control (preview.cgi source) · tested on 192.168.1.176', { en: 'Strings from the projector: BLANK, HDCP, SIGNAL, REFRESH. "preshow:1/0" (Pre-Show mode) is a setting and is never sent by MikMaster.', vi: 'Chuỗi máy gửi về: BLANK, HDCP, SIGNAL, REFRESH. "preshow:1/0" (Pre-Show) là cài đặt nên MikMaster không bao giờ gửi.' }),
  s('panasonic', 'PON / POF', 'Power on / off', 'Bật / tắt nguồn', 'unverified', SRC.panaNotes, { en: 'The RQ35K port asks for a login (Command protect), so not tested.', vi: 'Cổng RQ35K đòi đăng nhập (Command protect) nên chưa thử.' }),
  q('panasonic', 'QPW', 'Power state', 'Trạng thái nguồn', 'unverified', SRC.panaNotes),
  q('panasonic', 'QVX:POWI1 · Q$S', 'Power state (detail) / lamp status', 'Trạng thái nguồn (chi tiết) / đèn', 'doc', SRC.rez, { en: 'POWI1: +1 off, +2 turning on, +3 on, +4 cooling (REZ series).', vi: 'POWI1: +1 tắt, +2 đang bật, +3 bật, +4 làm nguội (dòng REZ).' }),
  s('panasonic', 'OSH:1 / OSH:0', 'Shutter close / open', 'Đóng / mở shutter', 'doc', SRC.rez, { en: 'Query: QSH.', vi: 'Hỏi: QSH.' }),
  s('panasonic', 'IIS:HD1 …', 'Select input', 'Chọn input', 'unverified', SRC.panaNotes, { en: 'Query: QIN.', vi: 'Hỏi: QIN.' }),
  q('panasonic', 'QID · QSN', 'Model / serial', 'Model / serial', 'unverified', SRC.panaNotes),
  s('panasonic', 'OMN OEN OCU OCD OCL OCR', 'OSD menu keys: menu, enter, up, down, left, right', 'Phím menu OSD: menu, enter, lên, xuống, trái, phải', 'unverified', SRC.panaNotes, { en: 'Not listed in the REZ manual.', vi: 'Không có trong tài liệu REZ.' }),
  q('panasonic', 'QTM:0 · QTM:1 · QTM:2 · QTM:11 · QTM:12', 'Temperature: intake, exhaust, optics, light 1, light 2', 'Nhiệt độ: khí vào, khí thoát, bộ quang, nguồn sáng 1, 2', 'doc', SRC.rez, { en: 'REZ series; RQ35K unconfirmed.', vi: 'Dòng REZ; RQ35K chưa xác nhận.' }),
  q('panasonic', 'QVX:RTMS1 · Q$L:1 · QVX:LRTS3=00 · QVX:CRTS1', 'Runtime: projector, lamp 1, light 1, consolidated', 'Giờ chạy: máy, đèn 1, nguồn sáng 1, tổng hợp', 'doc', SRC.rez),
  q('panasonic', 'QVX:LNSI7 · LNSI8 · LNSI9 · LNSIA · LNSIE', 'Lens position: shift H, shift V, focus, zoom, periphery focus', 'Vị trí lens: shift ngang, dọc, focus, zoom, focus ngoại vi', 'doc', SRC.rez),
  s('panasonic', 'VXX:LNSI7…LNSIA=*value · VXX:LNSSD=*H*V*F*Z', 'Move lens (single axis / several axes)', 'Di chuyển lens (từng trục / nhiều trục)', 'doc', SRC.rez, { en: '`*` is a numeric placeholder. Moves the lens; test next to the projector.', vi: '`*` là chỗ điền số. Làm ống kính chuyển động; thử khi đứng cạnh máy.' }),
  s('panasonic', 'VXX:LNSI1=+00001 · VXX:LNSI0=+00001', 'Lens home / lens calibration', 'Lens về gốc / hiệu chuẩn lens', 'doc', SRC.rez),
  s('panasonic', 'VXX:LNMI1|2|3=+0000n', 'Lens memory 1–10 (load / save / …)', 'Bộ nhớ lens 1–10 (nạp / lưu / …)', 'unverified', SRC.rez, { en: 'Which of LNMI1/2/3 loads and which saves is unresolved.', vi: 'Chưa xác định LNMI1/2/3 cái nào nạp, cái nào lưu.' }),
  s('panasonic', 'OTS:xx · QTS', 'Test pattern (set / query)', 'Test pattern (đặt / hỏi)', 'doc', SRC.rq35k, { en: 'RQ35K2 codes: 00 off · 01 white · 02 black · 05 window · 06 reversed window · 07 cross hatch · 08 colour bar · 32/33/34 focus · 78 focus. MikMaster maps white, black, crosshatch / grid, colour bars and focus; QTS is read every 10 s. Not yet checked on a real unit (needs the login).', vi: 'Mã RQ35K2: 00 tắt · 01 trắng · 02 đen · 05 cửa sổ · 06 cửa sổ đảo · 07 cross hatch · 08 color bar · 32/33/34 focus · 78 focus. MikMaster ánh xạ: trắng, đen, crosshatch / grid, color bars, focus; QTS đọc mỗi 10 giây. Chưa kiểm trên máy thật (cần đăng nhập).' }),
  s('panasonic', 'VXX:LOPI2=+nnnnn · QVX:LOPI2', 'Brightness = light output (50–1000)', 'Độ sáng = LIGHT OUTPUT (50–1000)', 'doc', SRC.rq35k, { en: 'MikMaster uses % = value / 10, clamped to 5–100 %. The table lists the minimum as 8 %, so the exact mapping is not confirmed. Read every 10 s.', vi: 'MikMaster dùng % = giá trị / 10, kẹp trong 5–100 %. Bảng lệnh ghi mức nhỏ nhất là 8 % nên cách quy đổi chưa được xác nhận. Đọc mỗi 10 giây.' }),
  s('panasonic', 'VXX:WMDI0=+00000|1 · MOD:n · VXX:MMDI1=+0000n', 'OSD settings: warning message, colour, menu mode', 'Thiết lập OSD: cảnh báo, màu, kiểu menu', 'doc', SRC.rez, { en: 'Which row WMDI0 belongs to is unclear in the extracted text.', vi: 'Chưa rõ WMDI0 thuộc dòng nào trong bản trích.' }),

  // ───────── Barco Pulse (JSON-RPC, cổng 9090)
  s('barco', 'system.poweron / system.poweroff', 'Power on / off', 'Bật / tắt nguồn', 'unverified', SRC.barco),
  q('barco', 'property.get {"property":"system.state"}', 'System state', 'Trạng thái hệ thống', 'unverified', SRC.barco, { en: 'on, conditioning (warm-up), deconditioning (cooling), standby, ready, eco, boot, error', vi: 'on, conditioning (khởi động), deconditioning (làm nguội), standby, ready, eco, boot, error' }),
  s('barco', 'property.set {"property":"optics.shutter.target","value":"Closed|Open"}', 'Shutter', 'Shutter', 'unverified', SRC.barco),
  q('barco', 'introspect', 'List the projector\'s properties and commands', 'Liệt kê thuộc tính và lệnh của máy', 'unverified', SRC.barco, { en: 'Use it on a real unit to find temperature, hours, lens and test pattern properties.', vi: 'Dùng trên máy thật để tìm thuộc tính nhiệt độ, giờ, lens, test pattern.' }),
]

/** Lệnh có sẵn của driver cho từng chức năng sửa được — hiện làm gợi ý (placeholder) trong ô sửa. */
export const DEFAULT_COMMANDS: Record<CommandBrand, CommandTemplates> = {
  pjlink: { powerOn: '%1POWR 1', powerOff: '%1POWR 0', shutterClose: '%1AVMT 11', shutterOpen: '%1AVMT 10', lampHoursQuery: '%1LAMP ?' },
  panasonic: { powerOn: 'PON', powerOff: 'POF', shutterClose: 'OSH:1', shutterOpen: 'OSH:0' },
  christie: {
    powerOn: '(PWR 1)', powerOff: '(PWR 0)', shutterClose: '(SHU 1)', shutterOpen: '(SHU 0)',
    testPatternOn: '(ITP 1)', testPatternOff: '(ITP 0)', temperatureQuery: '(SST+TEMP?)', temperatureRegex: '(\\d+) °C',
  },
  barco: { powerOn: 'system.poweron', powerOff: 'system.poweroff', shutterClose: 'property.set {"property":"optics.shutter.target","value":"Closed"}', shutterOpen: 'property.set {"property":"optics.shutter.target","value":"Open"}' },
}
