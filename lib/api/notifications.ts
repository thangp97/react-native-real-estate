import { ID, Query } from "react-native-appwrite";
import { config, databases } from "../appwrite";

export type NotificationType = 
    | 'booking_created'           // Người mua đặt lịch
    | 'booking_confirmed'         // Chấp nhận lịch hẹn
    | 'booking_rejected'          // Từ chối lịch hẹn
    | 'property_status_updated'   // Cập nhật trạng thái bài đăng
    | 'credits_topup'             // Nạp điểm
    | 'broker_assigned'           // Môi giới tiếp nhận bài đăng
    | 'property_available'        // Bài đăng mới cho môi giới
    | 'new_message';              // Tin nhắn mới

export interface CreateNotificationParams {
    userId: string;
    message: string;
    type: NotificationType;
    relatedPropertyId?: string;
    relatedChatId?: string;
}

/**
 * Tạo thông báo mới
 */
export async function createNotification({ 
    userId, 
    message, 
    type,
    relatedPropertyId,
    relatedChatId
}: CreateNotificationParams) {
    try {
        const notification = await databases.createDocument(
            config.databaseId!,
            config.notificationsCollectionId!,
            ID.unique(),
            {
                userId,
                message,
                type,
                isRead: false,
                relatedPropertyId: relatedPropertyId || null,
                relatedChatId: relatedChatId || null,
            }
        );
        return notification;
    } catch (error) {
        console.error("Lỗi tạo thông báo:", error);
        throw error;
    }
}

/**
 * Lấy danh sách thông báo của user
 */
export async function getUserNotifications(userId: string) {
    // Validate userId - phải là string không rỗng và hợp lệ
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return [];
    }
    
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.notificationsCollectionId!,
            [
                Query.equal('userId', userId.trim()),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]
        );

        // Lọc bỏ các thông báo liên quan đến property đã bị xóa
        const validNotifications = await Promise.all(
            result.documents.map(async (notification) => {
                // Nếu thông báo không có relatedPropertyId, giữ lại
                if (!notification.relatedPropertyId) {
                    return notification;
                }

                // Kiểm tra xem property có tồn tại không
                try {
                    await databases.getDocument(
                        config.databaseId!,
                        config.propertiesCollectionId!,
                        notification.relatedPropertyId
                    );
                    // Property tồn tại, giữ lại thông báo
                    return notification;
                } catch {
                    // Property không tồn tại (đã bị xóa), loại bỏ thông báo
                    // Xóa thông báo khỏi database
                    try {
                        await databases.deleteDocument(
                            config.databaseId!,
                            config.notificationsCollectionId!,
                            notification.$id
                        );
                    } catch {
                        // Ignore delete errors
                    }
                    return null;
                }
            })
        );

        // Lọc bỏ các null (thông báo đã bị loại bỏ)
        return validNotifications.filter((notification) => notification !== null);
    } catch (error) {
        console.error("Lỗi lấy thông báo:", error);
        return [];
    }
}

/**
 * Đánh dấu thông báo là đã đọc
 */
export async function markNotificationAsRead(notificationId: string) {
    try {
        return await databases.updateDocument(
            config.databaseId!,
            config.notificationsCollectionId!,
            notificationId,
            { isRead: true }
        );
    } catch (error) {
        console.error("Lỗi đánh dấu đã đọc:", error);
        throw error;
    }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllNotificationsAsRead(userId: string) {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error("User ID không hợp lệ");
    }
    
    try {
        // Lấy tất cả thông báo chưa đọc
        const result = await databases.listDocuments(
            config.databaseId!,
            config.notificationsCollectionId!,
            [
                Query.equal('userId', userId.trim()),
                Query.equal('isRead', false)
            ]
        );

        // Cập nhật từng thông báo
        const updatePromises = result.documents.map(doc =>
            databases.updateDocument(
                config.databaseId!,
                config.notificationsCollectionId!,
                doc.$id,
                { isRead: true }
            )
        );

        await Promise.all(updatePromises);
        return true;
    } catch (error) {
        console.error("Lỗi đánh dấu tất cả đã đọc:", error);
        throw error;
    }
}

/**
 * Đếm số thông báo chưa đọc
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    // Validate userId - phải là string không rỗng và hợp lệ
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return 0;
    }
    
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.notificationsCollectionId!,
            [
                Query.equal('userId', userId.trim()),
                Query.equal('isRead', false)
            ]
        );
        return result.total;
    } catch (error) {
        console.error("Lỗi đếm thông báo chưa đọc:", error);
        return 0;
    }
}

/**
 * Xóa thông báo
 */
export async function deleteNotification(notificationId: string) {
    try {
        await databases.deleteDocument(
            config.databaseId!,
            config.notificationsCollectionId!,
            notificationId
        );
        return true;
    } catch (error) {
        console.error("Lỗi xóa thông báo:", error);
        throw error;
    }
}

