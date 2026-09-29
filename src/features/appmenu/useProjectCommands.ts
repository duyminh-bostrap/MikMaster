import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { getDeviceCredentials, getSharedCredentials } from '@/services/credentialCache'
import { openProjectFile, saveProjectToFile } from '@/services/projectFile'
import { listSavedProjects, loadProject, saveProject, type ProjectSnapshot } from '@/services/projectRepository'
import { useIsDirty, useProjectActions, useProjectState } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import { countMissingLogins, fillMissingCredentials } from '@/utils/credentials'

/** Trạng thái truyền sang trang Start khi cần bước trung gian (tạo mới / đăng nhập sau khi mở file). */
export type StartIntent = { mode: 'new' } | { opened: ProjectSnapshot }

/** Các lệnh File dùng chung cho màn hình Start và menu logo: New / Open / Open Recent / Save / Export. */
export function useProjectCommands() {
  const navigate = useNavigate()
  const { gateway } = useGateway()
  const { project, booths, projectors } = useProjectState()
  const { launchProject, markSaved } = useProjectActions()
  const dirty = useIsDirty()
  const snapshot: ProjectSnapshot | null = project ? { project, booths, projectors } : null

  const launch = useCallback((s: ProjectSnapshot) => {
    launchProject(s)
    navigate('/project')
  }, [launchProject, navigate])

  const newProject = useCallback(() => navigate('/', { state: { mode: 'new' } satisfies StartIntent }), [navigate])

  /** Ném `ProjectFileError` nếu file không hợp lệ; `false` nếu người dùng huỷ. */
  const openFile = useCallback(async (): Promise<boolean> => {
    const opened = await openProjectFile()
    if (!opened) return false
    // Máy đã có mật khẩu trong phiên này thì khỏi hỏi lại; còn thiếu thì qua bước đăng nhập ở trang Start.
    const filled = { ...opened, projectors: fillMissingCredentials(opened.projectors, { device: getDeviceCredentials, shared: getSharedCredentials }) }
    if (countMissingLogins(filled.projectors) === 0) launch(filled)
    else navigate('/', { state: { opened: filled } satisfies StartIntent })
    return true
  }, [launch, navigate])

  const openRecent = useCallback(async (id: string) => {
    const s = await loadProject(id, gateway)
    if (s) launch(s)
    return !!s
  }, [gateway, launch])

  const listRecent = useCallback(() => listSavedProjects(gateway), [gateway])

  return {
    hasProject: snapshot !== null,
    currentId: project?.id ?? null,
    launch,
    newProject,
    openFile,
    openRecent,
    listRecent,
    dirty,
    projectName: project?.name ?? '',
    // Lưu (server/trình duyệt) hoặc xuất file thành công đều tính là đã lưu, như "Save As" của app desktop.
    save: async () => {
      const ok = snapshot ? await saveProject(snapshot, gateway) : false
      if (ok) markSaved()
      return ok
    },
    exportFile: async () => {
      const ok = snapshot ? await saveProjectToFile(snapshot) : false
      if (ok) markSaved()
      return ok
    },
  }
}
