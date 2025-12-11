import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { getOrCreateChat } from '@/lib/api/chat';
// Import API
import { getPropertyById, finalizeVerification, getPropertyGallery, uploadFieldImage, addImageToGalleryDoc } from '@/lib/api/broker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const CheckboxItem = ({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void; }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-row items-center py-3">
        <Ionicons name={checked ? "checkbox" : "square-outline"} size={24} color={checked ? "#10B981" : "#9CA3AF"} />
        <Text className={`ml-3 text-base ${checked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{label}</Text>
    </TouchableOpacity>
);

const ReviewPropertyDetailScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useGlobalContext();

    const [property, setProperty] = useState<any>(null);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [form, setForm] = useState({
        proposedPrice: '',
        rejectionReason: '',
        isLegalChecked: false,
        isKycChecked: false,
    });

    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // --- HÀM ĐIỀU HƯỚNG VỀ 'TIN CỦA TÔI' ---
    const goBackToMyListings = () => {
        // Điều hướng rõ ràng về Tab "Tin của tôi"
        router.replace('/(root)/(tabs)/my-listings');
    };

    const handleChatWithSeller = async () => {
            if (!user) return; // Đã check ở trên

            // Ưu tiên lấy từ sellerInfo đã được làm giàu, nếu không có thì fallback sang property.seller
            const sellerData = property.sellerInfo || property.seller;

            // Cần đảm bảo rằng SellerData là object và có $id
            if (!sellerData || !sellerData.$id) {
                console.error("DEBUG CHAT: Không tìm thấy Seller ID.");
                Alert.alert("Lỗi", "Không tìm thấy ID người bán.");
                return;
            }

            const sellerId = sellerData.$id;
            const sellerName = sellerData.name || 'Người bán';
            const sellerAvatar = sellerData.avatar;

            try {
                console.log(`[CHAT START] Broker ID: ${user.$id}, Seller ID: ${sellerId}`);

                // 1. Tạo hoặc lấy Chat Room
                const chatDoc = await getOrCreateChat(user.$id, sellerId);

                // 2. Chuyển hướng
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: chatDoc.$id,
                        otherUserId: sellerId,
                        otherUserName: sellerName,
                        otherUserAvatar: sellerAvatar
                    }
                });
            } catch (error) {
                console.error("LỖI TẠO CHAT ROOM:", error);
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

    useEffect(() => {
        fetchData();
    }, [id]);

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

             Alert.alert(
                 "Thành công",
                 `Đã cập nhật trạng thái!`,
                 [
                     {
                         text: "Về Tin Của Tôi",
                         onPress: goBackToMyListings // <--- Chuyển hướng về Tin Của Tôi
                     }
                 ]
             );

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
                {/* --- SỬA NÚT BACK --- */}
                <TouchableOpacity
                    onPress={goBackToMyListings}
                    className="p-2 mr-2 bg-gray-50 rounded-full"
                >
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
                {/* --- SLIDER ẢNH --- */}
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

                {/* --- PHÁP LÝ & CHỦ NHÀ --- */}
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
                        <TouchableOpacity
                                onPress={handleChatWithSeller} // <--- Gán hàm vào đây
                                className="bg-white p-2 rounded-full border border-blue-100 ml-2"
                            >
                                 <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0061FF" />
                        </TouchableOpacity>
                    </View>

                    <CheckboxItem checked={form.isLegalChecked} label="Đã kiểm tra Sổ đỏ / Giấy tờ" onPress={() => updateForm('isLegalChecked', !form.isLegalChecked)}/>
                    <CheckboxItem checked={form.isKycChecked} label="Đã xác thực chủ nhà (KYC)" onPress={() => updateForm('isKycChecked', !form.isKycChecked)}/>
                </View>

                {/* ĐỊNH GIÁ */}
                <View className="bg-white p-5 mb-6 shadow-sm">
                    <Text className="text-lg font-rubik-bold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">Thẩm Định Giá</Text>
                    <TextInput
                        value={form.proposedPrice}
                        onChangeText={(t) => updateForm('proposedPrice', t)}
                        keyboardType="numeric"
                        placeholder="Nhập giá định giá (VNĐ)..."
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-black font-medium"
                    />
                    <TextInput
                        value={form.rejectionReason}
                        onChangeText={(t) => updateForm('rejectionReason', t)}
                        placeholder="Ghi chú nghiệp vụ / Lý do từ chối..."
                        multiline
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-28 text-black"
                        textAlignVertical="top"
                    />
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