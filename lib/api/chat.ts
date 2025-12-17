import { config, databases } from "@/lib/appwrite";
import { ID, Query } from "react-native-appwrite";

// 1. Khởi tạo hoặc Lấy Chat ID giữa 2 người
export async function getOrCreateChat(currentUserId: string, otherUserId: string) {
    try {
        // Tìm xem đã có cuộc trò chuyện nào chứa mình chưa
        const result = await databases.listDocuments(
            config.databaseId!,
            config.chatsCollectionId!,
            [
                Query.search('participants', currentUserId), // Tìm chat có chứa ID mình
            ]
        );

        // Lọc thủ công để tìm chính xác chat có chứa người kia (otherUserId)
        const existingChat = result.documents.find(doc =>
            doc.participants.includes(otherUserId)
        );

        if (existingChat) {
            return existingChat;
        }

        // Nếu chưa có, tạo mới cuộc trò chuyện
        const newChat = await databases.createDocument(
            config.databaseId!,
            config.chatsCollectionId!,
            ID.unique(),
            {
                participants: [currentUserId, otherUserId],
                lastMessage: 'Bắt đầu cuộc trò chuyện',
                lastMessageAt: new Date().toISOString()
            }
        );
        return newChat;

    } catch (error) {
        console.error("Lỗi tạo chat:", error);
        throw error;
    }
}

// 2. Lấy danh sách tin nhắn của 1 chat
export async function getMessages(chatId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.messagesCollectionId!,
            [
                Query.equal('chatId', chatId),
                Query.orderDesc('$createdAt') // Tin mới nhất lên đầu
            ]
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy tin nhắn:", error);
        return [];
    }
}

// 3. Gửi tin nhắn
export async function sendMessage(chatId: string, senderId: string, receiverId: string, content: string, type: 'text' | 'image' = 'text', senderName?: string) {
    try {
        // A. Tạo tin nhắn trong bảng messages
        const message = await databases.createDocument(
            config.databaseId!,
            config.messagesCollectionId!,
            ID.unique(),
            {
                chatId,
                senderId,
                receiverId,
                content,
                type
            }
        );

        // B. Cập nhật tin nhắn cuối cùng cho Chat Room (để hiển thị ở Inbox)
        await databases.updateDocument(
            config.databaseId!,
            config.chatsCollectionId!,
            chatId,
            {
                lastMessage: type === 'image' ? '[Hình ảnh]' : content,
                lastMessageAt: new Date().toISOString()
            }
        );

        // C. Tạo thông báo cho người nhận
        try {
            const { createNotification } = await import('./notifications');
            const messagePreview = type === 'image' 
                ? '📷 Đã gửi một hình ảnh' 
                : content.length > 50 
                    ? content.substring(0, 50) + '...' 
                    : content;
            
            await createNotification({
                userId: receiverId,
                message: `${senderName || 'Người dùng'}: ${messagePreview}`,
                type: 'new_message',
                relatedChatId: chatId
            });
            
            console.log('[sendMessage] ✅ Đã gửi thông báo tin nhắn cho:', receiverId);
        } catch (notifError) {
            console.error('[sendMessage] ⚠️ Không thể gửi thông báo:', notifError);
            // Không throw error để không ảnh hưởng đến việc gửi tin nhắn
        }

        return message;
    } catch (error) {
        console.error("Lỗi gửi tin:", error);
        throw error;
    }
}

async function getProfileById(profileId: string) {
    try {
        const profile = await databases.getDocument(
            config.databaseId!,
            config.profilesCollectionId!, // Đảm bảo ID này trỏ đến bảng 'profiles'
            profileId
        );
        return profile;
    } catch (e) {
        console.error("Lỗi: Không tìm thấy profile:", profileId);
        return { name: "Người dùng ẩn danh", avatar: null };
    }
}

// 4. Lấy danh sách các cuộc hội thoại của tôi (Inbox)
export async function getMyChats(userId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.chatsCollectionId!,
            [
                Query.search('participants', userId),
                Query.orderDesc('lastMessageAt')
            ]
        );

        // --- LOGIC LÀM GIÀU DỮ LIỆU (ENRICHING) ---
        const enrichedChats = await Promise.all(result.documents.map(async (chat) => {
            // Tìm ID người đối diện: Người trong danh sách KHÔNG PHẢI là tôi
            const otherUserId = chat.participants.find((id: string) => id !== userId);
            let otherUser = { name: 'Người dùng', avatar: null, $id: otherUserId }; // Fallback

            if (otherUserId) {
                try {
                    // Gọi hàm tìm Profile
                    const userDoc = await getProfileById(otherUserId);
                    if (userDoc) {
                       otherUser = userDoc as any;
                    }
                } catch(e) {
                    console.error("Lỗi lấy Profile trong getMyChats:", e);
                }
            }
            return { ...chat, otherUser };
        }));

        return enrichedChats;
    } catch (error) {
        console.error("Lỗi lấy inbox:", error);
        throw error; // Ném lỗi để UI xử lý (nếu có lỗi Permissions)
    }
}

// 5. Đánh dấu tất cả tin nhắn trong chat là đã đọc
export async function markChatMessagesAsRead(chatId: string, userId: string) {
    try {
        // Lấy tất cả tin nhắn chưa đọc trong chat mà người dùng hiện tại là người nhận
        const result = await databases.listDocuments(
            config.databaseId!,
            config.messagesCollectionId!,
            [
                Query.equal('chatId', chatId),
                Query.equal('receiverId', userId),
                Query.equal('isRead', false)
            ]
        );

        // Đánh dấu từng tin nhắn là đã đọc
        const updatePromises = result.documents.map(message =>
            databases.updateDocument(
                config.databaseId!,
                config.messagesCollectionId!,
                message.$id,
                { isRead: true }
            )
        );

        await Promise.all(updatePromises);
        console.log(`[markChatMessagesAsRead] Đã đánh dấu ${result.documents.length} tin nhắn là đã đọc`);
    } catch (error) {
        console.error("Lỗi đánh dấu tin nhắn đã đọc:", error);
        throw error;
    }
}