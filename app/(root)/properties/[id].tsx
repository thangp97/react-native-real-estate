import {
    FlatList,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Platform,
    Linking,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    Button,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";
import { facilities } from "@/constants/data";

import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById, togglePropertyFavorite, createBooking } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useState, useEffect } from "react";

type PropertyStatus = 'pending_approval' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired';

// Hàm helper để định dạng trạng thái và màu sắc
const formatStatus = (status: PropertyStatus) => {
    const statuses: Record<PropertyStatus, string> = {
        'pending_approval': 'Chờ duyệt',
        'for_sale': 'Đang bán',
        'deposit_paid': 'Đã cọc',
        'sold': 'Đã bán',
        'rejected': 'Bị từ chối',
        'expired': 'Hết hạn'
    };
    return statuses[status] || status;
};

const getStatusColor = (status: PropertyStatus) => {
    const colors: Record<PropertyStatus, string> = {
        'pending_approval': '#f0ad4e', // Vàng
        'for_sale': '#5cb85c',       // Xanh lá
        'deposit_paid': '#337ab7',       // Xanh dương
        'sold': '#d9534f',       // Đỏ
        'rejected': '#777',          // Xám
        'expired': '#777'           // Xám
    };
    return colors[status] || '#777';
};

const Property = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { user, refetch: refetchUser, setUser } = useGlobalContext(); // Lấy thêm hàm setUser

    const windowHeight = Dimensions.get("window").height;

    const { data: property, loading: loadingProperty } = useAppwrite({
        fn: getPropertyById,
        params: {
            id: id!,
        },
    });

    // State cho favorites
    const [isFavorite, setIsFavorite] = useState(false);
    const [toggling, setToggling] = useState(false);

    // State cho booking
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingNote, setBookingNote] = useState('');
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        // Kiểm tra xem user có danh sách favorites không và property hiện tại có trong đó không
        if (user?.favorites && Array.isArray(user.favorites) && id) {
            setIsFavorite(user.favorites.includes(id));
        }
    }, [user, id]);

    const handleToggleFavorite = async () => {
        if (!user) {
            Alert.alert("Thông báo", "Vui lòng đăng nhập để lưu tin này.");
            return;
        }
        if (!id) return;

        setToggling(true);
        try {
            const currentFavorites = user.favorites || [];
            const newFavorites = await togglePropertyFavorite(user.$id, id, currentFavorites);
            
            // Update local state
            const isNowFavorite = newFavorites.includes(id);
            setIsFavorite(isNowFavorite);
            
            // Cập nhật Global User State ngay lập tức (Optimistic Update)
            if (setUser) {
                setUser({
                    ...user,
                    favorites: newFavorites
                });
            }
            
            // Hiển thị thông báo thành công
            Alert.alert(
                "Thành công",
                isNowFavorite ? "Đã thêm vào mục yêu thích!" : "Đã xóa khỏi mục yêu thích."
            );
            
        } catch (error) {
            Alert.alert("Lỗi", "Không thể lưu tin. Vui lòng thử lại.");
            // Revert state nếu lỗi
            setIsFavorite(isFavorite); 
        } finally {
            setToggling(false);
        }
    };

    // Thông tin liên hệ của Sàn / Môi giới (Fallback)
    const DEFAULT_BROKER_ID = "66a010d1000b213b2e59"; 

    const PLATFORM_DEFAULT_BROKER = {
        name: "Chuyên viên tư vấn ReState",
        phone: "1900 1234",
        email: "tuvan@restate.vn",
        avatar: images.avatar
    };

    // Xác định môi giới hiện tại: ưu tiên từ property.agent, nếu không thì dùng mặc định sàn
    const currentBroker = property?.agent ? {
        name: property.agent.name,
        phone: property.agent.phone || PLATFORM_DEFAULT_BROKER.phone,
        email: property.agent.email,
        avatar: { uri: property.agent.avatar }
    } : PLATFORM_DEFAULT_BROKER;

    const handleOpenMap = () => {
        const address = property?.address;
        if (!address) return;

        // Luôn sử dụng Google Maps URL
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

        Linking.openURL(url).catch(err => console.error('Không thể mở Google Maps:', err));
    };

    const handleContact = (method: 'call' | 'sms' | 'email' = 'call') => {
        if (method === 'email') {
            Linking.openURL(`mailto:${currentBroker.email}`);
            return;
        }
        
        if (method === 'sms') {
            Linking.openURL(`sms:${currentBroker.phone}`);
        } else {
            Linking.openURL(`tel:${currentBroker.phone}`);
        }
    };

    const handleBookViewing = async () => {
        if (!user) {
             Alert.alert("Thông báo", "Vui lòng đăng nhập để đặt lịch.");
             return;
        }

        const targetAgentId = property?.brokerId || DEFAULT_BROKER_ID;

        setIsBooking(true);
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0); // 9 giờ sáng

            await createBooking({
                userId: user.$id,
                agentId: targetAgentId,
                propertyId: id,
                date: tomorrow.toISOString(),
                note: bookingNote
            });

            Alert.alert("Thành công", `Yêu cầu đặt lịch đã được gửi. ${currentBroker.name} sẽ liên hệ xác nhận với bạn.`);
            setBookingModalVisible(false);
            setBookingNote('');
        } catch (error: any) {
            console.error("Booking error:", error);
            Alert.alert("Lỗi", "Không thể đặt lịch. Vui lòng thử lại.");
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-32 bg-white"
            >
                <View className="relative w-full" style={{ height: windowHeight / 2 }}>
                    <Image
                        source={{ uri: property?.image }}
                        className="size-full"
                        resizeMode="cover"
                    />
                    <Image
                        source={images.whiteGradient}
                        className="absolute top-0 w-full z-40"
                    />

                    <View
                        className="z-50 absolute inset-x-7"
                        style={{
                            top: Platform.OS === "ios" ? 70 : 20,
                        }}
                    >
                        <View className="flex flex-row items-center w-full justify-between">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
                            >
                                <Image source={icons.backArrow} className="size-5" />
                            </TouchableOpacity>

                            <View className="flex flex-row items-center gap-3">
                                <TouchableOpacity onPress={handleToggleFavorite} disabled={toggling}>
                                    <Image
                                        source={icons.heart}
                                        className="size-7"
                                        tintColor={isFavorite ? "#d9534f" : "#191D31"} // Đỏ nếu đã thích, đen nếu chưa
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleContact('sms')}>
                                     <Image source={icons.send} className="size-7" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-5 mt-7 flex gap-2">
                    <Text className="text-2xl font-rubik-extrabold">
                        {property?.name}
                    </Text>

                    <View className="flex flex-row items-center gap-3 flex-wrap">
                        <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
                            <Text className="text-xs font-rubik-bold text-primary-300">
                                {property?.type}
                            </Text>
                        </View>

                        {property?.status && (
                            <View style={{ backgroundColor: getStatusColor(property.status) }} className="flex flex-row items-center px-4 py-2 rounded-full">
                                <Text className="text-xs font-rubik-bold text-white">
                                    {formatStatus(property.status)}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="flex flex-row items-center mt-5">
                        <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
                            <Image source={icons.bed} className="size-4" />
                        </View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                            {`${property?.bedrooms || ''} phòng ngủ`}
                        </Text>
                        <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
                            <Image source={icons.bath} className="size-4" />
                        </View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                            {`${property?.bathrooms || ''} phòng tắm`}
                        </Text>
                        <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
                            <Image source={icons.area} className="size-4" />
                        </View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                            {`${property?.area || ''} m²`}
                        </Text>
                    </View>

                    <View className="w-full border-t border-primary-200 pt-7 mt-5">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Đơn vị phụ trách
                        </Text>

                        <View className="flex flex-row items-center justify-between mt-4">
                            <View className="flex flex-row items-center">
                                <Image
                                    source={currentBroker.avatar}
                                    className="size-14 rounded-full"
                                />

                                <View className="flex flex-col items-start justify-center ml-3">
                                    <Text className="text-lg text-black-300 text-start font-rubik-bold">
                                        {currentBroker.name}
                                    </Text>
                                    <Text className="text-sm text-black-200 text-start font-rubik-medium">
                                        {currentBroker.email}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex flex-row items-center gap-3">
                                <TouchableOpacity onPress={() => handleContact('sms')}>
                                    <Image source={icons.chat} className="size-7" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleContact('call')}>
                                    <Image source={icons.phone} className="size-7" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Tổng quan
                        </Text>
                        <Text className="text-black-200 text-base font-rubik mt-2">
                            {property?.description}
                        </Text>
                    </View>

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Tiện nghi
                        </Text>

                        {property?.facilities?.length > 0 && (
                            <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                                {property?.facilities.map((item: string, index: number) => {
                                    const facility = facilities.find(
                                        (facility) => facility.title === item
                                    );

                                    return (
                                        <View
                                            key={index}
                                            className="flex flex-1 flex-col items-center min-w-16 max-w-20"
                                        >
                                            <View className="size-14 bg-primary-100 rounded-full flex items-center justify-center">
                                                <Image
                                                    source={facility ? facility.icon : icons.info}
                                                    className="size-6"
                                                />
                                            </View>

                                            <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                className="text-black-300 text-sm text-center font-rubik mt-1.5"
                                            >
                                                {item}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {property?.gallery?.length > 0 && (
                        <View className="mt-7">
                            <Text className="text-black-300 text-xl font-rubik-bold">
                                Thư viện ảnh
                            </Text>
                            <FlatList
                                contentContainerStyle={{ paddingRight: 20 }}
                                data={property?.gallery}
                                keyExtractor={(item) => item.$id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <Image
                                        source={{ uri: item.image }}
                                        className="size-40 rounded-xl"
                                    />
                                )}
                                contentContainerClassName="flex gap-4 mt-3"
                            />
                        </View>
                    )}

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Vị trí
                        </Text>
                        <View className="flex flex-row items-center justify-start mt-4 gap-2">
                            <Image source={icons.location} className="w-7 h-7" />
                            <Text className="text-black-200 text-sm font-rubik-medium">
                                {property?.address}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={handleOpenMap} className="relative mt-5">
                            <Image
                                source={images.map}
                                className="h-52 w-full rounded-xl"
                            />
                            <View className="absolute bottom-2 right-2 bg-white/90 px-3 py-1 rounded-full shadow-sm">
                                <Text className="text-xs font-rubik-bold text-primary-300">
                                    Chạm để xem bản đồ thực tế ↗
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
                <View className="flex flex-row items-center justify-between gap-10">
                    <View className="flex flex-col items-start">
                        <Text className="text-black-200 text-xs font-rubik-medium">
                            Giá
                        </Text>
                        <Text
                            numberOfLines={1}
                            className="text-primary-300 text-start text-2xl font-rubik-bold"
                        >
                            {property?.price ? `${property.price.toLocaleString('vi-VN')} VND` : ''}
                        </Text>
                    </View>

                    {property?.status === 'sold' ? (
                        <View className="flex-1 flex flex-row items-center justify-center bg-gray-400 py-3 rounded-full">
                            <Text className="text-white text-lg text-center font-rubik-bold">
                                Đã bán
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-1 flex-row gap-2">
                            <TouchableOpacity 
                                onPress={() => setBookingModalVisible(true)}
                                className="flex-1 flex flex-row items-center justify-center bg-primary-100 py-3 rounded-full"
                            >
                                <Text className="text-primary-300 text-base text-center font-rubik-bold">
                                    Đặt lịch
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                onPress={() => handleContact('call')}
                                className="flex-1 flex flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400"
                            >
                                <Text className="text-white text-lg text-center font-rubik-bold">
                                    Liên hệ
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={bookingModalVisible}
                onRequestClose={() => setBookingModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={{ width: '100%', alignItems: 'center' }}
                        >
                            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 20, width: '90%' }}>
                                <Text className="text-xl font-rubik-bold mb-4 text-center">Đặt lịch xem nhà</Text>
                                
                                <Text className="font-rubik-medium mb-2">Thời gian dự kiến:</Text>
                                <View className="bg-gray-100 p-3 rounded-lg mb-4">
                                     <Text className="text-black-300">Ngày mai, 9:00 AM</Text>
                                     <Text className="text-xs text-gray-500 mt-1">(Người bán sẽ liên hệ để chốt giờ chính xác)</Text>
                                </View>

                                <Text className="font-rubik-medium mb-2">Ghi chú cho người bán:</Text>
                                <TextInput 
                                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, height: 80, textAlignVertical: 'top', marginBottom: 20 }}
                                    placeholder="Tôi muốn xem nhà vào buổi sáng..."
                                    multiline
                                    value={bookingNote}
                                    onChangeText={setBookingNote}
                                />

                                <View className="flex-row justify-end gap-3">
                                    <Button title="Hủy" onPress={() => setBookingModalVisible(false)} color="#666" />
                                    <Button title={isBooking ? "Đang gửi..." : "Xác nhận"} onPress={handleBookViewing} disabled={isBooking} />
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

export default Property;
