import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmBooking, getBrokerBookings, rejectBooking } from '@/lib/api/broker';
import { cancelBooking, getBuyerBookings } from '@/lib/api/buyer';
import { confirmBooking as confirmSellerBooking, getSellerBookings, rejectBooking as rejectSellerBooking } from '@/lib/api/seller';

const BookingsScreen = () => {
    const { user } = useGlobalContext();
    const router = useRouter();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isBroker = user?.role === 'broker';
    const isSeller = user?.role === 'seller';

    const fetchBookings = async () => {
            if (!user) return;
            if (!refreshing) setLoading(true);

            try {
                let data = [];

                if (isBroker) {
                    console.log("Fetching Broker bookings...");
                    data = await getBrokerBookings(user.$id);
                } else if (isSeller) {
                    console.log("Fetching Seller bookings...");
                    data = await getSellerBookings(user.$id);
                } else {
                    console.log("Fetching Buyer bookings...");
                    data = await getBuyerBookings(user.$id);
                }

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

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBookings();
        setRefreshing(false);
    };

    const updateLocalList = (id: string, newStatus: string) => {
            setBookings(prev => prev.map(item => item.$id === id ? { ...item, status: newStatus } : item));
    };


    // 3. XỬ LÝ HÀNH ĐỘNG CHO BUYER (Dùng hàm từ api/buyer)
    const handleBuyerCancel = (bookingId: string) => {
        Alert.alert("Hủy lịch hẹn", "Bạn chắc chắn muốn hủy?", [
            { text: "Không", style: "cancel" },
            {
                text: "Hủy Lịch", style: "destructive",
                onPress: async () => {
                    try {
                        await cancelBooking(bookingId); // Hàm riêng của Buyer
                        updateLocalList(bookingId, 'cancelled');
                        Alert.alert("Thành công", "Đã hủy lịch hẹn.");
                    } catch (e) {
                        Alert.alert("Lỗi", "Không thể hủy lịch.");
                    }
                }
            }
        ]);
    };

    // 2. Xử lý Broker/Seller: Confirm/Reject
    const handleReviewAction = (bookingId: string, actionType: 'confirm' | 'reject') => {
        const isConfirm = actionType === 'confirm';
        const actionText = isConfirm ? "Chấp nhận" : "Từ chối";

        Alert.alert(
            `${actionText} lịch hẹn`,
            `Bạn có chắc chắn muốn ${actionText.toLowerCase()}?`,
            [
                { text: "Đóng", style: "cancel" },
                {
                    text: "Xác nhận",
                    style: isConfirm ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            if (isBroker) {
                                if (isConfirm) await confirmBooking(bookingId);
                                else await rejectBooking(bookingId);
                            } else if (isSeller) {
                                if (isConfirm) await confirmSellerBooking(bookingId);
                                else await rejectSellerBooking(bookingId);
                            }
                            
                            updateLocalList(bookingId, isConfirm ? 'confirmed' : 'cancelled');
                        } catch (e) {
                            Alert.alert("Lỗi", "Thao tác thất bại.");
                        }
                    }
                }
            ]
        );
    };


    // Helper: Format hiển thị
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN', {
            weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-green-600 bg-green-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            case 'completed': return 'text-blue-600 bg-blue-100';
            default: return 'text-yellow-600 bg-yellow-100';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Đã xác nhận';
            case 'cancelled': return 'Đã hủy/Từ chối';
            case 'completed': return 'Hoàn thành';
            default: return 'Chờ xác nhận';
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-xl font-rubik-bold text-gray-800">Quản lý Lịch hẹn</Text>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" className="mt-10 text-primary-300" />
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.$id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <Ionicons name="calendar-clear-outline" size={80} color="#ccc" />
                            <Text className="text-gray-500 text-lg mt-4">Chưa có lịch hẹn nào.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const property = item.property || {};
                        
                        let otherPerson = item.agent; // Default for Buyer (shows Broker/Seller)
                        let otherPersonLabel = "Người nhận";

                        if (isBroker) {
                            otherPerson = item.user; // Broker shows Buyer
                            otherPersonLabel = "Khách hàng";
                        } else if (isSeller) {
                            // Khi môi giới đặt lịch với người bán:
                            // - Môi giới là agent
                            // - Người bán là user
                            // Vì vậy seller cần hiển thị agent (môi giới)
                            otherPerson = item.agent; // Seller shows Broker (who booked)
                            otherPersonLabel = "Môi giới đặt";
                        } else {
                            // Buyer view
                            otherPersonLabel = "Làm việc với";
                        }

                        return (
                            <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                                <TouchableOpacity
                                    onPress={() => property.$id && router.push(`/properties/${property.$id}`)}
                                    className="flex-row border-b border-gray-100 pb-3 mb-3"
                                >
                                    <Image
                                        source={{ uri: property.image || 'https://via.placeholder.com/150' }}
                                        className="w-16 h-16 rounded-lg bg-gray-200"
                                        resizeMode="cover"
                                    />
                                    <View className="flex-1 ml-3 justify-center">
                                        <Text className="font-rubik-bold text-sm text-gray-800" numberOfLines={1}>
                                            {property.name || 'BĐS không khả dụng'}
                                        </Text>
                                        <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                                            <Ionicons name="location-outline" size={10} /> {property.address}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <View className="mb-3">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center">
                                            <Ionicons name="person-circle-outline" size={16} color="#666" />
                                            <Text className="ml-2 text-sm text-gray-700 font-rubik-medium">
                                                {otherPersonLabel}: <Text className="text-black font-bold">{otherPerson?.name || 'Ẩn danh'}</Text>
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center bg-blue-50 self-start px-2 py-1 rounded-md mb-2">
                                        <Ionicons name="time-outline" size={14} color="#0061FF" />
                                        <Text className="ml-2 text-xs text-[#0061FF] font-rubik-medium">
                                            {formatDate(item.date)}
                                        </Text>
                                    </View>
                                    {item.note && <Text className="text-xs text-gray-500 italic">"Note: {item.note}"</Text>}
                                </View>

                                {/* NÚT BẤM */}
                                {item.status === 'pending' ? (
                                    <View className="pt-2 border-t border-gray-100 flex-row gap-3">
                                        {isBroker || isSeller ? (
                                            // BROKER & SELLER BUTTONS (Duyệt lịch)
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => handleReviewAction(item.$id, 'reject')}
                                                    className="flex-1 bg-red-50 py-2.5 rounded-lg border border-red-100 items-center"
                                                >
                                                    <Text className="text-red-600 font-bold text-xs">Từ chối</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleReviewAction(item.$id, 'confirm')}
                                                    className="flex-1 bg-green-600 py-2.5 rounded-lg shadow-sm items-center"
                                                >
                                                    <Text className="text-white font-bold text-xs">Chấp nhận</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            // BUYER BUTTON (Hủy lịch)
                                            <TouchableOpacity
                                                onPress={() => handleBuyerCancel(item.$id)}
                                                className="flex-1 bg-gray-100 py-2.5 rounded-lg items-center"
                                            >
                                                <Text className="text-gray-600 font-bold text-xs">Hủy yêu cầu</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View className={`self-start px-3 py-1 rounded-md mt-1 ${getStatusColor(item.status).split(' ')[1]}`}>
                                        <Text className={`text-xs font-bold ${getStatusColor(item.status).split(' ')[0]}`}>
                                            {getStatusText(item.status)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
};

export default BookingsScreen;