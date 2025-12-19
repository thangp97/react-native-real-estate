// hooks/useChatRoom.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { client, databases, config } from '@/lib/appwrite';
import { Query, ID } from 'react-native-appwrite';
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadFileDirectly } from '@/lib/uploader'; // Đảm bảo đã import hàm này

export const useChatRoom = (chatId: string, currentUserId: string, receiverId: string) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const retryQueue = useRef<any[]>([]);

    // --- HÀM PHỤ: LƯU CACHE (Async) ---
    const updateCache = async (newMsgs: any[]) => {
        try {
            await AsyncStorage.setItem(`chat_${chatId}`, JSON.stringify(newMsgs.slice(0, 50)));
        } catch (e) {
            console.error("Lỗi lưu cache:", e);
        }
    };

    // --- 1. LOAD CACHE (OFFLINE-FIRST) ---
    useEffect(() => {
        const loadFromCache = async () => {
            try {
                const cached = await AsyncStorage.getItem(`chat_${chatId}`);
                if (cached) {
                    setMessages(JSON.parse(cached));
                }
            } catch (e) {
                console.error("Lỗi đọc cache:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadFromCache();
    }, [chatId]);

    // --- 2. SYNC SERVER & REALTIME ---
    useEffect(() => {
        const fetchServer = async () => {
            try {
                console.log("🚀 Đang tải tin nhắn từ Server cho ChatID:", chatId);

                const res = await databases.listDocuments(
                    config.databaseId!,
                    config.messagesCollectionId!,
                    [
                        Query.equal('chatId', chatId),
                        Query.orderDesc('$createdAt'),
                        Query.limit(50)
                    ]
                );

                console.log("✅ Đã tải được:", res.documents.length, "tin nhắn");

                const mapMsgs = res.documents.map(doc => ({
                    _id: doc.$id,
                    text: doc.content,
                    createdAt: doc.$createdAt,
                    user: { _id: doc.senderId },
                    image: doc.imageUrl,
                    status: doc.status || 'sent'
                }));

                setMessages(mapMsgs);
                await updateCache(mapMsgs);

            } catch (e: any) {
                console.error("❌ LỖI TẢI TIN NHẮN:", e);
                if (e.message) console.error("Chi tiết:", e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchServer();

        // REALTIME SUBSCRIPTION
        const sub = client.subscribe(
            `databases.${config.databaseId}.collections.${config.messagesCollectionId}.documents`,
            (response: any) => {
                if (response.events.includes('databases.*.collections.*.documents.create')) {
                    const payload = response.payload;
                    if (payload.chatId === chatId && payload.senderId !== currentUserId) {
                        setMessages(prev => {
                            const updated = [{
                                _id: payload.$id,
                                text: payload.content,
                                createdAt: payload.$createdAt,
                                user: { _id: payload.senderId },
                                image: payload.imageUrl,
                                status: 'sent'
                            }, ...prev];

                            updateCache(updated);
                            return updated;
                        });
                    }
                }
            }
        );
        return () => sub();
    }, [chatId]);

    // --- 3. AUTO-RETRY KHI CÓ MẠNG ---
    useEffect(() => {
        const unsub = NetInfo.addEventListener(state => {
            if (state.isConnected && retryQueue.current.length > 0) {
                console.log("Đã có mạng! Đang gửi lại tin nhắn lỗi...");
                retryQueue.current.forEach(msg => processSendMessage(msg.text, msg.imageUri, msg.tempId));
                retryQueue.current = [];
            }
        });
        return () => unsub();
    }, []);

    // --- 4. CORE SEND LOGIC (Dùng uploadFileDirectly) ---
    const processSendMessage = async (text: string, imageUri: string | undefined, tempId: string) => {
        try {
            let finalImageUrl = null;

            // --- A. UPLOAD ẢNH (LOGIC MỚI - SIÊU GỌN) ---
            if (imageUri && !imageUri.startsWith('http')) {
                // Nén ảnh trước
                const manip = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                // GỌI HÀM NATIVE UPLOAD (Đã tạo ở lib/uploader.ts)
                finalImageUrl = await uploadFileDirectly(manip.uri);
            } else if (imageUri) {
                finalImageUrl = imageUri;
            }

            // --- B. LƯU DATABASE ---
            const payload = {
                chatId,
                senderId: currentUserId,
                receiverId,
                content: text,
                type: imageUri ? 'image' : 'text',
                imageUrl: finalImageUrl,
                status: 'sent'
            };

            await databases.createDocument(
                config.databaseId!, config.messagesCollectionId!, ID.unique(), payload
            );

            // --- C. UPDATE CHAT METADATA ---
            await databases.updateDocument(
                config.databaseId!, config.chatsCollectionId!, chatId,
                {
                    lastMessage: imageUri ? '[Hình ảnh]' : text,
                    lastMessageAt: new Date().toISOString()
                }
            );

            // --- D. UPDATE UI (SUCCESS) ---
            setMessages(prev => {
                const updated = prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m);
                updateCache(updated);
                return updated;
            });

        } catch (error: any) {
            console.error("❌ GỬI LỖI:", error);
            retryQueue.current.push({ text, imageUri, tempId });
            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'error' } : m));
        }
    };

    // --- 5. PUBLIC FUNCTION (Gọi từ UI) ---
    const sendMessage = useCallback((text: string, imageUri?: string) => {
        const tempId = ID.unique();
        const now = new Date().toISOString();

        // Optimistic UI: Hiện tin ngay lập tức
        const optimisticMsg = {
            _id: tempId, text, createdAt: now,
            user: { _id: currentUserId }, image: imageUri, status: 'sending',
        };

        setMessages(prev => {
            const updated = [optimisticMsg, ...prev];
            updateCache(updated);
            return updated;
        });

        // Gọi hàm xử lý ngầm
        processSendMessage(text, imageUri, tempId);
    }, [chatId, currentUserId, receiverId]);

    // Return kết quả ra ngoài để Component dùng
    return { messages, isLoading, sendMessage };
};
