import { uploadAsync, FileSystemUploadType } from 'expo-file-system';
import { config } from './appwrite';

export const uploadFileDirectly = async (uri: string) => {
    try {
        console.log("🚀 [Native Upload] Đang bắt đầu upload:", uri);

        // 1. Kiểm tra Config
        if (!config.endpoint || !config.storageId || !config.projectId) {
            throw new Error("Thiếu config Appwrite (Endpoint/StorageID/ProjectID)");
        }

        // 2. Chuẩn bị URL
        const uploadUrl = `${config.endpoint}/storage/buckets/${config.storageId}/files`;

        // 3. Upload bằng Native (Sử dụng uploadAsync trực tiếp)
        const response = await uploadAsync(uploadUrl, uri, {
            fieldName: 'file',
            httpMethod: 'POST',
            // --- SỬA LỖI TẠI ĐÂY: Dùng trực tiếp Enum đã import ---
            uploadType: FileSystemUploadType.MULTIPART,
            // -----------------------------------------------------
            headers: {
                'X-Appwrite-Project': config.projectId,
            },
            parameters: {
                fileId: 'unique()',
            }
        });

        // 4. Xử lý kết quả
        console.log("📥 [Native Upload] Status:", response.status);

        if (response.status !== 201) {
            throw new Error(`Upload thất bại (HTTP ${response.status}): ${response.body}`);
        }

        const json = JSON.parse(response.body);
        console.log("✅ [Native Upload] Thành công! File ID:", json.$id);

        // Trả về URL xem ảnh
        return `${config.endpoint}/storage/buckets/${config.storageId}/files/${json.$id}/view?project=${config.projectId}`;

    } catch (error: any) {
        console.error("❌ [Native Upload] Lỗi:", error);
        throw error;
    }
};