import { deleteChatById, getMyChats } from '@/lib/api/chat'; // Đã import deleteChatById
import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList, Image,
    RefreshControl, StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hàm helper format thời gian
const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
};

const ChatListScreen = () => {
    const { user } = useGlobalContext();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // --- STATE MỚI CHO LOGIC XÓA ---
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchUnreadCounts = async (chatIds: string[]) => {
        if (!user) return;
        try {
            const counts: Record<string, number> = {};
            await Promise.all(
                chatIds.map(async (chatId) => {
                    try {
                        const result = await databases.listDocuments(
                            config.databaseId!,
                            config.messagesCollectionId!,
                            [
                                Query.equal('chatId', chatId),
                                Query.equal('receiverId', user.$id),
                                Query.equal('isRead', false)
                            ]
                        );
                        counts[chatId] = result.total;
                    } catch (error) {
                        console.error(`Error counting unread for chat ${chatId}:`, error);
                        counts[chatId] = 0;
                    }
                })
            );
            setUnreadCounts(counts);
        } catch (error) {
            console.error('Error fetching unread counts:', error);
        }
    };

    const fetchChats = async () => {
        if (!user) return;
        try {
            const data = await getMyChats(user.$id);
            setChats(data);
            // Fetch unread counts for all chats
            const chatIds = data.map((chat: any) => chat.$id);
            await fetchUnreadCounts(chatIds);
        } catch (error) {
            console.error("Fetch Chats Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchChats();
        }, [user])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchChats();
    };

    const filteredChats = useMemo(() => {
        if (!searchText) return chats;

        const lowerCaseSearch = searchText.toLowerCase();

        return chats.filter(chat => {
            const otherUserName = chat.otherUser?.name?.toLowerCase() || '';
            const lastMessage = chat.lastMessage?.toLowerCase() || '';

            return (
                otherUserName.includes(lowerCaseSearch) ||
                lastMessage.includes(lowerCaseSearch)
            );
        });
    }, [chats, searchText]);

    // --- HÀM XỬ LÝ NHẤN GIỮ (XÓA) ---
    const handleDeleteChat = (chatId: string, otherUserName: string) => {
        Alert.alert(
            "Xác nhận xóa",
            `Bạn có chắc chắn muốn xóa cuộc trò chuyện với ${otherUserName} không? Hành động này không thể hoàn tác.`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingId(chatId);
                        try {
                            // Gọi API xóa chat
                            await deleteChatById(chatId);

                            // Cập nhật State: Lọc bỏ chat đã xóa
                            setChats(prevChats => prevChats.filter(chat => chat.$id !== chatId));
                            Alert.alert("Thành công", "Đã xóa cuộc trò chuyện.");

                        } catch (error) {
                            console.error("DELETE CHAT ERROR:", error);
                            Alert.alert("Lỗi", "Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };


    // --- RENDER ITEM (ĐÃ CHỈNH SỬA) ---
    const renderItem = ({ item }: { item: any }) => {
        const isCurrentDeleting = deletingId === item.$id;

        return (
            <TouchableOpacity
                onPress={() => router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: item.$id,
                        otherUserId: item.otherUser?.$id,
                        otherUserName: item.otherUser?.name,
                        otherUserAvatar: item.otherUser?.avatar
                    }
                })}
                onLongPress={() => handleDeleteChat(item.$id, item.otherUser?.name || 'người dùng này')}
                activeOpacity={isCurrentDeleting ? 1 : 0.7}
                className="flex-row items-center p-4 bg-white mx-4 mb-3 rounded-2xl border border-gray-100 shadow-sm relative"
            >
                {/* Overlay ĐANG XÓA */}
                {isCurrentDeleting && (
                    <View className="absolute inset-0 z-50 bg-black/50 items-center justify-center rounded-2xl">
                        <ActivityIndicator size="small" color="#fff" />
                        <Text className="text-white mt-2 font-medium">Đang xóa...</Text>
                    </View>
                )}

                {/* Avatar Area */}
                <View className="relative">
                    <Image
                        source={{ uri: item.otherUser?.avatar || 'https://via.placeholder.com/100' }}
                        className="w-14 h-14 rounded-full border-2 border-gray-50"
                    />
                    {unreadCounts[item.$id] > 0 && (
                        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1 border-2 border-white">
                            <Text className="text-white text-xs font-bold">
                                {unreadCounts[item.$id] > 99 ? '99+' : unreadCounts[item.$id]}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Content Area */}
                <View className="flex-1 ml-4 justify-center">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-base font-rubik-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                            {item.otherUser?.name || 'Người dùng ẩn danh'}
                        </Text>
                        <Text className="text-xs font-rubik-medium text-gray-400">
                            {item.lastMessageAt ? formatTime(item.lastMessageAt) : ''}
                        </Text>
                    </View>

                    <View className="flex-row items-center">
                        <Text
                            className="text-gray-500 text-sm font-rubik leading-5 flex-1 mr-4"
                            numberOfLines={1}
                        >
                            {item.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                        </Text>

                        <Ionicons name="chevron-forward" size={18} color="#E5E7EB" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // --- EMPTY STATE ---
    const renderEmpty = () => (
        <View className="flex-1 justify-center items-center mt-20 px-10">
             {searchText ? (
                <View className="items-center">
                     <Ionicons name="search-circle" size={64} color="#9CA3AF" />
                     <Text className="text-lg font-rubik-bold text-gray-800 text-center mt-2">
                        Không tìm thấy "{searchText}"
                    </Text>
                </View>
            ) : (
                <View className="items-center">
                    <View className="w-28 h-28 bg-blue-50 rounded-full items-center justify-center mb-6 shadow-sm">
                        <Ionicons name="chatbubbles" size={56} color="#0061FF" />
                    </View>
                    <Text className="text-xl font-rubik-bold text-gray-800 text-center mb-2">
                        Hộp thư trống
                    </Text>
                    <Text className="text-base text-gray-500 text-center font-rubik leading-6">
                        Các cuộc trò chuyện với khách hàng hoặc chủ nhà sẽ xuất hiện tại đây.
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* --- HEADER VỚI THANH TÌM KIẾM --- */}
            <View className="px-5 pt-2 pb-3 bg-white border-b border-gray-100 shadow-sm z-10">
                {/* Title và Settings */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-3xl font-rubik-bold text-gray-900">Tin nhắn</Text>
                    <TouchableOpacity className="p-2 bg-gray-50 rounded-full">
                        <Ionicons name="settings-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View className="flex-row items-center bg-gray-100 p-3 rounded-xl border border-gray-200">
                    <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                    <TextInput
                        placeholder="Tìm kiếm tên người dùng hoặc tin nhắn..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                        className="flex-1 ml-3 text-base font-rubik"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')} className="p-1">
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0061FF" />
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    keyExtractor={(item) => item.$id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#0061FF']}
                            tintColor="#0061FF"
                        />
                    }
                    contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
                    ListEmptyComponent={renderEmpty}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

export default ChatListScreen;