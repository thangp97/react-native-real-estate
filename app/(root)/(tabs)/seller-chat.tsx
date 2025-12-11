// import React, { useEffect, useState, useCallback } from 'react';
// import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useGlobalContext } from '@/lib/global-provider';
// import { getMyChats } from '@/lib/api/chat';
// import { router, useFocusEffect } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
//
// // Hàm helper format thời gian
// const formatTime = (isoString: string) => {
//     const date = new Date(isoString);
//     const now = new Date();
//     const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
//
//     if (isToday) {
//         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     } else {
//         return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
//     }
// };
//
// const ChatListScreen = () => {
//     const { user } = useGlobalContext();
//     const [chats, setChats] = useState<any[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//
//     const fetchChats = async () => {
//         if (!user) return;
//         try {
//             const data = await getMyChats(user.$id);
//             setChats(data);
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setLoading(false);
//             setRefreshing(false);
//         }
//     };
//
//     useFocusEffect(
//         useCallback(() => {
//             fetchChats();
//         }, [user])
//     );
//
//     const onRefresh = () => {
//         setRefreshing(true);
//         fetchChats();
//     };
//
//     // --- XỬ LÝ NÚT BACK ---
//     const handleBack = () => {
//         if (router.canGoBack()) {
//             router.back();
//         } else {
//             // Nếu không back được, mặc định về Dashboard hoặc Trang chủ
//             router.push('/(root)/(tabs)/dashboard');
//         }
//     };
//
//     // --- RENDER ITEM ---
//     const renderItem = ({ item }: { item: any }) => (
//         <TouchableOpacity
//             onPress={() => router.push({
//                 pathname: '/chat/[id]',
//                 params: {
//                     id: item.$id,
//                     otherUserId: item.otherUser?.$id,
//                     otherUserName: item.otherUser?.name,
//                     otherUserAvatar: item.otherUser?.avatar
//                 }
//             })}
//             activeOpacity={0.7}
//             className="flex-row items-center p-4 bg-white border-b border-gray-100 mx-3 mb-2 rounded-2xl shadow-sm"
//         >
//             {/* Avatar Area */}
//             <View className="relative">
//                 <Image
//                     source={{ uri: item.otherUser?.avatar || 'https://via.placeholder.com/100' }}
//                     className="w-14 h-14 rounded-full border border-gray-200"
//                 />
//                 {/* Online Status (Optional) */}
//                 {/* <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" /> */}
//             </View>
//
//             {/* Content Area */}
//             <View className="flex-1 ml-4 justify-center">
//                 <View className="flex-row justify-between items-center mb-1">
//                     <Text className="text-base font-rubik-bold text-gray-900 flex-1" numberOfLines={1}>
//                         {item.otherUser?.name || 'Người dùng ẩn danh'}
//                     </Text>
//                     <Text className="text-xs font-rubik text-gray-400 ml-2">
//                         {item.lastMessageAt ? formatTime(item.lastMessageAt) : ''}
//                     </Text>
//                 </View>
//
//                 <View className="flex-row items-center">
//                     <Text
//                         className="text-gray-500 text-sm font-rubik leading-5 flex-1"
//                         numberOfLines={1}
//                     >
//                         {item.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
//                     </Text>
//                     <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
//                 </View>
//             </View>
//         </TouchableOpacity>
//     );
//
//     // --- EMPTY STATE ---
//     const renderEmpty = () => (
//         <View className="flex-1 justify-center items-center mt-20 px-10">
//             <View className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center mb-4">
//                 <Ionicons name="chatbubbles-outline" size={48} color="#0061FF" />
//             </View>
//             <Text className="text-lg font-rubik-bold text-gray-800 text-center mb-2">
//                 Chưa có tin nhắn nào
//             </Text>
//             <Text className="text-sm text-gray-500 text-center font-rubik leading-5">
//                 Các cuộc trò chuyện với khách hàng hoặc chủ nhà sẽ xuất hiện tại đây.
//             </Text>
//         </View>
//     );
//
//     return (
//         <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
//             <StatusBar barStyle="dark-content" />
//
//             {/* --- HEADER ĐÃ SỬA --- */}
//             <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between shadow-sm z-10">
//                 <View className="flex-row items-center">
//                     {/* Nút Back */}
//                     <TouchableOpacity
//                         onPress={handleBack}
//                         className="mr-3 p-2 bg-gray-50 rounded-full active:bg-gray-200"
//                     >
//                         <Ionicons name="arrow-back" size={20} color="#1F2937" />
//                     </TouchableOpacity>
//
//                     <Text className="text-xl font-rubik-bold text-gray-900">Tin nhắn</Text>
//                 </View>
//
//                 <TouchableOpacity className="p-2 bg-gray-50 rounded-full active:bg-gray-200">
//                     <Ionicons name="search-outline" size={20} color="#1F2937" />
//                 </TouchableOpacity>
//             </View>
//
//             {loading && !refreshing ? (
//                 <View className="flex-1 justify-center items-center">
//                     <ActivityIndicator size="large" color="#0061FF" />
//                 </View>
//             ) : (
//                 <FlatList
//                     data={chats}
//                     keyExtractor={(item) => item.$id}
//                     refreshControl={
//                         <RefreshControl
//                             refreshing={refreshing}
//                             onRefresh={onRefresh}
//                             colors={['#0061FF']}
//                             tintColor="#0061FF"
//                         />
//                     }
//                     contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
//                     ListEmptyComponent={renderEmpty}
//                     renderItem={renderItem}
//                     showsVerticalScrollIndicator={false}
//                 />
//             )}
//         </SafeAreaView>
//     );
// };
//
// export default ChatListScreen;

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { getMyChats } from '@/lib/api/chat';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Hàm helper format thời gian hiển thị (VD: 10:30 AM hoặc Hôm qua)
const formatTime = (isoString: string) => {
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

    const fetchChats = async () => {
        if (!user) return;
        try {
            const data = await getMyChats(user.$id);
            setChats(data);
        } catch (error) {
            console.error(error);
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

    // --- RENDER ITEM (Mỗi dòng tin nhắn) ---
    const renderItem = ({ item }: { item: any }) => (
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
            activeOpacity={0.7}
            className="flex-row items-center p-4 bg-white border-b border-gray-50 mx-2 mb-1 rounded-xl"
        >
            {/* Avatar Area */}
            <View className="relative">
                <Image
                    source={{ uri: item.otherUser?.avatar || 'https://via.placeholder.com/100' }}
                    className="w-14 h-14 rounded-full border border-gray-100"
                />
                {/* Giả lập chấm xanh online (có thể logic sau này) */}
                {/* <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" /> */}
            </View>

            {/* Content Area */}
            <View className="flex-1 ml-4 justify-center">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-lg font-rubik-bold text-gray-900 flex-1" numberOfLines={1}>
                        {item.otherUser?.name || 'Người dùng ẩn danh'}
                    </Text>
                    <Text className="text-xs font-rubik text-gray-400 ml-2">
                        {item.lastMessageAt ? formatTime(item.lastMessageAt) : ''}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    {/* Check if last message was current user (Optional logic needed in API) */}
                    <Text
                        className="text-gray-500 text-sm font-rubik leading-5 flex-1"
                        numberOfLines={1}
                    >
                        {item.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                    </Text>

                    {/* Mũi tên chỉ hướng nhỏ (Optional) */}
                    <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
                </View>
            </View>
        </TouchableOpacity>
    );

    // --- EMPTY STATE (Khi chưa có tin nhắn) ---
    const renderEmpty = () => (
        <View className="flex-1 justify-center items-center mt-32 px-10">
            <View className="w-32 h-32 bg-blue-50 rounded-full items-center justify-center mb-6">
                <Ionicons name="chatbubbles-outline" size={64} color="#0061FF" />
            </View>
            <Text className="text-xl font-rubik-bold text-gray-800 text-center mb-2">
                Chưa có tin nhắn nào
            </Text>
            <Text className="text-base text-gray-500 text-center font-rubik leading-6">
                Các cuộc trò chuyện với khách hàng hoặc chủ nhà sẽ xuất hiện tại đây.
            </Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header Lớn */}
            <View className="px-6 pt-2 pb-4 bg-white border-b border-gray-100 flex-row justify-between items-center shadow-sm z-10">
                <Text className="text-3xl font-rubik-bold text-gray-900">Tin nhắn</Text>
                <TouchableOpacity className="p-2 bg-gray-50 rounded-full">
                    <Ionicons name="search-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0061FF" />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.$id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#0061FF']}
                            tintColor="#0061FF"
                        />
                    }
                    contentContainerStyle={{ paddingVertical: 10, flexGrow: 1 }}
                    ListEmptyComponent={renderEmpty}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

export default ChatListScreen;