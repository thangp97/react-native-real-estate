import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
// Đảm bảo import đúng đường dẫn API Broker
import { getMyActiveProperties } from '@/lib/api/seller';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = 100; // Kích thước ảnh thumbnail

const MyListingsScreen = () => {
    const { user } = useGlobalContext();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        // Nếu đang refreshing thì không hiện loading toàn màn hình
        if (!refreshing) setLoading(true);

        try {
            const data = await getMyActiveProperties(user.$id);
            setListings(data);
        } catch (error) {
            console.error("Lỗi lấy danh sách quản lý:", error);
        } finally {
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

    // Hàm helper để lấy màu và text cho Badge trạng thái
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'approved':
                return { color: 'text-green-700', bg: 'bg-green-100', label: 'ĐÃ DUYỆT' };
            case 'reviewing':
                return { color: 'text-blue-700', bg: 'bg-blue-100', label: 'ĐANG XEM XÉT' };
            case 'rejected':
                return { color: 'text-red-700', bg: 'bg-red-100', label: 'ĐÃ TỪ CHỐI' };
            case 'request_changes':
                return { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'YÊU CẦU SỬA' };
            case 'sold':
                return { color: 'text-gray-700', bg: 'bg-gray-200', label: 'ĐÃ BÁN' };
            default:
                return { color: 'text-gray-600', bg: 'bg-gray-100', label: status.toUpperCase() };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const statusInfo = getStatusInfo(item.status);

        return (
            <TouchableOpacity
                onPress={() => router.push({
                    pathname: '/review-property/[id]',
                    params: { id: item.$id } as any
                })}
                className="bg-white p-3 rounded-2xl mb-4 shadow-sm border border-gray-100 flex-row"
            >
                {/* Hình ảnh Thumbnail */}
                <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/150' }}
                    style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
                    className="rounded-xl bg-gray-200"
                    resizeMode="cover"
                />

                {/* Nội dung bên phải */}
                <View className="flex-1 ml-4 justify-between py-1">
                    <View>
                        {/* Badge Trạng thái & Ngày */}
                        <View className="flex-row justify-between items-center mb-1">
                            <View className={`px-2 py-0.5 rounded-full ${statusInfo.bg}`}>
                                <Text className={`text-[10px] font-rubik-bold ${statusInfo.color}`}>
                                    {statusInfo.label}
                                </Text>
                            </View>
                            <Text className="text-[10px] text-gray-400">
                                {new Date(item.$updatedAt).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>

                        {/* Tên & Địa chỉ */}
                        <Text className="text-base font-rubik-bold text-black-300 mb-1" numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text className="text-xs text-gray-500 font-rubik" numberOfLines={1}>
                            <Ionicons name="location-outline" size={12} color="#666" /> {item.address}
                        </Text>
                    </View>

                    {/* Giá tiền */}
                    <View className="flex-row justify-between items-end mt-2">
                        <Text className="text-primary-300 font-rubik-bold text-sm">
                            {item.price?.toLocaleString('vi-VN')} VNĐ
                        </Text>
                        <Ionicons name="chevron-forward-circle" size={20} color="#0061FF" opacity={0.5} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
         return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#0061FF" />
                <Text className="mt-2 text-gray-500 font-rubik">Đang tải danh sách...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-5 py-4 bg-white border-b border-gray-100 shadow-sm mb-2">
                <Text className="text-2xl font-rubik-bold text-black-300">Danh mục Quản lý</Text>
                <Text className="text-sm text-gray-500 font-rubik mt-1">
                    Bạn đang phụ trách <Text className="text-primary-300 font-bold">{listings.length}</Text> tin đăng
                </Text>
            </View>

            {/* Danh sách */}
            <FlatList
                data={listings}
                renderItem={renderItem}
                keyExtractor={(item) => item.$id}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0061FF"]} />}
                ListEmptyComponent={
                    <View className="items-center justify-center mt-20 px-10">
                        <View className="bg-white p-6 rounded-full shadow-sm mb-4">
                            <Ionicons name="briefcase-outline" size={50} color="#CBD5E1" />
                        </View>
                        <Text className="text-gray-500 font-rubik-medium text-lg text-center">
                            Danh sách trống
                        </Text>
                        <Text className="text-gray-400 text-sm text-center mt-2">
                            Bạn chưa nhận duyệt tin nào. Hãy quay lại "Tổng quan" để nhận việc nhé!
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(root)/(tabs)/dashboard')}
                            className="mt-6 bg-primary-300 py-3 px-6 rounded-full"
                        >
                            <Text className="text-white font-rubik-bold">Về Tổng Quan</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default MyListingsScreen;