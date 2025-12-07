import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router'; // Import thêm Stack
import { useGlobalContext } from '@/lib/global-provider';
import { getAllPendingProperties, assignPropertyToBroker } from '@/lib/api/broker';

const AllPendingScreen = () => {
    const { user } = useGlobalContext();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllPendingProperties();
            setProperties(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        const data = await getAllPendingProperties();
        setProperties(data);
        setRefreshing(false);
    };

    const handlePickTask = async (propertyId: string) => {
        if (!user) return;
        try {
            await assignPropertyToBroker(propertyId, user.$id);
            Alert.alert("Thành công", "Đã nhận tin! Tin đã được chuyển sang tab Đang quản lý.");
            setProperties(prev => prev.filter(item => item.$id !== propertyId));
        } catch (error: any) {
            Alert.alert("Lỗi", "Không thể nhận tin này.");
            await fetchData();
        }
    };

    // --- CARD DESIGN MỚI ---
    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 mx-1">
            {/* Phần thông tin trên: Ảnh + Text */}
            <View className="flex-row">
                {/* Ảnh Thumbnail lớn hơn, bo góc */}
                <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/150' }}
                    className="w-28 h-28 rounded-xl bg-gray-200"
                    resizeMode="cover"
                />

                {/* Nội dung bên phải */}
                <View className="flex-1 ml-3 justify-between py-1">
                    <View>
                        {/* Badge và Ngày */}
                        <View className="flex-row justify-between items-start mb-1">
                            <View className="bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                <Text className="text-[10px] font-bold text-red-500 uppercase">Chờ duyệt</Text>
                            </View>
                            <Text className="text-[10px] text-gray-400 font-rubik">
                                {new Date(item.$createdAt).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>

                        {/* Tên nhà */}
                        <Text className="font-rubik-bold text-base text-gray-800 leading-5" numberOfLines={2}>
                            {item.name}
                        </Text>

                        {/* Địa chỉ */}
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="location-sharp" size={10} color="#9CA3AF" />
                            <Text className="text-gray-500 text-xs ml-1 font-rubik" numberOfLines={1}>
                                {item.address}
                            </Text>
                        </View>
                    </View>

                    {/* Giá tiền */}
                    <Text className="text-[#0061FF] font-rubik-bold text-lg">
                        {item.price?.toLocaleString('vi-VN')} đ
                    </Text>
                </View>
            </View>

            {/* Đường kẻ phân cách mờ */}
            <View className="h-[1px] bg-gray-100 my-3" />

            {/* Nút bấm ở dưới - Full width */}
            <TouchableOpacity
                onPress={() => handlePickTask(item.$id)}
                className="bg-red-500 py-3 rounded-xl flex-row justify-center items-center shadow-red-200 shadow-md active:bg-red-600"
            >
                <Ionicons name="hand-right" size={18} color="white" />
                <Text className="text-white font-rubik-bold ml-2 text-sm">Nhận Duyệt Tin Này</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* --- FIX LỖI KHOẢNG TRẮNG: Ẩn Header mặc định --- */}
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Custom Header */}
            <View className="flex-row items-center px-5 py-3 bg-white border-b border-gray-100 shadow-sm z-10">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-50 rounded-full justify-center items-center mr-3"
                >
                    <Ionicons name="arrow-back" size={20} color="#333" />
                </TouchableOpacity>
                <View>
                    <Text className="text-lg font-rubik-bold text-gray-800">Danh Sách Chờ Duyệt</Text>
                    <Text className="text-xs text-gray-500 font-rubik">Hiện có {properties.length} tin cần xử lý</Text>
                </View>
            </View>

            {/* List Content */}
            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0061FF" />
                    <Text className="text-gray-400 mt-2 font-rubik">Đang tải dữ liệu...</Text>
                </View>
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item) => item.$id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }} // Padding bottom để không bị che bởi nav bar
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20 px-10">
                            <View className="bg-white p-6 rounded-full shadow-sm mb-4">
                                <Ionicons name="checkmark-done-circle" size={60} color="#10B981" />
                            </View>
                            <Text className="text-gray-800 font-rubik-bold text-lg text-center">
                                Hết việc rồi!
                            </Text>
                            <Text className="text-gray-400 text-center mt-2 font-rubik">
                                Hiện tại không còn tin nào chờ duyệt. Hãy quay lại sau nhé.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default AllPendingScreen;