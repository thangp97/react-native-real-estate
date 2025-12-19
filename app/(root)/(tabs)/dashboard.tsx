// File: app/(root)/(tabs)/dashboard.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
// Import các hàm API thật
import { getBrokerStats, getBrokerRecentProperties, assignPropertyToBroker, getAllPendingProperties } from '@/lib/api/broker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const BrokerDashboard = () => {
    const { user } = useGlobalContext();

    // State lưu dữ liệu
    const [stats, setStats] = useState({ pendingCount: 0, myActiveCount: 0, mySoldCount: 0, rating: 0 });
    const [pendingProps, setPendingProps] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const handlePickTask = async (propertyId: string) => {
            if (!user) return;

            setLoading(true);

            try {
                // Kiểm tra xem property có đang trong chế độ bidding không
                const property = pendingProps.find(p => p.$id === propertyId);
                
                if (property && property.biddingStatus === 'open' && property.biddingDeadline) {
                    const deadline = new Date(property.biddingDeadline);
                    const now = new Date();
                    
                    if (now < deadline) {
                        // Đang trong thời gian bidding -> submit bid
                        const { submitBid } = await import('@/lib/api/broker');
                        await submitBid(propertyId, user.$id);
                        
                        Alert.alert(
                            "Đã đăng ký!", 
                            "Bạn đã đăng ký nhận tin này. Hệ thống sẽ chọn môi giới sau khi hết thời hạn.",
                            [{ text: "OK" }]
                        );
                        
                        // Refresh để cập nhật UI
                        await fetchData();
                        return;
                    }
                }
                
                // Nếu không có bidding hoặc đã hết hạn bidding -> assign trực tiếp
                await assignPropertyToBroker(propertyId, user.$id);

                // Thông báo thành công
                Alert.alert("Thành công", "Bạn đã nhận duyệt tin này. Nó đã được chuyển vào mục Đang quản lý.");

                // Cập nhật UI ngay lập tức (Optimistic UI)
                setPendingProps(prev => prev.filter(prop => prop.$id !== propertyId));

                // Cập nhật số liệu thống kê cục bộ
                setStats(prev => ({
                    ...prev,
                    pendingCount: Math.max(0, prev.pendingCount - 1),
                    myActiveCount: prev.myActiveCount + 1
                }));

            } catch (e: any) {
                Alert.alert("Lỗi", e.message || "Không thể nhận duyệt tin. Vui lòng kiểm tra lại kết nối hoặc quyền hạn.");

                // Nếu lỗi xảy ra, tải lại dữ liệu để đảm bảo hiển thị đúng trạng thái từ server
                await fetchData();
            } finally {
                setLoading(false);
            }
        };

    const fetchData = async () => {
        if (!user) return;

        try {
            const [statsData, pendingData] = await Promise.all([
                getBrokerStats(user.$id, user.region!),
                getBrokerRecentProperties(user.$id, user.region!)
            ]);

            // Log để kiểm tra xem promise có resolve thành công không
            console.log("API calls resolved successfully.");

            setStats(statsData);
            setPendingProps(pendingData);

        } catch (e) {
            // Log lỗi nếu một trong các API thất bại
            console.error("Lỗi khi tải dữ liệu dashboard:", e);
            Alert.alert("Lỗi tải dữ liệu", "Không thể kết nối với máy chủ.");

        } finally {
            // QUAN TRỌNG: Đảm bảo loading tắt dù thành công hay thất bại
            setLoading(false);
        }
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
                    <TouchableOpacity
                        onPress={() => router.push('/all-pending')} // <--- Thêm dòng này
                        className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4 border border-red-100"
                    >
                        <View className="bg-red-50 w-10 h-10 rounded-full justify-center items-center mb-2">
                            <Ionicons name="notifications" size={20} color="#EF4444" />
                        </View>
                        <Text className="text-2xl font-rubik-bold text-black-300">{stats.pendingCount}</Text>
                        <Text className="text-xs font-rubik text-gray-500">Tin chờ duyệt</Text>
                    </TouchableOpacity>

                    {/* Ô 2: Đang quản lý */}
                    <TouchableOpacity
                        onPress={() => router.push('/my-listings')} // Chuyển hướng sang tab My Listings
                        className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4 border border-blue-100"
                    >
                        <View className="bg-blue-50 w-10 h-10 rounded-full justify-center items-center mb-2">
                            <Ionicons name="briefcase" size={20} color="#0061FF" />
                        </View>
                        <Text className="text-2xl font-rubik-bold text-black-300">{stats.myActiveCount}</Text>
                        <Text className="text-xs font-rubik text-gray-500">Đang quản lý</Text>
                    </TouchableOpacity>

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
                        <Text className={`${stats.rating ? 'text-2xl' : 'text-lg'} font-rubik-bold text-black-300`}>
                            {stats.rating ? stats.rating : 'Chưa có'}
                        </Text>
                        <Text className="text-xs font-rubik text-gray-500">Điểm tín nhiệm</Text>
                    </View>
                </View>

                {/* Danh sách chờ duyệt (Queue) */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-xl font-rubik-bold text-black-300">Việc cần làm ngay ({pendingProps.length})</Text>

                    {/* THÊM SỰ KIỆN TẠI ĐÂY */}
                    <TouchableOpacity onPress={() => router.push('/all-pending')}>
                        <Text className="text-[#0061FF] font-rubik-medium">Xem tất cả</Text>
                    </TouchableOpacity>
                </View>

                {pendingProps.length === 0 ? (
                    <Text className="text-gray-400 text-center py-4">Tuyệt vời! Hiện không có tin nào cần duyệt.</Text>
                ) : (
                    pendingProps.map((item) => {
                        const isBidding = item.biddingStatus === 'open' && item.biddingDeadline;
                        const isAlreadyBid = item.biddingBrokers?.includes(user?.$id);
                        const deadline = isBidding ? new Date(item.biddingDeadline) : null;
                        const now = new Date();
                        const isExpired = deadline && now > deadline;
                        const timeLeftMinutes = deadline && !isExpired ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60)) : 0;
                        const timeLeft = timeLeftMinutes >= 60 ? `${Math.ceil(timeLeftMinutes / 60)}h` : `${timeLeftMinutes}ph`;
                        const biddersCount = item.biddingBrokers?.length || 0;

                        return (
                            <View
                                key={item.$id}
                                className={`bg-white p-4 rounded-xl shadow-sm mb-3 border-l-4 ${isBidding ? 'border-l-purple-500' : 'border-l-red-500'}`}
                            >
                                <View className="flex-row items-start">
                                    <Image
                                        source={{ uri: item.image }}
                                        className="w-16 h-16 bg-gray-200 rounded-lg mr-4"
                                    />
                                    <View className="flex-1">
                                        <View className="flex-row justify-between items-center">
                                            <Text className={`text-xs font-bold px-2 py-0.5 rounded ${isBidding ? 'text-purple-600 bg-purple-100' : 'text-red-600 bg-red-100'}`}>
                                                {isBidding ? '🎲 ĐẤU GIÁ' : 'CHỜ DUYỆT'}
                                            </Text>
                                            <Text className="text-xs text-gray-400">{new Date(item.$createdAt).toLocaleDateString()}</Text>
                                        </View>

                                        <Text className="font-rubik-medium text-base text-black-300 mt-1" numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>{item.address}</Text>
                                        <Text className="text-[#0061FF] font-rubik-bold mt-1">{item.price} VNĐ</Text>

                                        {isBidding && !isExpired && (
                                            <View className="mt-2 bg-purple-50 p-2 rounded">
                                                <Text className="text-xs text-purple-700">
                                                    ⏱️ Còn {timeLeft} | 👥 {biddersCount} môi giới đã đăng ký
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Nút nhận việc */}
                                {isAlreadyBid ? (
                                    <View className="mt-3 bg-gray-200 py-2 rounded-lg flex-row justify-center items-center">
                                        <Ionicons name="checkmark-circle" size={16} color="#666" />
                                        <Text className="text-gray-600 font-rubik-medium ml-2">Đã đăng ký</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => handlePickTask(item.$id)}
                                        className={`mt-3 py-2 rounded-lg flex-row justify-center items-center ${isBidding ? 'bg-purple-500' : 'bg-red-500'}`}
                                    >
                                        <Ionicons name={isBidding ? "trophy" : "hand-right"} size={16} color="white" />
                                        <Text className="text-white font-rubik-medium ml-2">
                                            {isBidding ? 'Đăng ký nhận tin' : 'Nhận Duyệt Tin'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}
                 <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default BrokerDashboard;