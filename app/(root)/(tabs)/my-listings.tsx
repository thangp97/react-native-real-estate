import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Modal, TextInput, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
// Đảm bảo import đúng đường dẫn API Broker
import { getMyActiveProperties } from '@/lib/api/seller';
import { updatePropertyStatus, getUserByPhone } from '@/lib/api/broker';
import { getUserProfileById } from '@/lib/appwrite';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = 100; // Kích thước ảnh thumbnail

const MyListingsScreen = () => {
    const { user } = useGlobalContext();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // State cho Modal cập nhật trạng thái
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [targetStatus, setTargetStatus] = useState<'deposit_paid' | 'sold'>('deposit_paid');
    
    // State cho flow tìm kiếm user
    const [step, setStep] = useState<1 | 2>(1); // 1: Nhập SĐT, 2: Xác nhận thông tin
    const [buyerPhone, setBuyerPhone] = useState('');
    const [foundBuyer, setFoundBuyer] = useState<any>(null);
    const [searching, setSearching] = useState(false);

    const openUpdateModal = async (item: any, status: 'deposit_paid' | 'sold') => {
        setSelectedProperty(item);
        setTargetStatus(status);
        setBuyerPhone('');
        setFoundBuyer(null);
        setModalVisible(true);

        // Logic tự động lấy thông tin người đặt cọc nếu đang xác nhận BÁN
        if (status === 'sold' && item.status === 'deposit_paid' && item.buyerId) {
            setSearching(true);
            try {
                const depositor = await getUserProfileById(item.buyerId);
                if (depositor) {
                    setFoundBuyer(depositor);
                    setBuyerPhone(depositor.phoneNumber || ''); // Fill SĐT nếu có
                    setStep(2); // Nhảy thẳng sang bước xác nhận
                } else {
                    setStep(1); // Không tìm thấy thì quay lại bước tìm kiếm
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin người cọc:", error);
                setStep(1);
            } finally {
                setSearching(false);
            }
        } else {
            setStep(1);
        }
    };

    const handleSearchBuyer = async () => {
        if (!buyerPhone || buyerPhone.length < 9) {
            Alert.alert("Lỗi", "Vui lòng nhập số điện thoại hợp lệ.");
            return;
        }
        
        setSearching(true);
        try {
            const buyer = await getUserByPhone(buyerPhone);
            if (buyer) {
                setFoundBuyer(buyer);
                setStep(2);
            } else {
                Alert.alert("Không tìm thấy", "Không tìm thấy người dùng với số điện thoại này trong hệ thống.");
            }
        } catch (error) {
            Alert.alert("Lỗi", "Đã có lỗi xảy ra khi tìm kiếm.");
        } finally {
            setSearching(false);
        }
    };

    const handleConfirmUpdate = async () => {
        if (!foundBuyer) return;

        try {
            await updatePropertyStatus(
                selectedProperty.$id,
                targetStatus,
                foundBuyer.$id
            );
            
            Alert.alert(
                "Thành công", 
                `Đã xác nhận ${targetStatus === 'deposit_paid' ? 'Đặt cọc' : 'Bán'} cho khách hàng ${foundBuyer.name}.`
            );
            
            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể cập nhật trạng thái. Vui lòng thử lại.");
        }
    };

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
                    </View>

                    {/* Action Buttons */}
                    {(item.status === 'approved' || item.status === 'deposit_paid') && (
                        <View className="flex-row mt-2 justify-end">
                            {item.status !== 'deposit_paid' && (
                                <TouchableOpacity 
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        openUpdateModal(item, 'deposit_paid');
                                    }}
                                    className="bg-blue-100 px-3 py-1.5 rounded-lg mr-2"
                                >
                                    <Text className="text-blue-700 text-xs font-bold">Xác nhận Cọc</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    openUpdateModal(item, 'sold');
                                }}
                                className="bg-red-100 px-3 py-1.5 rounded-lg"
                            >
                                <Text className="text-red-700 text-xs font-bold">Xác nhận Bán</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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

            {/* Modal Update Status */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 justify-end bg-black/50"
                >
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View className="flex-1" />
                    </TouchableWithoutFeedback>
                    <View className="bg-white rounded-t-3xl p-6 h-[50%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-rubik-bold text-black-300">
                                Xác nhận {targetStatus === 'deposit_paid' ? 'Đã Cọc' : 'Đã Bán'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {step === 1 ? (
                            // Step 1: Nhập số điện thoại
                            <View className="flex-1">
                                <Text className="text-gray-500 font-rubik mb-4">
                                    Vui lòng nhập số điện thoại của người mua để tìm kiếm tài khoản trong hệ thống.
                                </Text>
                                <View>
                                    <Text className="text-sm font-rubik-medium mb-2 text-black-300">Số Điện Thoại Khách Hàng</Text>
                                    <TextInput
                                        className="bg-gray-100 p-4 rounded-xl font-rubik text-black-300 text-lg"
                                        placeholder="Ví dụ: 0912345678"
                                        keyboardType="phone-pad"
                                        value={buyerPhone}
                                        onChangeText={setBuyerPhone}
                                        autoFocus
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={handleSearchBuyer}
                                    disabled={searching}
                                    className={`bg-primary-300 py-4 rounded-full items-center mt-6 ${searching ? 'opacity-70' : ''}`}
                                >
                                    {searching ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-rubik-bold text-lg">Tìm Kiếm</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            // Step 2: Xác nhận thông tin
                            <View className="flex-1 justify-between">
                                <View>
                                    <Text className="text-green-600 font-rubik-medium mb-4 text-center">
                                        <Ionicons name="checkmark-circle" size={20} /> Đã tìm thấy tài khoản
                                    </Text>
                                    
                                    <View className="bg-gray-50 p-4 rounded-2xl flex-row items-center border border-gray-100">
                                        <Image 
                                            source={{ uri: foundBuyer?.avatar || 'https://via.placeholder.com/100' }} 
                                            className="w-16 h-16 rounded-full bg-gray-200"
                                        />
                                        <View className="ml-4">
                                            <Text className="text-lg font-rubik-bold text-black-300">{foundBuyer?.name}</Text>
                                            <Text className="text-gray-500 font-rubik">{foundBuyer?.email}</Text>
                                            <Text className="text-primary-300 font-rubik-medium mt-1">{buyerPhone}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View className="flex-row gap-3 mt-4">
                                     <TouchableOpacity
                                        onPress={() => setStep(1)}
                                        className="flex-1 bg-gray-200 py-4 rounded-full items-center"
                                    >
                                        <Text className="text-gray-700 font-rubik-bold text-lg">Quay lại</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleConfirmUpdate}
                                        className="flex-1 bg-primary-300 py-4 rounded-full items-center"
                                    >
                                        <Text className="text-white font-rubik-bold text-lg">Xác Nhận</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <View className="h-4" /> 
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

export default MyListingsScreen;