import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { getOrCreateChat } from '@/lib/api/chat';
import { getPropertyById, finalizeVerification, getPropertyGallery, uploadFieldImage, addImageToGalleryDoc } from '@/lib/api/broker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { upload360Image, saveTourToProperty } from '@/lib/api/tour360'; // File bạn vừa làm xong
import ThreeSixtyViewer from '@/components/ThreeSixtyViewer'; // File vừa tạo ở Bước 1

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

    // AI States
    const [aiPrediction, setAiPrediction] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Image Upload States
    const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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

    // --- 🟢 SỬA LỖI Ở ĐÂY: TÍNH TOÁN LOGIC TRƯỚC KHI RENDER ---
    // Tính toán các giá trị AI ngay tại đây, không làm trong JSX
    const { min: aiMinTotal, max: aiMaxTotal } = parsePriceRange(aiPrediction, property?.area || 0);
    const currentPrice = property?.price || 0;

    // Logic so sánh giá
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

    const fetchData = async () => {
        if (!id) return;
        try {
            const [propData, galleryDocs] = await Promise.all([
                getPropertyById({ id }),
                getPropertyGallery(id)
            ]);

            if (propData) {
                setProperty(propData);
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
            // Thay đổi IP này cho đúng máy của bạn
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

            console.log("[AI DEBUG] Payload gửi đi:", JSON.stringify(payload, null, 2));

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await response.json();

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

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (property && !aiPrediction) {
            fetchAIValuation();
        }
    }, [property]);

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

                {/* PHÁP LÝ */}
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
                        <TouchableOpacity className="bg-white p-2 rounded-full border border-blue-100">
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

                    {/* 1. AI SUGGESTION CARD */}
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

                        {/* HIỂN THỊ KẾT QUẢ AI - ĐÃ SỬA LỖI JSX */}
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

                    {/* 2. BROKER INPUT */}
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

                    {/* 3. GHI CHÚ */}
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
        </SafeAreaView>
    );
};

export default ReviewPropertyDetailScreen;