// File: app/(root)/(tabs)/my-listings.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { getMyActiveProperties } from '@/lib/appwrite';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import PropertyCard from '@/components/PropertyCard'; // Component Card để tái sử dụng

// Lưu ý: Bạn cần tạo Component PropertyCard đơn giản để tái sử dụng hoặc dùng FlatList nếu dữ liệu lớn

const MyListingsScreen = () => {
    const { user } = useGlobalContext();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const data = await getMyActiveProperties(user.$id);
        setListings(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
         return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#0061FF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="p-4 bg-white border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-800">Danh mục Quản lý</Text>
                <Text className="text-sm text-gray-500">Tổng cộng: {listings.length} tin đang xử lý</Text>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-2"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {listings.length === 0 ? (
                    <View className="items-center justify-center h-80">
                        <Ionicons name="briefcase-outline" size={60} color="#ccc" />
                        <Text className="text-gray-500 mt-4">Bạn chưa nhận duyệt tin nào.</Text>
                        <Text className="text-sm text-blue-500 mt-2">Hãy kiểm tra "Tổng quan" để nhận việc!</Text>
                    </View>
                ) : (
                    listings.map((item) => (
                        <TouchableOpacity
                            key={item.$id}
                            // Chuyển hướng đến màn hình chi tiết duyệt tin
                            onPress={() => router.push({
                                pathname: '/review-property/[id]',
                                params: { id: item.$id } as any
                            })}
                            className="bg-gray-50 p-4 rounded-xl mb-4 border-l-4 border-l-blue-500 shadow-xs"
                        >
                            {/* Bạn nên dùng một Component Card chuẩn, nhưng dưới đây là cấu trúc hiển thị nhanh */}
                            <Text className="font-bold text-base text-gray-800">{item.name}</Text>
                            <Text className="text-sm text-gray-600 mt-1">{item.address}</Text>
                            <View className="flex-row justify-between items-center mt-2">
                                <Text className="text-blue-600 font-bold">{item.price} VNĐ</Text>
                                <View className={`px-2 py-1 rounded-md ${item.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                    <Text className={`text-xs ${item.status === 'approved' ? 'text-green-700' : 'text-yellow-700'} font-medium`}>
                                        {item.status === 'approved' ? 'Đã duyệt' : 'Đang xem xét'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View className="h-10" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default MyListingsScreen;