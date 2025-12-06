import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { getPropertyById, finalizeVerification } from '@/lib/appwrite';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

const ReviewPropertyDetailScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useGlobalContext();

    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho nghiệp vụ
    const [proposedPrice, setProposedPrice] = useState<string>('');
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [legalChecked, setLegalChecked] = useState(false);
    const [kycChecked, setKycChecked] = useState(false);

    const fetchData = async () => {
        if (!id) return;
        const data = await getPropertyById({ id }); // Lấy dữ liệu chi tiết
        setProperty(data);
        setProposedPrice(data?.price ? data.price.toString() : ''); // Đặt giá mặc định
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // --- LOGIC XỬ LÝ QUYẾT ĐỊNH ---
    const handleDecision = async (decision: 'approved' | 'rejected' | 'request_changes') => {
        if (!property) return;
        setIsSubmitting(true);

        try {
            if (decision === 'rejected' && !rejectionReason.trim()) {
                Alert.alert("Thiếu Lý Do", "Vui lòng nhập lý do từ chối.");
                return;
            }

            const price = proposedPrice ? parseFloat(proposedPrice) : undefined;

            await finalizeVerification(
                id,
                decision,
                rejectionReason,
                price
            );

            Alert.alert("Thành công", `Tin đăng đã được chuyển trạng thái: ${decision}`);
            router.back(); // Quay lại danh mục quản lý

        } catch (e) {
            Alert.alert("Lỗi", "Không thể cập nhật trạng thái tin.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" className="mt-10" />;
    }

    if (!property) {
        return <Text className="p-5 text-center">Không tìm thấy tin đăng này.</Text>;
    }

    // --- COMPONENT TRỢ GIÚP ---
    const Checkbox = ({ checked, label, onPress }: { checked: boolean, label: string, onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} className="flex-row items-center py-2">
            <Ionicons
                name={checked ? "checkbox-outline" : "square-outline"}
                size={24}
                color={checked ? "#10B981" : "#A0AEC0"}
            />
            <Text className="ml-3 text-base">{label}</Text>
        </TouchableOpacity>
    );

    // --- GIAO DIỆN CHÍNH ---
    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-5 pt-4">
                <Text className="text-3xl font-bold text-gray-800">{property.name}</Text>
                <Text className="text-lg text-gray-500 mb-4">Trạng thái: **{property.status.toUpperCase()}**</Text>

                {/* PHẦN 1: THẨM ĐỊNH PHÁP LÝ & KYC */}
                <View className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
                    <Text className="text-xl font-bold mb-3 border-b pb-2">1. Thẩm Định Cơ Bản</Text>

                    <View className="mb-3">
                        <Text className="font-medium text-gray-700">Người Bán:</Text>
                        <Text className="text-blue-600 font-medium">{property.agent?.name || 'Chưa xác định'}</Text>
                    </View>

                    <Checkbox
                        checked={legalChecked}
                        label="Đã xem xét Giấy tờ pháp lý (Sổ đỏ)"
                        onPress={() => setLegalChecked(!legalChecked)}
                    />
                     <Checkbox
                        checked={kycChecked}
                        label="Đã xác thực chính chủ (KYC qua call/gặp)"
                        onPress={() => setKycChecked(!kycChecked)}
                    />

                    <Text className="mt-4 font-medium text-gray-700">Tài liệu pháp lý:</Text>
                    {/* Giả định legalDocuments là một mảng URLs - Cần đảm bảo quyền đọc */}
                    <Text className="text-sm text-red-500">
                        {/* {property.legalDocuments?.length} tài liệu (Chỉ Broker thấy) */}
                        Đang chờ tải ảnh Sổ đỏ...
                    </Text>

                </View>

                {/* PHẦN 2: ĐỊNH GIÁ VÀ ĐỀ XUẤT */}
                <View className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
                    <Text className="text-xl font-bold mb-3 border-b pb-2">2. Định Giá & Ghi Chú</Text>

                    <Text className="text-sm text-gray-500">Giá Chủ nhà đăng: **{property.price} VNĐ**</Text>

                    <Text className="font-medium text-gray-700 mt-3 mb-1">Giá đề xuất của Broker:</Text>
                    <TextInput
                        value={proposedPrice}
                        onChangeText={setProposedPrice}
                        keyboardType="numeric"
                        placeholder="Nhập giá thị trường đề xuất"
                        className="border border-blue-300 p-3 rounded-lg bg-blue-50"
                    />

                    <Text className="font-medium text-gray-700 mt-4 mb-1">Ghi chú nghiệp vụ (Nội bộ):</Text>
                    <TextInput
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        placeholder="Ghi chú về hiện trạng/thị trường..."
                        multiline
                        className="border border-gray-300 p-3 rounded-lg h-24"
                    />
                </View>

                {/* PHẦN 3: QUYẾT ĐỊNH CUỐI CÙNG */}
                <View className="flex-row justify-between mb-10">
                    {/* Nút TỪ CHỐI */}
                    <TouchableOpacity
                        onPress={() => handleDecision('rejected')}
                        disabled={isSubmitting || !rejectionReason.trim()}
                        className={`w-[32%] py-3 rounded-xl ${isSubmitting || !rejectionReason.trim() ? 'bg-gray-400' : 'bg-red-500'}`}
                    >
                         <Text className="text-white font-bold text-center">TỪ CHỐI</Text>
                    </TouchableOpacity>

                    {/* Nút YÊU CẦU SỬA */}
                    <TouchableOpacity
                        onPress={() => handleDecision('request_changes')}
                        disabled={isSubmitting || !rejectionReason.trim()}
                        className={`w-[32%] py-3 rounded-xl ${isSubmitting || !rejectionReason.trim() ? 'bg-gray-400' : 'bg-yellow-500'}`}
                    >
                        <Text className="text-white font-bold text-center">YÊU CẦU SỬA</Text>
                    </TouchableOpacity>

                    {/* Nút DUYỆT */}
                    <TouchableOpacity
                        onPress={() => handleDecision('approved')}
                        disabled={isSubmitting || !legalChecked || !kycChecked}
                        className={`w-[32%] py-3 rounded-xl ${isSubmitting || !legalChecked || !kycChecked ? 'bg-gray-400' : 'bg-green-600'}`}
                    >
                         <Text className="text-white font-bold text-center">DUYỆT ✅</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default ReviewPropertyDetailScreen;