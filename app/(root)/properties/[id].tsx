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
    Keyboard,
    Share // Added Share
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";
import { facilities } from "@/constants/data";
import { Card } from "@/components/Cards";

import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById, togglePropertyFavorite, createBooking, getSimilarProperties } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useState, useEffect, useRef, useCallback } from "react";
import { useComparisonContext } from "@/lib/comparison-provider";
import MortgageCalculator from "@/components/MortgageCalculator";

type PropertyStatus = 'pending_approval' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired' | 'approved' | 'available';
// ... (keep existing helper functions: formatStatus, getStatusColor) ...
// Hàm helper để định dạng trạng thái và màu sắc
const formatStatus = (status: PropertyStatus) => {
    const statuses: Record<PropertyStatus, string> = {
        'pending_approval': 'Chờ duyệt',
        'for_sale': 'Đang bán',
        'available': 'Đang bán',
        'approved': 'Đang bán',
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
        'available': '#5cb85c',      // Xanh lá
        'approved': '#5cb85c',       // Xanh lá
        'deposit_paid': '#337ab7',   // Xanh dương
        'sold': '#d9534f',           // Đỏ
        'rejected': '#777',          // Xám
        'expired': '#777'            // Xám
    };
    return colors[status] || '#777';
};

const Property = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { user, refetch: refetchUser, setUser } = useGlobalContext();
    const { addToCompare, removeFromCompare, isInCompare, compareList, clearCompare } = useComparisonContext();

    const windowHeight = Dimensions.get("window").height;
    const windowWidth = Dimensions.get("window").width;

    const { data: property, loading: loadingProperty } = useAppwrite({
        fn: getPropertyById,
        params: {
            id: id!,
        },
    });

    const [similarProperties, setSimilarProperties] = useState<any[]>([]);

    // State cho favorites
    const [isFavorite, setIsFavorite] = useState(false);
    const [toggling, setToggling] = useState(false);

    // State cho booking
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingNote, setBookingNote] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

    // State cho comparison modal
    const [comparisonModalVisible, setComparisonModalVisible] = useState(false);

    // Carousel Logic
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const allImages = property ? [property.image, ...(property.galleryImages || [])].filter(Boolean) : [];

    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentImageIndex(viewableItems[0].index || 0);
        }
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50
    };

    useEffect(() => {
        if (user?.favorites && Array.isArray(user.favorites) && id) {
            setIsFavorite(user.favorites.includes(id));
        }
    }, [user, id]);

    useEffect(() => {
        const fetchSimilar = async () => {
            if (property?.type && id) {
                const similar = await getSimilarProperties({ 
                    propertyId: id, 
                    type: property.type 
                });
                setSimilarProperties(similar);
            }
        };
        fetchSimilar();
    }, [property, id]);

    // Khởi tạo ngày mặc định là ngày mai 9h sáng
    useEffect(() => {
        if (bookingModalVisible) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            setSelectedDate(tomorrow);
        }
    }, [bookingModalVisible]);

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
            
            const isNowFavorite = newFavorites.includes(id);
            setIsFavorite(isNowFavorite);
            
            if (setUser) {
                setUser({
                    ...user,
                    favorites: newFavorites
                });
            }
            
            Alert.alert(
                "Thành công",
                isNowFavorite ? "Đã thêm vào mục yêu thích!" : "Đã xóa khỏi mục yêu thích."
            );
            
        } catch (error) {
            Alert.alert("Lỗi", "Không thể lưu tin. Vui lòng thử lại.");
            setIsFavorite(isFavorite); 
        } finally {
            setToggling(false);
        }
    };

    const handleToggleCompare = () => {
        if (!property) return;
        
        if (isInCompare(property.$id)) {
            removeFromCompare(property.$id);
            Alert.alert("Đã xóa", "Đã xóa khỏi danh sách so sánh.");
        } else {
            addToCompare({
                $id: property.$id,
                name: property.name,
                price: property.price,
                area: property.area,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                address: property.address,
                image: property.image,
                type: property.type,
                facilities: property.facilities || []
            });
        }
    };

    const DEFAULT_BROKER_ID = "66a010d1000b213b2e59"; 

    const PLATFORM_DEFAULT_BROKER = {
        name: "Chuyên viên tư vấn ReState",
        phone: "1900 1234",
        email: "tuvan@restate.vn",
        avatar: images.avatar
    };

    const currentBroker = property?.agent ? {
        name: property.agent.name,
        phone: property.agent.phone || PLATFORM_DEFAULT_BROKER.phone,
        email: property.agent.email,
        avatar: { uri: property.agent.avatar }
    } : PLATFORM_DEFAULT_BROKER;

    const handleOpenMap = () => {
        const address = property?.address;
        if (!address) return;
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

    const onChangeDate = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (date) {
            setSelectedDate(date);
        }
    };

    const showMode = (currentMode: 'date' | 'time') => {
        setShowDatePicker(true);
        setDatePickerMode(currentMode);
    };

    const handleShare = async () => {
        if (!property) return;

        try {
            const deepLinkBase = 'restate://properties/';
            const propertyLink = `${deepLinkBase}${property.$id}`;

            const result = await Share.share({
                message: `Xem bất động sản "${property.name}" với giá ${property.price?.toLocaleString('vi-VN')} VND tại ${property.address} trên ứng dụng của chúng tôi! Chi tiết: ${propertyLink}`,
                url: propertyLink
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    console.log('Shared with:', result.activityType);
                } else {
                    console.log('Shared successfully');
                }
            } else if (result.action === Share.dismissedAction) {
                console.log('Share dismissed');
            }
        } catch (error: any) {
            Alert.alert("Lỗi", "Không thể chia sẻ. Vui lòng thử lại.");
            console.error(error.message);
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
            await createBooking({
                userId: user.$id,
                agentId: targetAgentId,
                propertyId: id,
                date: selectedDate.toISOString(),
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
        <View style={{ flex: 1 }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-32 bg-white"
            >
                <View className="relative w-full" style={{ height: windowHeight / 2 }}>
                    <FlatList
                        data={allImages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: item }}
                                style={{ width: windowWidth, height: windowHeight / 2 }}
                                resizeMode="cover"
                            />
                        )}
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
                                <TouchableOpacity 
                                    onPress={handleShare}
                                    className="flex flex-row bg-white/90 rounded-full size-11 items-center justify-center shadow-sm"
                                >
                                    <Image
                                        source={icons.send} // Using send icon for share
                                        className="size-6"
                                        tintColor={"#191D31"}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={handleToggleCompare} 
                                    className="flex flex-row bg-white/90 rounded-full size-11 items-center justify-center shadow-sm"
                                >
                                    <Image
                                        source={icons.info} 
                                        className="size-6"
                                        tintColor={isInCompare(id!) ? "#0061FF" : "#191D31"}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleToggleFavorite} disabled={toggling}>
                                    <Image
                                        source={icons.heart}
                                        className="size-7"
                                        tintColor={isFavorite ? "#d9534f" : "#191D31"}
                                    />
                                </TouchableOpacity>
                                
                            </View>
                        </View>
                    </View>

                    {/* Page Indicator */}
                    {allImages.length > 1 && (
                        <View className="absolute bottom-5 right-5 bg-black/50 px-3 py-1 rounded-full z-50">
                            <Text className="text-white font-rubik-medium text-xs">
                                {currentImageIndex + 1} / {allImages.length}
                            </Text>
                        </View>
                    )}
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
                    
                    {property?.price && <MortgageCalculator propertyPrice={property.price} />}

                    {similarProperties.length > 0 && (
                        <View className="mt-7">
                            <Text className="text-black-300 text-xl font-rubik-bold mb-4">
                                Có thể bạn sẽ thích
                            </Text>
                            <FlatList
                                data={similarProperties}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 15 }}
                                keyExtractor={(item) => item.$id}
                                renderItem={({ item }) => (
                                    <View style={{ width: 220 }}>
                                        <Card 
                                            item={item} 
                                            onPress={() => router.push(`/properties/${item.$id}`)} 
                                        />
                                    </View>
                                )}
                            />
                        </View>
                    )}

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

            {/* Floating Compare Button */}
            {compareList.length > 0 && (
                <View className="absolute bottom-28 right-5 z-50">
                    <TouchableOpacity
                        onPress={() => setComparisonModalVisible(true)}
                        className="bg-primary-300 px-4 py-3 rounded-full shadow-lg flex-row items-center gap-2"
                    >
                        <Image source={icons.info} className="size-5" tintColor="white" />
                        <Text className="text-white font-rubik-bold">
                            So sánh ({compareList.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

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
                                <View className="bg-gray-100 p-3 rounded-lg mb-4 flex-row justify-between items-center">
                                     <View>
                                         <Text className="text-black-300 font-rubik-bold text-base">
                                            {selectedDate.toLocaleDateString('vi-VN')}
                                         </Text>
                                         <Text className="text-primary-300 font-rubik-medium">
                                            {selectedDate.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                         </Text>
                                     </View>
                                     <View className="flex-row gap-2">
                                        <Button title="Ngày" onPress={() => showMode('date')} />
                                        <Button title="Giờ" onPress={() => showMode('time')} />
                                     </View>
                                </View>
                                
                                {showDatePicker && (
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={selectedDate}
                                        mode={datePickerMode}
                                        is24Hour={true}
                                        display="default"
                                        onChange={onChangeDate}
                                        minimumDate={new Date()}
                                    />
                                )}

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

            {/* Comparison Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={comparisonModalVisible}
                onRequestClose={() => setComparisonModalVisible(false)}
            >
                <SafeAreaView className="flex-1 bg-white">
                    <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100"
                          style={{ paddingTop: Platform.OS === 'ios' ? 0 : 10 }} // Adjust padding for Android
                    >
                        <Text className="text-xl font-rubik-bold text-black-300">So sánh Bất động sản</Text>
                        <View className="flex-row gap-4">
                            <TouchableOpacity onPress={clearCompare}>
                                <Text className="text-primary-300 font-rubik-medium">Xóa hết</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setComparisonModalVisible(false)}>
                                <Text className="text-black-200 text-lg">✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row p-5 gap-5">
                            {/* Labels Column */}
                            <View className="w-24 pt-40 gap-8 mt-5">
                                <Text className="font-rubik-medium text-black-200">Giá</Text>
                                <Text className="font-rubik-medium text-black-200">Diện tích</Text>
                                <Text className="font-rubik-medium text-black-200">Phòng ngủ</Text>
                                <Text className="font-rubik-medium text-black-200">Phòng tắm</Text>
                                <Text className="font-rubik-medium text-black-200">Loại hình</Text>
                                <Text className="font-rubik-medium text-black-200">Địa chỉ</Text>
                            </View>

                            {/* Property Columns */}
                            {compareList.map((item) => (
                                <View key={item.$id} className="w-48 bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                                    <TouchableOpacity 
                                        onPress={() => removeFromCompare(item.$id)}
                                        className="absolute top-2 right-2 z-10 bg-white rounded-full p-1 shadow-sm"
                                    >
                                        <Text className="text-xs text-red-500 font-bold">✕</Text>
                                    </TouchableOpacity>
                                    
                                    <Image source={{ uri: item.image }} className="w-full h-32 rounded-xl mb-3" />
                                    <Text numberOfLines={2} className="font-rubik-bold text-black-300 mb-6 h-12 text-center">
                                        {item.name}
                                    </Text>
                                    
                                    <View className="gap-8">
                                        <Text className="font-rubik-bold text-primary-300 text-center">
                                            {item.price.toLocaleString()}
                                        </Text>
                                        <Text className="font-rubik-medium text-center">{item.area} m²</Text>
                                        <Text className="font-rubik-medium text-center">{item.bedrooms}</Text>
                                        <Text className="font-rubik-medium text-center">{item.bathrooms}</Text>
                                        <Text className="font-rubik-medium text-center">{item.type}</Text>
                                        <Text numberOfLines={3} className="font-rubik text-xs text-center h-12 text-gray-500">
                                            {item.address}
                                        </Text>
                                    </View>
                                    
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setComparisonModalVisible(false);
                                            router.push(`/properties/${item.$id}`);
                                        }}
                                        className="mt-6 bg-primary-300 py-2 rounded-lg"
                                    >
                                        <Text className="text-white text-center font-rubik-bold text-xs">Xem chi tiết</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {compareList.length < 2 && (
                                <View className="w-48 bg-gray-100 rounded-2xl items-center justify-center border-2 border-dashed border-gray-300">
                                    <Text className="text-gray-400 font-rubik text-center px-4">
                                        Thêm BĐS khác để so sánh
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

export default Property;
