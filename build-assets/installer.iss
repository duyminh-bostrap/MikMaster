; Bộ cài Windows cho MikMaster (Inno Setup 6): MikMaster-Setup.exe
; Build (sau `pnpm build:exe` trên Windows):
;   iscc /DAppVersion=0.3.0 build-assets\installer.iss      → release\MikMaster-Setup.exe
;
; - Cài cho người dùng hiện tại, không cần quyền admin: %LOCALAPPDATA%\Programs\MikMaster
; - Start menu (+ Desktop tuỳ chọn), mở MikMaster khi cài xong, gỡ trong Settings → Apps
; - Cài bản mới đè bản cũ: tự tắt MikMaster đang chạy rồi thay file
; - Dữ liệu project (%APPDATA%\MikMaster) được giữ lại khi gỡ / cập nhật

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{8C8E2B7E-4B1A-4E2F-9D0A-6D5E7A1C2B3F}
AppName=MikMaster
AppVersion={#AppVersion}
AppVerName=MikMaster {#AppVersion}
AppPublisher=MikMaster
VersionInfoVersion={#AppVersion}
VersionInfoDescription=MikMaster Setup
DefaultDirName={localappdata}\Programs\MikMaster
DisableDirPage=auto
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\release
OutputBaseFilename=MikMaster-Setup
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\MikMaster.exe
UninstallDisplayName=MikMaster
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=force
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\release\MikMaster.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\MikMaster"; Filename: "{app}\MikMaster.exe"; Comment: "Control AV projectors"
Name: "{autodesktop}\MikMaster"; Filename: "{app}\MikMaster.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\MikMaster.exe"; Description: "{cm:LaunchProgram,MikMaster}"; Flags: nowait postinstall skipifsilent

[Code]
// Đang chạy thì tắt trước khi thay file / gỡ (MikMaster là app console, Restart Manager có thể không đóng được).
procedure StopRunningMikMaster();
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM MikMaster.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopRunningMikMaster();
  Result := '';
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    StopRunningMikMaster();
end;
