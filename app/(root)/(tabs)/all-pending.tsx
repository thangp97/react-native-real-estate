import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    StatusBar,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { getAllPendingProperties, assignPropertyToBroker } from '@/lib/api/broker';

const AllPendingScreen = () => {
    const { user } = useGlobalContext();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 1. State cho tìm kiếm
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getAllPendingProperties(user.region);
            setProperties(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const onRefresh = async () => {
        if (!user) return;
        setRefreshing(true);
        const data = await getAllPendingProperties(user.region);
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

    // 2. Logic lọc dữ liệu phía Client (Lọc theo Tên hoặc Địa chỉ)
    const filteredProperties = properties.filter((item) => {
        const query = searchQuery.toLowerCase();
        const name = item.name ? item.name.toLowerCase() : '';
        const address = item.address ? item.address.toLowerCase() : '';
        return name.includes(query) || address.includes(query);
    });

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 mx-1">
            <View className="flex-row">
                <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/150' }}
                    className="w-28 h-28 rounded-xl bg-gray-200"
                    resizeMode="cover"
                />
                <View className="flex-1 ml-3 justify-between py-1">
                    <View>
                        <View className="flex-row justify-between items-start mb-1">
                            <View className="bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                <Text className="text-[10px] font-bold text-red-500 uppercase">Chờ duyệt</Text>
                            </View>
                            <Text className="text-[10px] text-gray-400 font-rubik">
                                {new Date(item.$createdAt).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>
                        <Text className="font-rubik-bold text-base text-gray-800 leading-5" numberOfLines={2}>
                            {item.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="location-sharp" size={10} color="#9CA3AF" />
                            <Text className="text-gray-500 text-xs ml-1 font-rubik" numberOfLines={1}>
                                {item.address}
                            </Text>
                        </View>
                    </View>
                    <Text className="text-[#0061FF] font-rubik-bold text-lg">
                        {item.price?.toLocaleString('vi-VN')} đ
                    </Text>
                </View>
            </View>
            <View className="h-[1px] bg-gray-100 my-3" />
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

            {/* 3. Thanh Tìm Kiếm (Search Bar) */}
            <View className="px-5 py-3 bg-white border-b border-gray-50">
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2 border border-gray-200">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Tìm theo tên nhà, địa chỉ..."
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 ml-3 font-rubik text-gray-800 h-10"
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
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
                    data={filteredProperties} // 4. Sử dụng filteredProperties thay vì properties gốc
                    keyExtractor={(item) => item.$id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20 px-10">
                            <View className="bg-white p-6 rounded-full shadow-sm mb-4">
                                {searchQuery.length > 0 ? (
                                    // Icon khác khi tìm kiếm không thấy
                                    <Ionicons name="search" size={60} color="#9CA3AF" />
                                ) : (
                                    <Ionicons name="checkmark-done-circle" size={60} color="#10B981" />
                                )}
                            </View>
                            <Text className="text-gray-800 font-rubik-bold text-lg text-center">
                                {searchQuery.length > 0 ? "Không tìm thấy kết quả" : "Hết việc rồi!"}
                            </Text>
                            <Text className="text-gray-400 text-center mt-2 font-rubik">
                                {searchQuery.length > 0
                                    ? `Không có tin nào khớp với "${searchQuery}"`
                                    : "Hiện tại không còn tin nào chờ duyệt. Hãy quay lại sau nhé."
                                }
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default AllPendingScreen;