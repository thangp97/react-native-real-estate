import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio, ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Alert,
    Button,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Share // Added Share
    ,




    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/Cards";
import icons from "@/constants/icons";
import images from "@/constants/images";

import MortgageCalculator from "@/components/MortgageCalculator";
import { createBooking, getPropertyById, getSimilarProperties, togglePropertyFavorite } from "@/lib/api/buyer";
import { useComparisonContext } from "@/lib/comparison-provider";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { useCallback, useEffect, useState } from "react";

import { getUserByEmail, markPropertyAsSold, updatePropertyPrice } from "@/lib/api/broker";
import { checkReviewExists, createReview } from "@/lib/api/rating";
import { formatStatus, getStatusColor } from "@/lib/utils";

type PropertyStatus = 'pending_approval' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired' | 'approved' | 'available';

const Property = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const router = useRouter(); // Initialize useRouter hook
    const { user, refetch: refetchUser, setUser } = useGlobalContext();
    const { addToCompare, removeFromCompare, isInCompare, compareList, clearCompare } = useComparisonContext();

    const [loading, setLoading] = useState(true); // Restore loading state

    const windowHeight = Dimensions.get("window").height;
    const windowWidth = Dimensions.get("window").width;

    const { data: property, loading: loadingProperty } = useAppwrite({
        fn: getPropertyById,
        params: {
            id: id!,
        },
    });

    useEffect(() => {
        setLoading(loadingProperty);
    }, [loadingProperty]);

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

    // State for Update Price Logic
    const [priceModalVisible, setPriceModalVisible] = useState(false);
    const [newPriceInput, setNewPriceInput] = useState('');
    const [updatingPrice, setUpdatingPrice] = useState(false);

    // Configure audio mode for video playback
    useEffect(() => {
        const configureAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });
            } catch (error) {
                console.warn('Error setting audio mode:', error);
            }
        };
        configureAudio();
    }, []);

    const handleUpdatePrice = async () => {
        const price = parseInt(newPriceInput.replace(/\D/g, ''));
        if (!price || price <= 0) {
            Alert.alert("Lỗi", "Vui lòng nhập giá hợp lệ.");
            return;
        }

        setUpdatingPrice(true);
        try {
            await updatePropertyPrice(id!, price, user!.$id);
            Alert.alert("Thành công", "Đã cập nhật giá mới!");
            setPriceModalVisible(false);
            // Reload page to reflect new price
            router.replace({ pathname: '/properties/[id]', params: { id } });
        } catch (error) {
            Alert.alert("Lỗi", "Không thể cập nhật giá. Vui lòng thử lại.");
        } finally {
            setUpdatingPrice(false);
        }
    };


    // State for Review
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [ratingValue, setRatingValue] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [hasReviewed, setHasReviewed] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);

    // State for Sold Logic
    const [soldModalVisible, setSoldModalVisible] = useState(false);
    const [buyerEmail, setBuyerEmail] = useState('');
    const [markingSold, setMarkingSold] = useState(false);

    const handleMarkAsSold = async () => {
        if (!buyerEmail.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập Email người mua.");
            return;
        }

        setMarkingSold(true);
        try {
            // 1. Tìm người mua
            const buyer = await getUserByEmail(buyerEmail.trim());
            if (!buyer) {
                Alert.alert("Lỗi", "Không tìm thấy người dùng với Email này trong hệ thống.");
                setMarkingSold(false);
                return;
            }

            // 2. Cập nhật trạng thái
            await markPropertyAsSold(id!, buyer.$id);
            
            Alert.alert("Thành công", `Đã xác nhận bán cho ${buyer.name} (${buyer.email})`);
            setSoldModalVisible(false);
            // Reload page to reflect new price
            router.replace({ pathname: '/properties/[id]', params: { id } });
            
        } catch (error) {
            Alert.alert("Lỗi", "Không thể cập nhật trạng thái. Vui lòng thử lại.");
        } finally {
            setMarkingSold(false);
        }
    };

    const isAgent = user && property?.agent && user.$id === property.agent.$id;

    useEffect(() => {
        if (property?.status === 'sold' && user?.$id) {
            checkReviewExists(user.$id, id!).then(exists => setHasReviewed(exists));
        }
    }, [property, user, id]);

    const handleSubmitReview = async () => {
        if (!user || !property) return;
        
        let targetAgentId = DEFAULT_BROKER_ID;
        if (property?.agent?.$id) targetAgentId = property.agent.$id;
        else if (property?.brokerId) targetAgentId = typeof property.brokerId === 'object' ? property.brokerId.$id : property.brokerId;

        setSubmittingReview(true);
        try {
            await createReview({
                reviewerId: user.$id,
                agentId: targetAgentId,
                propertyId: id!,
                rating: ratingValue,
                comment: reviewComment
            });
            Alert.alert("Cảm ơn", "Đánh giá của bạn đã được gửi!");
            setHasReviewed(true);
            setReviewModalVisible(false);
        } catch (error) {
            Alert.alert("Lỗi", "Không thể gửi đánh giá. Vui lòng thử lại.");
        } finally {
            setSubmittingReview(false);
        }
    };

    useEffect(() => {
        if (property?.status === 'sold' && user?.$id) {
            checkReviewExists(user.$id, id!).then(exists => setHasReviewed(exists));
        }
    }, [property, user, id]);

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
            const isFav = user.favorites.some((item: any) => {
                const itemId = typeof item === 'string' ? item : item.$id;
                return itemId === id;
            });
            setIsFavorite(isFav);
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
            // Extract IDs if favorites are objects
            const currentFavorites = (user.favorites || []).map((item: any) => 
                typeof item === 'string' ? item : item.$id
            );
            
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

        let targetAgentId = DEFAULT_BROKER_ID;
        let successMessage = `Yêu cầu đặt lịch đã được gửi. ${currentBroker.name} sẽ liên hệ xác nhận với bạn.`;

        // Logic Booking cho Broker -> Book lịch với SELLER
        if (user.role === 'broker') {
             // Lấy Seller ID (Chủ nhà)
             const sellerId = property?.sellerInfo?.$id || (typeof property?.seller === 'object' ? property?.seller?.$id : property?.seller);
             
             if (sellerId && sellerId !== 'unknown') {
                 // Khi môi giới đặt lịch với người bán:
                 // - Môi giới là agent
                 // - Người bán là user
                 setIsBooking(true);
                 try {
                     await createBooking({
                         userId: sellerId, // Người bán là user
                         agentId: user.$id, // Môi giới là agent
                         propertyId: id,
                         date: selectedDate.toISOString(),
                         note: bookingNote
                     });
                     Alert.alert("Thành công", "Yêu cầu đặt lịch với Chủ nhà đã được gửi. Chủ nhà sẽ nhận được thông báo.");
                     setBookingModalVisible(false);
                     setBookingNote('');
                 } catch (error: any) {
                     console.error("Lỗi đặt lịch:", error);
                     Alert.alert("Lỗi", "Không thể đặt lịch. Vui lòng thử lại.");
                 } finally {
                     setIsBooking(false);
                 }
                 return; // Return sớm để không chạy logic phía dưới
             } else {
                 console.warn("Không tìm thấy ID chủ nhà, fallback về Broker mặc định");
             }
        } else {
            // Logic cũ cho Buyer -> Book lịch với BROKER
            if (property?.brokerId) {
                targetAgentId = typeof property.brokerId === 'object' ? property.brokerId.$id : property.brokerId;
            }
        }

        setIsBooking(true);
        try {
            await createBooking({
                userId: user.$id,
                agentId: targetAgentId,
                propertyId: id,
                date: selectedDate.toISOString(),
                note: bookingNote
            });

            Alert.alert("Thành công", successMessage);
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

                {/* Video Section */}
                {property?.video && (
                    <View className="px-5 mt-7">
                        <Text className="text-xl font-rubik-bold text-black-300 mb-4">
                            🎥 Video giới thiệu
                        </Text>
                        <Video
                            source={{ uri: property.video }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping={false}
                            volume={1.0}
                            isMuted={false}
                            style={{
                                width: '100%',
                                height: 220,
                                borderRadius: 12,
                                backgroundColor: '#000',
                            }}
                        />
                    </View>
                )}

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
                            <TouchableOpacity
                                onPress={() => {
                                    if (property?.agent?.$id) {
                                        router.push(`/broker-details/${property.agent.$id}`);
                                    } else if (property?.brokerId) {
                                        const brokerId = typeof property.brokerId === 'object' ? property.brokerId.$id : property.brokerId;
                                        router.push(`/broker-details/${brokerId}`);
                                    }
                                }}
                                className="flex flex-row items-center"
                            >
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
                            </TouchableOpacity>

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
                            Đặc điểm bất động sản
                        </Text>

                        <View className="flex flex-row flex-wrap items-start justify-between mt-4 gap-4">
                            {[
                                { label: 'Diện tích', value: property?.area ? `${property.area} m²` : 'Đang cập nhật', icon: icons.area },
                                { label: 'Số tầng', value: property?.floors || 'Đang cập nhật', icon: icons.home },
                                { label: 'Mặt tiền', value: property?.frontage ? `${property.frontage} m` : 'Đang cập nhật', icon: icons.info },
                                { label: 'Chiều sâu', value: property?.depth ? `${property.depth} m` : 'Đang cập nhật', icon: icons.info },
                                { label: 'Đường rộng', value: property?.roadWidth ? `${property.roadWidth} m` : 'Đang cập nhật', icon: icons.carPark },
                                { 
                                    label: 'Hướng', 
                                    value: (() => {
                                        const directions: Record<string, string> = {
                                            'East': 'Đông', 'West': 'Tây', 'South': 'Nam', 'North': 'Bắc',
                                            'North East': 'Đông Bắc', 'North West': 'Tây Bắc', 'South East': 'Đông Nam', 'South West': 'Tây Nam'
                                        };
                                        return directions[property?.direction] || property?.direction || 'Đang cập nhật';
                                    })(), 
                                    icon: icons.location 
                                },
                            ].map((item, index) => (
                                <View
                                    key={index}
                                    className="flex flex-col items-center w-[48%] mb-6 p-2"
                                >
                                    <View className="size-16 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                                        <Image
                                            source={item.icon}
                                            className="size-8"
                                            tintColor="#0061FF"
                                        />
                                    </View>
                                    <Text className="text-black-200 text-sm font-rubik text-center mb-1">
                                        {item.label}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        className="text-black-300 text-lg text-center font-rubik-bold"
                                    >
                                        {item.value}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>



                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Vị trí
                        </Text>
                        <View className="flex flex-row items-center justify-start mt-4 gap-3">
                            <Image source={icons.location} className="w-9 h-9" />
                            <Text className="text-black-200 text-lg font-rubik-medium flex-1">
                                {property?.address}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={handleOpenMap} className="relative mt-5">
                            <Image
                                source={images.map}
                                className="h-80 w-full rounded-xl"
                            />
                            <View className="absolute bottom-4 right-4 bg-white/90 px-4 py-2 rounded-full shadow-md">
                                <Text className="text-sm font-rubik-bold text-primary-300">
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

                

                            {/* Review Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={reviewModalVisible}
                onRequestClose={() => setReviewModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 20, width: '85%' }}>
                            <Text className="text-xl font-rubik-bold mb-4 text-center">Đánh giá Môi giới</Text>
                            
                            <Text className="text-center text-gray-500 mb-4">
                                Bạn đánh giá thế nào về {currentBroker.name} trong giao dịch này?
                            </Text>

                            {/* Star Rating */}
                            <View className="flex-row justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                                        <Image 
                                            source={icons.star} 
                                            className="w-10 h-10" 
                                            tintColor={star <= ratingValue ? "#FFD700" : "#E0E0E0"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="font-rubik-medium mb-2">Nhận xét của bạn:</Text>
                            <TextInput 
                                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, height: 100, textAlignVertical: 'top', marginBottom: 20 }}
                                placeholder="Môi giới rất nhiệt tình, chuyên nghiệp..."
                                multiline
                                value={reviewComment}
                                onChangeText={setReviewComment}
                            />

                            <View className="flex-row justify-end gap-3">
                                <Button title="Đóng" onPress={() => setReviewModalVisible(false)} color="#666" />
                                <Button title={submittingReview ? "Đang gửi..." : "Gửi đánh giá"} onPress={handleSubmitReview} disabled={submittingReview} />
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Review Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={reviewModalVisible}
                onRequestClose={() => setReviewModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 20, width: '85%' }}>
                            <Text className="text-xl font-rubik-bold mb-4 text-center">Đánh giá Môi giới</Text>
                            
                            <Text className="text-center text-gray-500 mb-4">
                                Bạn đánh giá thế nào về {currentBroker.name} trong giao dịch này?
                            </Text>

                            {/* Star Rating */}
                            <View className="flex-row justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                                        <Image 
                                            source={icons.star} 
                                            className="w-10 h-10" 
                                            tintColor={star <= ratingValue ? "#FFD700" : "#E0E0E0"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="font-rubik-medium mb-2">Nhận xét của bạn:</Text>
                            <TextInput 
                                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, height: 100, textAlignVertical: 'top', marginBottom: 20 }}
                                placeholder="Môi giới rất nhiệt tình, chuyên nghiệp..."
                                multiline
                                value={reviewComment}
                                onChangeText={setReviewComment}
                            />

                            <View className="flex-row justify-end gap-3">
                                <Button title="Đóng" onPress={() => setReviewModalVisible(false)} color="#666" />
                                <Button title={submittingReview ? "Đang gửi..." : "Gửi đánh giá"} onPress={handleSubmitReview} disabled={submittingReview} />
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Price Update Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={priceModalVisible}
                onRequestClose={() => setPriceModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 20, width: '85%' }}>
                            <Text className="text-xl font-rubik-bold mb-4 text-center">Cập nhật Giá Thị trường</Text>
                            
                            <Text className="text-center text-gray-500 mb-4">
                                Nhập giá mới cho bất động sản này.
                            </Text>

                            <Text className="font-rubik-medium mb-2">Giá mới (VNĐ):</Text>
                            <TextInput 
                                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 20 }}
                                placeholder="Ví dụ: 5000000000"
                                keyboardType="numeric"
                                value={newPriceInput}
                                onChangeText={(text) => {
                                    setNewPriceInput(text);
                                }}
                            />

                            <View className="flex-row justify-end gap-3">
                                <Button title="Hủy" onPress={() => setPriceModalVisible(false)} color="#666" />
                                <Button title={updatingPrice ? "Đang lưu..." : "Lưu thay đổi"} onPress={handleUpdatePrice} disabled={updatingPrice} />
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Sold Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={soldModalVisible}
                onRequestClose={() => setSoldModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 20, width: '85%' }}>
                            <Text className="text-xl font-rubik-bold mb-4 text-center">Xác nhận Giao dịch Thành công</Text>
                            
                            <Text className="text-center text-gray-500 mb-4">
                                Vui lòng nhập Email của người mua để hệ thống ghi nhận giao dịch và cấp quyền đánh giá.
                            </Text>

                            <Text className="font-rubik-medium mb-2">Email Người Mua:</Text>
                            <TextInput 
                                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 20 }}
                                placeholder="nguoimua@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={buyerEmail}
                                onChangeText={setBuyerEmail}
                            />

                            <View className="flex-row justify-end gap-3">
                                <Button title="Hủy" onPress={() => setSoldModalVisible(false)} color="#666" />
                                <Button title={markingSold ? "Đang xử lý..." : "Xác nhận"} onPress={handleMarkAsSold} disabled={markingSold} />
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
                <View className="flex flex-row items-center justify-between gap-3">
                    <View className="flex flex-col items-start flex-shrink">
                        <Text className="text-black-200 text-xs font-rubik-medium">
                            Giá
                        </Text>
                        <Text
                            numberOfLines={1}
                            className="text-primary-300 text-start text-xl font-rubik-bold"
                        >
                            {property?.price ? `${property.price.toLocaleString('vi-VN')} VND` : ''}
                        </Text>
                    </View>
                    {property?.status === 'sold' ? (
                        (property.buyerId === user?.$id) ? (
                            hasReviewed ? (
                                <View className="flex-1 flex flex-row items-center justify-center bg-gray-200 py-3 rounded-full flex-shrink">
                                    <Text className="text-gray-500 text-base text-center font-rubik-bold">
                                        Đã đánh giá
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => setReviewModalVisible(true)}
                                    className="flex-1 flex flex-row items-center justify-center bg-yellow-500 py-3 rounded-full flex-shrink shadow-md"
                                >
                                    <Text className="text-white text-base text-center font-rubik-bold">
                                        ★ Đánh giá Môi giới
                                    </Text>
                                </TouchableOpacity>
                            )
                        ) : (
                            <View className="flex-1 flex-row items-center justify-center bg-gray-400 py-3 rounded-full flex-shrink">
                                <Text className="text-white text-lg text-center font-rubik-bold">
                                    Đã bán
                                </Text>
                            </View>
                        )
                    ) : isAgent ? (
                        <View className="flex-1 flex-row gap-2">
                            <TouchableOpacity 
                                onPress={() => {
                                    setNewPriceInput(property?.price?.toString() || '');
                                    setPriceModalVisible(true);
                                }}
                                className="flex-1 flex flex-row items-center justify-center bg-blue-500 py-3 rounded-full shadow-md"
                            >
                                <Text className="text-white text-sm text-center font-rubik-bold">
                                    Cập nhật Giá
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                onPress={() => setSoldModalVisible(true)}
                                className="flex-1 flex flex-row items-center justify-center bg-green-600 py-3 rounded-full shadow-md"
                            >
                                <Text className="text-white text-sm text-center font-rubik-bold">
                                    Chốt đơn
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="flex-1 flex-row gap-2 flex-shrink">
                            <TouchableOpacity 
                                onPress={() => setBookingModalVisible(true)}
                                className="flex-1 flex-row items-center justify-center bg-primary-100 py-3 rounded-full"
                            >
                                <Text className="text-primary-300 text-base text-center font-rubik-bold">
                                    Đặt lịch
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                onPress={() => handleContact('call')}
                                className="flex-1 flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400"
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
