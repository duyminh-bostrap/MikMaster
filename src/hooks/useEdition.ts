import { useLicense } from '@/services/license'
import { useGateway } from '@/store/useGateway'

/**
 * Bản đang dùng: `free` = chưa có license hợp lệ (chỉ bật / tắt máy và shutter); `pro` = đã mở khoá preview, chỉnh thông số…
 * Chưa có gateway (mô phỏng) hoặc chưa đọc được trạng thái: không phải bản nào (cả hai false) → không khoá gì phía giao diện;
 * gateway vẫn là bên áp quyền thật (402).
 */
export function useEdition(): { free: boolean; pro: boolean } {
  const { gateway } = useGateway()
  const edition = useLicense(gateway)?.edition
  return { free: gateway !== null && edition === 'free', pro: gateway !== null && edition === 'pro' }
}
