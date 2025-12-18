import { addImageToGalleryDoc, finalizeVerification, getPropertyById, getPropertyGallery, uploadFieldImage } from '@/lib/api/broker';
import { createBooking } from '@/lib/api/buyer'; // Import createBooking
import { getOrCreateChat } from '@/lib/api/chat';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; // Import DateTimePicker
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CheckboxItem = ({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void; }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-row items-center py-3">
        <Ionicons name={checked ? "checkbox" : "square-outline"} size={24} color={checked ? "#10B981" : "#9CA3AF"} />
        <Text className={`ml-3 text-base ${checked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{label}</Text>
    </TouchableOpacity>
);

const ReviewPropertyDetailScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useGlobalContext();

    // --- STATES ---
    const [property, setProperty] = useState<any>(null);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Booking States
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingNote, setBookingNote] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

    // AI States
    const [aiPrediction, setAiPrediction] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Image Upload States
    const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Video States
    const [newVideo, setNewVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [isVideoUpdating, setIsVideoUpdating] = useState(false);

    // Form States
    const [form, setForm] = useState({
        proposedPrice: '',
        rejectionReason: '',
        isLegalChecked: false,
        isKycChecked: false,
    });

    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // --- HELPER FUNCTIONS ---
    const parsePriceRange = (rangeStr: string | null, area: number) => {
        if (!rangeStr) return { min: 0, max: 0 };
        try {
            const parts = rangeStr.split('-').map(p => parseFloat(p));
            if (parts.length === 2) {
                const minTotal = parts[0] * area * 1000000;
                const maxTotal = parts[1] * area * 1000000;
                return { min: minTotal, max: maxTotal };
            }
            return { min: 0, max: 0 };
        } catch (e) {
            return { min: 0, max: 0 };
        }
    };

    const { min: aiMinTotal, max: aiMaxTotal } = parsePriceRange(aiPrediction, property?.area || 0);
    const currentPrice = property?.price || 0;

    const isGoodPrice = currentPrice >= aiMinTotal && currentPrice <= aiMaxTotal;
    const isCheaper = currentPrice < aiMinTotal;
    const isExpensive = currentPrice > aiMaxTotal;

    // --- ACTIONS ---
    const goBackToMyListings = () => {
        router.replace('/(root)/(tabs)/my-listings');
    };

    const handleChatWithSeller = async () => {
        if (!user) return;
        const sellerData = property.sellerInfo || property.seller;
        if (!sellerData || !sellerData.$id) {
            Alert.alert("Lỗi", "Không tìm thấy ID người bán.");
            return;
        }

        try {
            const chatDoc = await getOrCreateChat(user.$id, sellerData.$id);
            router.push({
                pathname: '/chat/[id]',
                params: {
                    id: chatDoc.$id,
                    otherUserId: sellerData.$id,
                    otherUserName: sellerData.name || 'Người bán',
                    otherUserAvatar: sellerData.avatar
                }
            });
        } catch (error) {
            Alert.alert("Lỗi", "Không thể mở hộp thoại chat.");
        }
    };

    // --- BOOKING LOGIC ---
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

    const handleBookViewing = async () => {
        if (!user) {
             Alert.alert("Thông báo", "Vui lòng đăng nhập.");
             return;
        }

        const sellerData = property.sellerInfo || property.seller;
        
        let targetAgentId = null;
        
        // Ưu tiên lấy ID từ object nếu có
        if (sellerData && typeof sellerData === 'object' && sellerData.$id) {
            targetAgentId = sellerData.$id;
        } 
        // Nếu là string (ID trực tiếp)
        else if (typeof sellerData === 'string') {
            targetAgentId = sellerData;
        }

        if (!targetAgentId) {
             Alert.alert("Lỗi", "Không tìm thấy thông tin chủ nhà để đặt lịch.");
             return;
        }

        setIsBooking(true);
        try {
            // Khi môi giới đặt lịch với người bán:
            // - Môi giới là agent
            // - Người bán là user
            await createBooking({
                userId: targetAgentId, // Người bán là user
                agentId: user.$id, // Môi giới là agent
                propertyId: id,
                date: selectedDate.toISOString(),
                note: bookingNote
            });

            Alert.alert("Thành công", "Đã gửi yêu cầu đặt lịch xem nhà tới Chủ nhà.");
            setBookingModalVisible(false);
            setBookingNote('');
        } catch (error: any) {
            console.error("Booking error:", error);
            Alert.alert("Lỗi", "Không thể đặt lịch. Vui lòng thử lại.");
        } finally {
            setIsBooking(false);
        }
    };

    const fetchData = async () => {
        if (!id) return;
        try {
            const [propData, galleryDocs] = await Promise.all([
                getPropertyById({ id }),
                getPropertyGallery(id)
            ]);

            if (propData) {
                setProperty(propData);
                console.log('[fetchData] Property loaded, video URL:', propData.video || 'No video');
                
                const allImgs = propData.image ? [propData.image] : [];
                if (galleryDocs && galleryDocs.length > 0) {
                    galleryDocs.forEach((doc: any) => allImgs.push(doc.image));
                }
                setExistingImages(allImgs);

                if (!form.proposedPrice) {
                    setForm(prev => ({...prev, proposedPrice: propData.price ? propData.price.toString() : ''}));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchAIValuation = async () => {
        if (!property) return;
        setIsAiLoading(true);
        try {
            const API_URL = 'http://192.168.1.14:5000/predict';

            const payload = {
                House_type: "BYROAD",
                Legal_documents: "AVAILABLE",
                No_floor: property.floors,
                No_bedroom: property.bedrooms || 1,
                Month: new Date().getMonth() + 1,
                Day_Of_Week: "Monday",
                District: property.ward,
                Ward: property.ward,
                Area: property.area,
                Width: property.frontage,
                Length: property.depth,
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            console.log("AI API Response:", JSON.stringify(json, null, 2));

            if (json.status === 'success') {
                setAiPrediction(json.predicted_price_range);
            } else {
                Alert.alert("AI Error", json.message);
            }
        } catch (error) {
            console.error("AI Connection Error:", error);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Setup video player
    const videoPlayer = useVideoPlayer(newVideo?.uri || property?.video || '', player => {
        player.loop = false;
        player.muted = false;
        player.volume = 1.0;
    });

    // Update video source when video changes
    useEffect(() => {
        const videoSource = newVideo?.uri || property?.video;
        if (videoSource && videoPlayer) {
            videoPlayer.replace(videoSource);
        }
    }, [newVideo?.uri, property?.video]);

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (property && !aiPrediction) {
            fetchAIValuation();
        }
    }, [property]);

    // Reset video loading when property video changes
    useEffect(() => {
        if (property?.video) {
            console.log('[Video Effect] Property video updated:', property.video);
            setIsVideoLoading(true);
        }
    }, [property?.video]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.8,
            });
            if (!result.canceled) {
                setNewImages(prev => [...prev, ...result.assets]);
            }
        } catch (error) {
            Alert.alert("Thông báo", "Cần cấp quyền truy cập ảnh.");
        }
    };

    const pickVideo = async () => {
        try {
            // Nếu đã có video, xác nhận thay thế
            if (property?.video) {
                Alert.alert(
                    'Xác nhận thay đổi',
                    'Bạn muốn thay thế video hiện tại bằng video mới?',
                    [
                        { text: 'Hủy', style: 'cancel' },
                        { 
                            text: 'Thay đổi', 
                            onPress: async () => {
                                let result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['videos'],
                                    allowsMultipleSelection: false,
                                    quality: 1,
                                });
                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                    const video = result.assets[0];
                                    if (video.fileSize && video.fileSize > 50 * 1024 * 1024) {
                                        Alert.alert('Lỗi', 'Video phải nhỏ hơn 50MB. Vui lòng chọn video khác.');
                                        return;
                                    }
                                    setNewVideo(video);
                                    setIsVideoLoading(true); // Reset loading state for new video
                                }
                            }
                        }
                    ]
                );
            } else {
                // Chưa có video, chọn luôn
                let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['videos'],
                    allowsMultipleSelection: false,
                    quality: 1,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const video = result.assets[0];
                    if (video.fileSize && video.fileSize > 50 * 1024 * 1024) {
                        Alert.alert('Lỗi', 'Video phải nhỏ hơn 50MB. Vui lòng chọn video khác.');
                        return;
                    }
                    setNewVideo(video);
                    setIsVideoLoading(true);
                }
            }
        } catch (error) {
            Alert.alert("Thông báo", "Cần cấp quyền truy cập video.");
        }
    };

    const handleUploadImages = async () => {
        if (newImages.length === 0) return;
        if (!user) return;
        setIsUploading(true);
        try {
            const uploadPromises = newImages.map(async (asset) => {
                const imageUrl = await uploadFieldImage(asset);
                if (imageUrl) {
                    await addImageToGalleryDoc(id, imageUrl, user.$id);
                }
            });
            await Promise.all(uploadPromises);
            Alert.alert("Thành công", "Đã lưu ảnh thực địa.");
            setNewImages([]);
            onRefresh();
        } catch (error) {
            Alert.alert("Lỗi", "Không thể tải ảnh lên.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUploadVideo = async () => {
        if (!newVideo || !user) return;
        setIsUploadingVideo(true);
        try {
            console.log('[handleUploadVideo] Bắt đầu upload video, size:', newVideo.fileSize);
            
            // Upload video using same function as images (supports both)
            const videoUrl = await uploadFieldImage(newVideo);
            
            console.log('[handleUploadVideo] Video uploaded, URL:', videoUrl);
            
            if (videoUrl) {
                // Update property with video URL
                const { databases, config } = await import('@/lib/appwrite');
                
                console.log('[handleUploadVideo] Cập nhật property với video URL');
                console.log('[handleUploadVideo] Property ID:', id);
                console.log('[handleUploadVideo] Collection ID:', config.propertiesCollectionId);
                
                await databases.updateDocument(
                    config.databaseId!,
                    config.propertiesCollectionId!,
                    id,
                    { video: videoUrl }
                );
                
                console.log('[handleUploadVideo] ✅ Cập nhật thành công');
                
                // Update local property state with new video URL
                setIsVideoUpdating(true); // Mark as updating to suppress error alerts
                setProperty((prev: any) => ({
                    ...prev,
                    video: videoUrl
                }));
                
                Alert.alert("Thành công", property?.video ? "Đã cập nhật video mới!" : "Đã lưu video thực địa.");
                setNewVideo(null);
                setIsVideoLoading(true); // Trigger reload for new video
                
                // Clear updating flag after video has time to load
                setTimeout(() => {
                    setIsVideoUpdating(false);
                }, 3000);
                
                onRefresh();
            } else {
                console.error('[handleUploadVideo] videoUrl is null/undefined');
                Alert.alert("Lỗi", "Không nhận được URL video sau khi upload.");
            }
        } catch (error: any) {
            console.error('[handleUploadVideo] ❌ Lỗi:', error);
            console.error('[handleUploadVideo] Error message:', error.message);
            console.error('[handleUploadVideo] Error code:', error.code);
            Alert.alert("Lỗi", `Không thể tải video lên: ${error.message}`);
        } finally {
            setIsUploadingVideo(false);
        }
    };

    const handleDecision = async (decision: 'approved' | 'rejected' | 'request_changes') => {
        if (!property) return;
        setIsSubmitting(true);
        try {
             const price = form.proposedPrice ? parseFloat(form.proposedPrice) : undefined;
             if (newImages.length > 0) {
                 Alert.alert("Lưu ý", "Bạn chưa lưu ảnh mới. Hãy ấn 'Lưu' trước khi duyệt.");
                 setIsSubmitting(false);
                 return;
             }
             if (newVideo) {
                 Alert.alert("Lưu ý", "Bạn chưa lưu video mới. Hãy ấn 'Lưu video' trước khi duyệt.");
                 setIsSubmitting(false);
                 return;
             }
             await finalizeVerification(id, decision, form.rejectionReason, price);
             Alert.alert("Thành công", `Đã cập nhật trạng thái!`, [{ text: "Về Tin Của Tôi", onPress: goBackToMyListings }]);
        } catch(e) {
            Alert.alert("Lỗi", "Thất bại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    if (loading && !refreshing) return <ActivityIndicator size="large" color="#0061FF" className="mt-10" />;
    if (!property) return <Text className="p-10 text-center">Không tìm thấy tin.</Text>;

    const totalDisplayImages = [...existingImages, ...newImages.map(img => img.uri)];
    const sellerName = property.sellerInfo?.name || property.seller?.name || "Chưa xác định";
    const sellerAvatar = property.sellerInfo?.avatar || property.seller?.avatar;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100 z-10">
                <TouchableOpacity onPress={goBackToMyListings} className="p-2 mr-2 bg-gray-50 rounded-full">
                    <Ionicons name="arrow-back" size={20} color="#333" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-lg font-rubik-bold text-gray-800" numberOfLines={1}>Thẩm định BĐS</Text>
                    <Text className="text-xs text-gray-500" numberOfLines={1}>{property.name}</Text>
                </View>
                <View className={`px-2 py-1 rounded-md ${property.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                     <Text className={`text-[10px] font-bold uppercase ${property.status === 'approved' ? 'text-green-700' : 'text-yellow-700'}`}>
                        {property.status}
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Image Slider */}
                <View className="bg-black">
                    <Image
                        source={{ uri: totalDisplayImages[activeImageIndex] || 'https://via.placeholder.com/400' }}
                        className="w-full h-64"
                        resizeMode="contain"
                    />
                    <ScrollView horizontal className="bg-white py-2 px-2" showsHorizontalScrollIndicator={false}>
                        {totalDisplayImages.map((img, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => setActiveImageIndex(index)}
                                className={`mr-2 rounded-md overflow-hidden border-2 w-16 h-16 ${activeImageIndex === index ? 'border-blue-500' : 'border-transparent'}`}
                            >
                                <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={pickImage} className="w-16 h-16 bg-gray-100 items-center justify-center rounded-md border border-dashed border-gray-400">
                            <Ionicons name="camera-outline" size={24} color="#666" />
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {newImages.length > 0 && (
                    <TouchableOpacity onPress={handleUploadImages} disabled={isUploading} className="bg-blue-600 mx-4 mt-3 py-3 rounded-xl flex-row justify-center items-center shadow-md">
                        {isUploading ? <ActivityIndicator color="white" /> : <Ionicons name="cloud-upload-outline" size={20} color="white" />}
                        <Text className="text-white font-bold ml-2">{isUploading ? 'Đang tải lên...' : `Lưu ${newImages.length} ảnh mới`}</Text>
                    </TouchableOpacity>
                )}

                {/* Video Section - Always show container */}
                <View className="bg-white p-4 mx-4 mt-3 rounded-xl shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-base font-rubik-bold text-gray-800">🎥 Video thực địa</Text>
                        {property?.video && !newVideo && (
                            <TouchableOpacity onPress={pickVideo} className="bg-blue-50 px-3 py-1.5 rounded-lg flex-row items-center">
                                <Ionicons name="refresh-outline" size={14} color="#2563eb" />
                                <Text className="text-blue-600 text-xs font-bold ml-1">Đổi video</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {(property?.video || newVideo) ? (
                        <>
                            <View className="relative">
                                <VideoView
                                    key={`video-${newVideo?.uri || property.video}-${Date.now()}`}
                                    player={videoPlayer}
                                    nativeControls
                                    contentFit="cover"
                                    onFirstFrameRender={() => {
                                        console.log('[Video] First frame rendered');
                                        setIsVideoLoading(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        height: 220,
                                        borderRadius: 12,
                                        backgroundColor: '#000',
                                    }}
                                />
                                {isVideoLoading && (
                                    <View className="absolute inset-0 items-center justify-center bg-black/50 rounded-xl">
                                        <ActivityIndicator size="large" color="#fff" />
                                        <Text className="text-white mt-2 text-sm">Đang tải video...</Text>
                                    </View>
                                )}
                            </View>
                            {newVideo && (
                                <View className="flex-row gap-2 mt-3">
                                    <TouchableOpacity 
                                        onPress={handleUploadVideo} 
                                        disabled={isUploadingVideo}
                                        className="flex-1 bg-green-600 py-2.5 rounded-lg flex-row justify-center items-center"
                                    >
                                        {isUploadingVideo ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name="cloud-upload-outline" size={18} color="white" />
                                                <Text className="text-white font-bold ml-2 text-sm">Lưu video</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => setNewVideo(null)}
                                        className="bg-gray-200 px-4 py-2.5 rounded-lg"
                                    >
                                        <Text className="text-gray-700 font-bold text-sm">Hủy</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    ) : (
                        <TouchableOpacity 
                            onPress={pickVideo}
                            className="bg-purple-50 py-8 rounded-xl flex-row justify-center items-center border-2 border-dashed border-purple-300"
                        >
                            <Ionicons name="videocam-outline" size={32} color="#9333ea" />
                            <Text className="text-purple-600 font-bold ml-3 text-base">Thêm video thực địa</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* INFO CARD */}
                <View className="bg-white p-5 mb-3 mt-3 border-t border-gray-100 shadow-sm">
                    <Text className="text-xl font-rubik-bold text-gray-900 mb-1">{property.name}</Text>
                    <Text className="text-gray-500 text-sm mb-3 flex-row items-center">
                         <Ionicons name="location-sharp" size={14} color="#666"/> {property.address}
                    </Text>
                    <Text className="text-2xl font-rubik-bold text-blue-600 mb-3">
                        {property.price?.toLocaleString('vi-VN')} ₫
                    </Text>
                    <View className="flex-row bg-gray-50 p-3 rounded-xl justify-between border border-gray-100">
                        <View className="flex-row items-center"><MaterialCommunityIcons name="floor-plan" size={20} color="#555" /><Text className="ml-2 font-medium">{property.area} m²</Text></View>
                        <View className="flex-row items-center"><Ionicons name="bed-outline" size={20} color="#555" /><Text className="ml-2 font-medium">{property.bedrooms} PN</Text></View>
                        <View className="flex-row items-center"><MaterialCommunityIcons name="shower" size={20} color="#555" /><Text className="ml-2 font-medium">{property.bathrooms} WC</Text></View>
                    </View>
                </View>

                {/* PHÁP LÝ & LIÊN HỆ */}
                <View className="bg-white p-5 mb-3 shadow-sm">
                    <Text className="text-lg font-rubik-bold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">Kiểm Tra Pháp Lý</Text>
                    <View className="flex-row items-center bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                        {sellerAvatar ? (
                             <Image source={{ uri: sellerAvatar }} className="w-12 h-12 rounded-full" />
                        ) : (
                            <View className="w-12 h-12 bg-blue-200 rounded-full items-center justify-center">
                                <Text className="text-blue-700 font-bold text-lg">{sellerName.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View className="ml-3 flex-1">
                            <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">Chủ nhà / Người bán</Text>
                            <Text className="text-gray-900 font-bold text-base mt-0.5">{sellerName}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setBookingModalVisible(true)} className="bg-white p-2 rounded-full border border-blue-100">
                             <Ionicons name="calendar-outline" size={20} color="#0061FF" />
                        </TouchableOpacity>
                        <TouchableOpacity className="bg-white p-2 rounded-full border border-blue-100 ml-2">
                             <Ionicons name="call-outline" size={20} color="#0061FF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleChatWithSeller} className="bg-white p-2 rounded-full border border-blue-100 ml-2">
                                 <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0061FF" />
                        </TouchableOpacity>
                    </View>
                    <CheckboxItem checked={form.isLegalChecked} label="Đã kiểm tra Sổ đỏ / Giấy tờ" onPress={() => updateForm('isLegalChecked', !form.isLegalChecked)}/>
                    <CheckboxItem checked={form.isKycChecked} label="Đã xác thực chủ nhà (KYC)" onPress={() => updateForm('isKycChecked', !form.isKycChecked)}/>
                </View>

                {/* THẨM ĐỊNH GIÁ */}
                <View className="bg-white p-5 mb-6 shadow-sm">
                    <Text className="text-lg font-rubik-bold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">Thẩm Định Giá</Text>

                    {/* AI SUGGESTION CARD */}
                    <View className="bg-indigo-50 rounded-xl p-4 mb-5 border border-indigo-100 relative overflow-hidden">
                        <View className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-100 rounded-full opacity-50" />
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                                <MaterialCommunityIcons name="robot-excited-outline" size={20} color="#4F46E5" />
                                <Text className="text-indigo-700 font-bold ml-2 text-sm uppercase tracking-wide">AI Gợi ý định giá</Text>
                            </View>
                            <TouchableOpacity onPress={fetchAIValuation} disabled={isAiLoading}>
                                {isAiLoading ? <ActivityIndicator size="small" color="#4F46E5" /> : <Ionicons name="refresh-circle" size={24} color="#4F46E5" />}
                            </TouchableOpacity>
                        </View>

                        {aiPrediction ? (
                            <>
                                <View className="flex-row items-end justify-between">
                                    <View>
                                        <Text className="text-gray-500 text-xs mb-1">Khoảng giá khuyến nghị (Tổng):</Text>
                                        <Text className="text-xl font-rubik-bold text-indigo-900">
                                            {(aiMinTotal / 1000000000).toFixed(2)} - {(aiMaxTotal / 1000000000).toFixed(2)}
                                            <Text className="text-sm font-normal text-indigo-600"> tỷ</Text>
                                        </Text>
                                        <Text className="text-[10px] text-indigo-400 mt-1">(Đơn giá: {aiPrediction} triệu/m²)</Text>
                                    </View>

                                    <View className={`px-3 py-1.5 rounded-lg ${isGoodPrice ? 'bg-green-100' : isCheaper ? 'bg-blue-100' : 'bg-orange-100'}`}>
                                        <Text className={`text-xs font-bold ${isGoodPrice ? 'text-green-700' : isCheaper ? 'text-blue-700' : 'text-orange-700'}`}>
                                            {isGoodPrice ? 'Giá Hợp Lý' : isCheaper ? 'Rẻ Hơn AI' : 'Cao Hơn AI'}
                                        </Text>
                                    </View>
                                </View>

                                <View className="mt-4">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-[10px] text-gray-400">0</Text>
                                        <Text className="text-[10px] text-indigo-500 font-bold">Chủ Nhà: {(currentPrice/1000000000).toFixed(2)} tỷ</Text>
                                        <Text className="text-[10px] text-gray-400">Max</Text>
                                    </View>
                                    <View className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                                        <View className="absolute h-full bg-indigo-300 opacity-60" style={{ left: '30%', width: '40%' }} />
                                        <View className={`absolute h-full w-1.5 ${isGoodPrice ? 'bg-green-500' : 'bg-red-500'}`} style={{ left: isCheaper ? '20%' : isExpensive ? '80%' : '50%' }} />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View className="py-4 items-center justify-center">
                                {isAiLoading ? (
                                    <Text className="text-indigo-400 text-sm">Đang phân tích dữ liệu...</Text>
                                ) : (
                                    <View className="items-center">
                                        <Text className="text-gray-400 text-sm mb-2">Không thể nhận diện giá</Text>
                                        <TouchableOpacity onPress={fetchAIValuation} className="bg-indigo-100 px-3 py-1 rounded-md">
                                            <Text className="text-indigo-600 text-xs font-bold">Thử lại</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* BROKER INPUT */}
                    <View className="mb-4">
                        <Text className="text-gray-500 mb-2 text-xs uppercase font-bold">Quyết định của Broker</Text>
                        <View className="flex-row items-center justify-between bg-white border border-gray-300 rounded-xl p-1 shadow-sm">
                            <View className="p-3 flex-1 border-r border-gray-100 bg-gray-50 rounded-l-lg">
                                 <Text className="text-[10px] text-gray-400 uppercase">Giá niêm yết</Text>
                                 <Text className="font-bold text-gray-700 text-sm mt-0.5">{(property.price / 1000000000).toFixed(2)} tỷ</Text>
                            </View>
                            <View className="flex-[1.8] flex-row items-center px-3 py-2">
                                <View className="flex-1">
                                    <Text className="text-[10px] text-blue-500 font-bold mb-0.5">GIÁ CHỐT DUYỆT</Text>
                                    <TextInput
                                        value={form.proposedPrice}
                                        onChangeText={(t) => updateForm('proposedPrice', t)}
                                        keyboardType="numeric"
                                        placeholder="Nhập giá..."
                                        className="font-rubik-bold text-blue-700 text-xl p-0 m-0 h-8"
                                    />
                                </View>
                                <Text className="ml-1 text-gray-400 font-medium text-xs">VNĐ</Text>
                            </View>
                        </View>
                    </View>

                    {/* GHI CHÚ */}
                    <View className="relative">
                        <Text className="absolute left-3 top-3 text-xs text-gray-400 z-10 bg-gray-50 px-1">Ghi chú duyệt tin</Text>
                        <TextInput
                            value={form.rejectionReason}
                            onChangeText={(t) => updateForm('rejectionReason', t)}
                            placeholder="Nhập lý do từ chối hoặc ghi chú nghiệp vụ..."
                            multiline
                            className="bg-gray-50 border border-gray-200 rounded-xl p-4 pt-7 h-32 text-gray-800 text-sm leading-5"
                            textAlignVertical="top"
                        />
                    </View>
                </View>
            </ScrollView>

            {/* ACTION FOOTER */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4 shadow-lg flex-row gap-3">
                <TouchableOpacity onPress={() => handleDecision('rejected')} disabled={isSubmitting} className="flex-1 bg-red-50 py-3.5 rounded-xl border border-red-100 items-center justify-center">
                    <Text className="text-red-600 font-bold text-xs">TỪ CHỐI</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDecision('request_changes')} disabled={isSubmitting} className="flex-1 bg-yellow-50 py-3.5 rounded-xl border border-yellow-100 items-center justify-center">
                    <Text className="text-yellow-700 font-bold text-xs">SỬA ĐỔI</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDecision('approved')} disabled={isSubmitting || !form.isLegalChecked || !form.isKycChecked} className={`flex-1 py-3.5 rounded-xl items-center justify-center ${(!form.isLegalChecked || !form.isKycChecked) ? 'bg-gray-200' : 'bg-green-600'}`}>
                    <Text className={`${(!form.isLegalChecked || !form.isKycChecked) ? 'text-gray-400' : 'text-white'} font-bold text-xs`}>DUYỆT</Text>
                </TouchableOpacity>
            </View>

            {/* BOOKING MODAL */}
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
                                <Text className="text-xl font-rubik-bold mb-4 text-center">Đặt lịch hẹn với Chủ nhà</Text>
                                
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

                                <Text className="font-rubik-medium mb-2">Ghi chú (Lý do/Địa điểm):</Text>
                                <TextInput 
                                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, height: 80, textAlignVertical: 'top', marginBottom: 20 }}
                                    placeholder="Tôi cần qua thẩm định nhà..."
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
        </SafeAreaView>
    );
};

export default ReviewPropertyDetailScreen;