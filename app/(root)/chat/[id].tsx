import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity, Image,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert // Thêm Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalContext } from '@/lib/global-provider';
import { getMessages, sendMessage } from '@/lib/api/chat';
import { client, config, databases } from '@/lib/appwrite'; // Import databases

const ChatRoomScreen = () => {
    // Lấy params từ màn hình trước
    const { id: chatId, otherUserId, otherUserName, otherUserAvatar } = useLocalSearchParams<{
        id: string, otherUserId?: string, otherUserName?: string, otherUserAvatar?: string
    }>();

    const { user } = useGlobalContext();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);

    // --- STATE MỚI: Lưu ID người nhận (đảm bảo luôn có) ---
    const [receiverId, setReceiverId] = useState<string | null>(otherUserId || null);

    const flatListRef = useRef<FlatList>(null);

    // 1. Logic lấy Receiver ID (Nếu bị thiếu từ params)
    useEffect(() => {
        const fetchChatDetails = async () => {
            // Nếu đã có ID người nhận từ params rồi thì thôi, không cần fetch lại
            if (receiverId) return;
            if (!chatId || !user) return;

            try {
                // Gọi API lấy thông tin cuộc hội thoại này
                const chatDoc = await databases.getDocument(
                    config.databaseId!,
                    config.chatsCollectionId!,
                    chatId
                );

                // Tìm ID người kia trong mảng participants
                // Logic: Người kia = Người trong danh sách KHÔNG PHẢI là tôi
                const participants = chatDoc.participants as string[];
                const foundReceiverId = participants.find(p => p !== user.$id);

                if (foundReceiverId) {
                    console.log("--> Đã tìm thấy Receiver ID từ Database:", foundReceiverId);
                    setReceiverId(foundReceiverId);
                } else {
                    console.error("--> Lỗi: Không tìm thấy người nhận trong đoạn chat này.");
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin Chat:", error);
            }
        };

        fetchChatDetails();
    }, [chatId, user, receiverId]);


    // 2. Tải tin nhắn cũ & Kết nối Realtime
    useEffect(() => {
        if (!chatId) return;

        const loadMessages = async () => {
            const data = await getMessages(chatId);
            setMessages(data);
            setLoading(false);
        };
        loadMessages();

        const unsubscribe = client.subscribe(
            `databases.${config.databaseId}.collections.${config.messagesCollectionId}.documents`,
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    const newMessage = response.payload as any;
                    if (newMessage.chatId === chatId) {
                        setMessages(prev => [newMessage, ...prev]);
                    }
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, [chatId]);

    // 3. Hàm gửi tin nhắn (Đã sửa lỗi)
    const handleSend = async () => {
        if (!inputText.trim()) return;

        if (!user) {
            Alert.alert("Lỗi", "Vui lòng đăng nhập lại.");
            return;
        }

        // --- KIỂM TRA QUAN TRỌNG ---
        if (!receiverId) {
            Alert.alert("Lỗi", "Đang kết nối... Vui lòng đợi giây lát rồi thử lại.");
            // Có thể gọi lại hàm fetchChatDetails ở đây nếu cần thiết
            return;
        }

        const content = inputText.trim();
        setInputText(''); // Xóa input ngay cho mượt

        try {
            // Dùng receiverId (State) thay vì otherUserId (Params)
            await sendMessage(chatId, user.$id, receiverId, content);
        } catch (error: any) {
            console.error("Gửi lỗi:", error);
            Alert.alert("Gửi thất bại", error.message);
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMyMessage = item.senderId === user?.$id;

        return (
            <View className={`flex-row mb-3 px-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                {!isMyMessage && (
                    <Image
                        source={{ uri: otherUserAvatar || 'https://via.placeholder.com/40' }}
                        className="w-8 h-8 rounded-full mr-2 self-end"
                    />
                )}
                <View
                    className={`px-4 py-3 rounded-2xl max-w-[75%] ${
                        isMyMessage
                        ? 'bg-blue-600 rounded-tr-none'
                        : 'bg-gray-100 rounded-tl-none'
                    }`}
                >
                    <Text className={`${isMyMessage ? 'text-white' : 'text-gray-800'} text-base`}>
                        {item.content}
                    </Text>
                    <Text className={`text-[10px] mt-1 text-right ${isMyMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(item.$createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Image
                    source={{ uri: otherUserAvatar || 'https://via.placeholder.com/40' }}
                    className="w-10 h-10 rounded-full bg-gray-200"
                />
                <Text className="text-lg font-bold text-gray-800 ml-3">{otherUserName || 'Người dùng'}</Text>
            </View>

            {/* Message List */}
            {loading ? (
                <ActivityIndicator className="flex-1" size="large" color="#0061FF" />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.$id}
                    renderItem={renderMessage}
                    inverted
                    contentContainerStyle={{ paddingVertical: 10 }}
                />
            )}

            {/* Input Bar */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={10}
            >
                <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-white">
                    <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-base mr-3"
                        multiline
                    />

                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        className={`w-10 h-10 rounded-full justify-center items-center ${
                            inputText.trim() ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                    >
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatRoomScreen;