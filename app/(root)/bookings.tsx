import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '@/lib/global-provider';
import { getUserBookings } from '@/lib/appwrite';
import { useRouter } from 'expo-router';
import icons from '@/constants/icons';

const Bookings = () => {
    const { user } = useGlobalContext();
    const router = useRouter();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getUserBookings(user.$id);
            setBookings(data);
        } catch (error) {
            console.error("Lỗi tải lịch hẹn:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [user]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-green-600 bg-green-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-yellow-600 bg-yellow-100';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Đã xác nhận';
            case 'cancelled': return 'Đã hủy';
            default: return 'Chờ xác nhận';
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Image source={icons.backArrow} className="size-5" />
                </TouchableOpacity>
                <Text className="text-xl font-rubik-bold">Lịch hẹn của tôi</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" className="mt-10 text-primary-300" />
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.$id}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <Image source={icons.calendar} className="size-20 opacity-20 mb-4" />
                            <Text className="text-gray-500 text-lg">Bạn chưa có lịch hẹn nào.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => router.push(`/properties/${item.propertyId}`)}
                            className="flex-row bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4"
                        >
                            <Image 
                                source={{ uri: item.property?.image }} 
                                className="w-24 h-24 rounded-lg bg-gray-200" 
                                resizeMode="cover"
                            />
                            <View className="flex-1 ml-4 justify-between">
                                <View>
                                    <Text className="font-rubik-bold text-base text-black-300" numberOfLines={1}>
                                        {item.property?.name || 'Bất động sản không tồn tại'}
                                    </Text>
                                    <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                                        {item.property?.address}
                                    </Text>
                                </View>
                                
                                <View className="mt-2">
                                    <Text className="text-primary-300 font-rubik-medium text-sm">
                                        {formatDate(item.date)}
                                    </Text>
                                    <View className={`self-start px-2 py-1 rounded mt-1 ${getStatusColor(item.status).split(' ')[1]}`}>
                                        <Text className={`text-xs font-bold ${getStatusColor(item.status).split(' ')[0]}`}>
                                            {getStatusText(item.status)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

export default Bookings;
