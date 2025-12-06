// File: app/(root)/(tabs)/dashboard.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
// Import các hàm API thật
import { getBrokerStats, getBrokerRecentProperties, assignPropertyToBroker } from '@/lib/api/broker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const BrokerDashboard = () => {
    const { user } = useGlobalContext();

    // State lưu dữ liệu
    const [stats, setStats] = useState({ pendingCount: 0, myActiveCount: 0, mySoldCount: 0, rating: 0 });
    const [pendingProps, setPendingProps] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Chức năng xử lý khi Broker nhận tin
    const handlePickTask = async (propertyId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            await assignPropertyToBroker(propertyId, user.$id);
            Alert.alert("Thành công", "Bạn đã nhận duyệt tin này. Nó đã được chuyển vào mục Đang quản lý.");

            // Tải lại dữ liệu sau khi nhận việc
            await fetchData();

        } catch (e) {
            Alert.alert("Lỗi", "Không thể nhận duyệt tin. Vui lòng kiểm tra quyền.");
        } finally {
            setLoading(false);
        }
    };


    const fetchData = async () => {
        if (!user) return;

        const [statsData, pendingData] = await Promise.all([
            getBrokerStats(user.$id),
            getBrokerRecentProperties(user.$id)
        ]);

        setStats(statsData);
        setPendingProps(pendingData);
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
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="px-5"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mt-5 mb-6">
                    <View>
                        <Text className="text-sm font-rubik text-gray-500">Xin chào Broker,</Text>
                        <Text className="text-2xl font-rubik-bold text-black-300">{user?.name}</Text>
                    </View>
                    <Image source={{ uri: user?.avatar }} className="w-12 h-12 rounded-full border-2 border-white" />
                </View>

                {/* Thống kê (Stats Grid) */}
                <View className="flex-row flex-wrap justify-between mb-6">
                    {/* Ô 1: Việc cần làm (Pending) */}
                    <TouchableOpacity className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4 border border-red-100">
                        <View className="bg-red-50 w-10 h-10 rounded-full justify-center items-center mb-2">
                            <Ionicons name="notifications" size={20} color="#EF4444" />
                        </View>
                        <Text className="text-2xl font-rubik-bold text-black-300">{stats.pendingCount}</Text>
                        <Text className="text-xs font-rubik text-gray-500">Tin chờ duyệt</Text>
                    </TouchableOpacity>

                    {/* Ô 2: Đang quản lý */}
                    <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4 border border-blue-100">
                        <View className="bg-blue-50 w-10 h-10 rounded-full justify-center items-center mb-2">
                            <Ionicons name="briefcase" size={20} color="#0061FF" />
                        </View>
                        <Text className="text-2xl font-rubik-bold text-black-300">{stats.myActiveCount}</Text>
                        <Text className="text-xs font-rubik text-gray-500">Đang quản lý</Text>
                    </View>

                    {/* Ô 3: Đã chốt */}
                    <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <View className="bg-green-50 w-10 h-10 rounded-full justify-center items-center mb-2">
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        </View>
                        <Text className="text-2xl font-rubik-bold text-black-300">{stats.mySoldCount}</Text>
                        <Text className="text-xs font-rubik text-gray-500">Đã bán/thuê</Text>
                    </View>

                    {/* Ô 4: Uy tín */}
                    <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-yellow-100">
                        <View className="bg-yellow-50 w-10 h-10 rounded-full justify-center items-center mb-2">
                            <Ionicons name="star" size={20} color="#F59E0B" />
                        </View>
                        <Text className="text-2xl font-rubik-bold text-black-300">{stats.rating}</Text>
                        <Text className="text-xs font-rubik text-gray-500">Điểm tín nhiệm</Text>
                    </View>
                </View>

                {/* Danh sách chờ duyệt (Queue) */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-xl font-rubik-bold text-black-300">Việc cần làm ngay ({pendingProps.length})</Text>
                    <TouchableOpacity>
                        <Text className="text-[#0061FF] font-rubik-medium">Xem tất cả</Text>
                    </TouchableOpacity>
                </View>

                {pendingProps.length === 0 ? (
                    <Text className="text-gray-400 text-center py-4">Tuyệt vời! Hiện không có tin nào cần duyệt.</Text>
                ) : (
                    pendingProps.map((item) => (
                        <View
                            key={item.$id}
                            className="bg-white p-4 rounded-xl shadow-sm mb-3 border-l-4 border-l-red-500"
                        >
                             <View className="flex-row items-start">
                                <Image
                                    source={{ uri: item.image }}
                                    className="w-16 h-16 bg-gray-200 rounded-lg mr-4"
                                />
                                <View className="flex-1">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-xs text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded">CHỜ DUYỆT</Text>
                                        <Text className="text-xs text-gray-400">{new Date(item.$createdAt).toLocaleDateString()}</Text>
                                    </View>

                                    <Text className="font-rubik-medium text-base text-black-300 mt-1" numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>{item.address}</Text>
                                    <Text className="text-[#0061FF] font-rubik-bold mt-1">{item.price} VNĐ</Text>
                                </View>
                            </View>

                            {/* Nút nhận việc */}
                            <TouchableOpacity
                                onPress={() => handlePickTask(item.$id)}
                                className="mt-3 bg-red-500 py-2 rounded-lg flex-row justify-center items-center"
                            >
                                <Ionicons name="hand-right" size={16} color="white" />
                                <Text className="text-white font-rubik-medium ml-2">Nhận Duyệt Tin</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
                 <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default BrokerDashboard;