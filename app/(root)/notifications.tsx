import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '@/lib/global-provider';
import { getUserNotifications } from '@/lib/appwrite';
import { useRouter } from 'expo-router';
import icons from '@/constants/icons';

const Notifications = () => {
    const { user } = useGlobalContext();
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const data = await getUserNotifications(user.$id);
            setNotifications(data);
        } catch (error) {
            console.error("Lỗi tải thông báo:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        // Nếu dưới 24h
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking': return icons.calendar;
            case 'promo': return icons.wallet; // Dùng tạm icon wallet cho promo
            case 'system': return icons.shield; // Dùng tạm icon shield cho system
            default: return icons.bell;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Image source={icons.backArrow} className="size-5" />
                </TouchableOpacity>
                <Text className="text-xl font-rubik-bold">Thông báo</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" className="mt-10 text-primary-300" />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.$id}
                    contentContainerStyle={{ padding: 0 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <Image source={icons.bell} className="size-20 opacity-20 mb-4" />
                            <Text className="text-gray-500 text-lg">Bạn chưa có thông báo nào.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            className={`flex-row p-4 border-b border-gray-100 ${item.isRead ? 'bg-white' : 'bg-blue-50'}`}
                        >
                            <View className="bg-primary-100 p-3 rounded-full h-12 w-12 items-center justify-center mr-4">
                                <Image source={getIcon(item.type)} className="size-6" tintColor="#0061FF" />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between mb-1">
                                    <Text className="font-rubik-bold text-black-300 flex-1 mr-2" numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text className="text-xs text-gray-400">{formatDate(item.$createdAt)}</Text>
                                </View>
                                <Text className="text-gray-600 font-rubik text-sm" numberOfLines={2}>
                                    {item.message}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

export default Notifications;
