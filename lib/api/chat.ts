import { databases, config, client } from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";

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
export async function sendMessage(chatId: string, senderId: string, receiverId: string, content: string, type: 'text' | 'image' = 'text') {
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

export async function deleteChatById(chatId: string) {
    try {
        await databases.deleteDocument(
            config.databaseId!,
            config.chatsCollectionId!, // Giả định có collection chats
            chatId
        );
        // Có thể cần logic xóa tin nhắn liên quan nếu tin nhắn nằm trong collection riêng (Messages)
        return true;
    } catch (error) {
        console.error("API Error - Delete Chat:", error);
        throw error;
    }
}