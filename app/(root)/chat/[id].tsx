import { getMessages, sendMessage } from '@/lib/api/chat';
import { client, config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    FlatList,
    Image,
    KeyboardAvoidingView, Platform,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; //

const ChatRoomScreen = () => {
    const { id: chatId, otherUserId, otherUserName, otherUserAvatar } = useLocalSearchParams<{
        id: string, otherUserId?: string, otherUserName?: string, otherUserAvatar?: string
    }>();

    const { user } = useGlobalContext();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [receiverId, setReceiverId] = useState<string | null>(otherUserId || null);

    const flatListRef = useRef<FlatList>(null);

    // ... (Giữ nguyên logic useEffect fetchChatDetails của bạn) ...
    useEffect(() => {
        const fetchChatDetails = async () => {
            if (receiverId) return;
            if (!chatId || !user) return;
            try {
                const chatDoc = await databases.getDocument(
                    config.databaseId!, config.chatsCollectionId!, chatId
                );
                const participants = chatDoc.participants as string[];
                const foundReceiverId = participants.find(p => p !== user.$id);
                if (foundReceiverId) setReceiverId(foundReceiverId);
            } catch (error) {
                console.error("Lỗi lấy thông tin Chat:", error);
            }
        };
        fetchChatDetails();
    }, [chatId, user, receiverId]);

    // ... (Giữ nguyên logic useEffect loadMessages & Realtime) ...
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
        return () => unsubscribe();
    }, [chatId]);

    // ... (Giữ nguyên logic handleSend) ...
    const handleSend = async () => {
        if (!inputText.trim()) return;
        if (!user) { Alert.alert("Lỗi", "Vui lòng đăng nhập lại."); return; }
        if (!receiverId) { Alert.alert("Lỗi", "Đang kết nối..."); return; }

        const content = inputText.trim();
        setInputText('');
        try {
            // Gửi tin nhắn kèm tên người gửi để tạo thông báo
            await sendMessage(chatId, user.$id, receiverId, content, 'text', user.name);
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
                <View className={`px-4 py-3 rounded-2xl max-w-[75%] ${
                        isMyMessage ? 'bg-blue-600 rounded-tr-none' : 'bg-gray-100 rounded-tl-none'
                    }`}>
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
        // THAY ĐỔI 1: Bỏ edges, để SafeAreaView lo full màn hình hoặc dùng View flex-1 + padding thủ công
        // Ở đây dùng flex-1 bg-white để làm nền
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>

            {/* Header: Giữ nguyên */}
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white z-10">
                    <TouchableOpacity onPress={() => router.replace('/dashboard-chat')} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                <Image
                    source={{ uri: otherUserAvatar || 'https://via.placeholder.com/40' }}
                    className="w-10 h-10 rounded-full bg-gray-200"
                />
                <Text className="text-lg font-bold text-gray-800 ml-3">{otherUserName || 'Người dùng'}</Text>
            </View>

            {/* THAY ĐỔI 2: KeyboardAvoidingView bọc cả FlatList và Input */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // Điều chỉnh nếu Header bị che (thường là 0 nếu header nằm trong SafeArea)
            >
                {/* Message List: Thêm flex-1 để chiếm hết khoảng trống còn lại */}
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
                        className="flex-1" // Quan trọng: Để list co giãn
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Input Bar */}
                <View className="px-4 py-2 border-t border-gray-100 bg-white pb-2">
                    <View className="flex-row items-center">
                        <TextInput
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-base mr-3 min-h-[45px] max-h-[100px]"
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
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatRoomScreen;