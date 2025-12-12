import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
    FlatList,
    StyleSheet
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo } from "react";

import icons from "@/constants/icons";
import images from "@/constants/images";
import { useAppwrite } from "@/lib/useAppwrite";
import { getAgentById, getPropertiesByBrokerId } from "@/lib/api/broker";
import { getReviewsByAgentId } from "@/lib/api/rating";
import { Card } from "@/components/Cards";
import { formatCurrency } from "@/lib/utils";

const RatingBar = ({ star, count, total }: { star: number, count: number, total: number }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
        <View className="flex-row items-center gap-3 mb-1">
            <Text className="text-gray-500 font-rubik-medium w-3">{star}</Text>
            <Image source={icons.star} className="w-3 h-3" tintColor="#F59E0B" />
            <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <View 
                    style={{ width: `${percentage}%` }} 
                    className="h-full bg-yellow-400 rounded-full" 
                />
            </View>
            <Text className="text-gray-400 text-xs w-8 text-right">{percentage.toFixed(0)}%</Text>
        </View>
    );
};

const BrokerDetails = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();

    const {
        data: broker,
        loading: loadingBroker,
        refetch: refetchBroker
    } = useAppwrite({
        fn: () => getAgentById({ agentId: id! }),
        params: { agentId: id! },
        shouldFetch: !!id,
    });

    const {
        data: brokerProperties,
        loading: loadingProperties,
        refetch: refetchProperties
    } = useAppwrite({
        fn: () => getPropertiesByBrokerId(id!),
        params: { agentId: id! },
        shouldFetch: !!id,
    });

    const {
        data: reviews,
        loading: loadingReviews,
        refetch: refetchReviews
    } = useAppwrite({
        fn: () => getReviewsByAgentId(id!),
        params: { agentId: id! },
        shouldFetch: !!id,
    });

    useEffect(() => {
        if (id) {
            refetchBroker();
            refetchProperties();
            refetchReviews();
        }
    }, [id]);

    const ratingStats = useMemo(() => {
        const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (!reviews) return stats;
        
        reviews.forEach((r: any) => {
            const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
            if (stats[rating] !== undefined) stats[rating]++;
        });
        return stats;
    }, [reviews]);

    const handleContact = (method: 'call' | 'sms' | 'email' = 'call') => {
        if (!broker) return;

        const phone = broker.phoneNumber || "N/A";
        const email = broker.email || "N/A";

        if (method === 'email') {
            if (email !== "N/A") {
                Linking.openURL(`mailto:${email}`);
            } else {
                Alert.alert("Thông báo", "Không có địa chỉ email cho môi giới này.");
            }
            return;
        }
        
        if (method === 'sms') {
            if (phone !== "N/A") {
                Linking.openURL(`sms:${phone}`);
            } else {
                Alert.alert("Thông báo", "Không có số điện thoại cho môi giới này.");
            }
        } else { // Call
            if (phone !== "N/A") {
                Linking.openURL(`tel:${phone}`);
            } else {
                Alert.alert("Thông báo", "Không có số điện thoại cho môi giới này.");
            }
        }
    };

    if (!id) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <Text className="text-lg font-rubik-bold text-red-500">
                    Không tìm thấy ID môi giới.
                </Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2 bg-primary-300 rounded-lg">
                    <Text className="text-white">Quay lại</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (loadingBroker || loadingProperties) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0061FF" />
                <Text className="mt-2 text-primary-300 font-rubik-medium">Đang tải thông tin môi giới...</Text>
            </SafeAreaView>
        );
    }

    if (!broker) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <Text className="text-lg font-rubik-bold text-red-500">
                    Không tìm thấy thông tin môi giới.
                </Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2 bg-primary-300 rounded-lg">
                    <Text className="text-white">Quay lại</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const agentAvatar = broker.avatar ? { uri: broker.avatar } : images.avatar;
    const agentName = broker.name || "Chuyên viên tư vấn";
    const agentEmail = broker.email || "Đang cập nhật";
    const agentRating = broker.rating || 0;
    const agentReviewCount = broker.reviewCount || 0;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Image source={icons.backArrow} className="w-6 h-6" />
                    </TouchableOpacity>
                    <Text className="text-xl font-rubik-bold text-black-300">
                        Thông tin Môi giới
                    </Text>
                    <View className="w-6" />
                </View>

                {/* Profile Section */}
                <View className="p-5 items-center">
                    <Image
                        source={agentAvatar}
                        className="w-32 h-32 rounded-full border-2 border-primary-300"
                        resizeMode="cover"
                    />
                    <Text className="text-2xl font-rubik-extrabold text-black-300 mt-4 text-center">
                        {agentName}
                    </Text>
                    <Text className="text-base font-rubik-medium text-black-200 mt-1">
                        {agentEmail}
                    </Text>

                    {/* Contact Buttons */}
                    <View className="flex-row mt-5 gap-4">
                        <TouchableOpacity
                            onPress={() => handleContact('call')}
                            className="bg-primary-300 p-3 rounded-full flex-row items-center justify-center min-w-[120px] shadow-sm shadow-zinc-300"
                        >
                            <Image source={icons.phone} className="w-5 h-5 mr-2" tintColor="white" />
                            <Text className="text-white font-rubik-bold">Gọi ngay</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleContact('sms')}
                            className="bg-white border border-primary-200 p-3 rounded-full flex-row items-center justify-center min-w-[120px]"
                        >
                            <Image source={icons.chat} className="w-5 h-5 mr-2" tintColor="#0061FF" />
                            <Text className="text-primary-300 font-rubik-bold">Nhắn tin</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Properties Section */}
                <View className="mt-2 px-5">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-rubik-bold text-black-300">
                            Bất động sản đang bán
                        </Text>
                        <Text className="text-primary-300 font-rubik-bold">{brokerProperties?.length || 0}</Text>
                    </View>
                    
                    {(!brokerProperties || brokerProperties.length === 0) ? (
                        <Text className="text-gray-500 font-rubik-medium text-center py-5 bg-gray-50 rounded-lg">
                            Hiện không có bất động sản nào.
                        </Text>
                    ) : (
                        <FlatList
                            data={brokerProperties}
                            keyExtractor={(item) => item.$id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 15, paddingBottom: 10 }}
                            renderItem={({ item }) => (
                                <View style={{ width: 220 }}>
                                    <Card 
                                        item={item} 
                                        onPress={() => router.push(`/properties/${item.$id}`)} 
                                    />
                                </View>
                            )}
                        />
                    )}
                </View>

                {/* Reviews Section */}
                <View className="mt-7 px-5 pb-10">
                    <Text className="text-xl font-rubik-bold text-black-300 mb-4">
                        Đánh giá & Nhận xét
                    </Text>

                    {/* Summary Card */}
                    <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex-row gap-6">
                        <View className="items-center justify-center">
                            <Text className="text-4xl font-rubik-extrabold text-black-300">{agentRating.toFixed(1)}</Text>
                            <View className="flex-row mt-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Image 
                                        key={s} 
                                        source={icons.star} 
                                        className="w-3 h-3" 
                                        tintColor={s <= Math.round(agentRating) ? "#F59E0B" : "#E0E0E0"} 
                                    />
                                ))}
                            </View>
                            <Text className="text-gray-400 text-xs mt-2">{agentReviewCount} đánh giá</Text>
                        </View>
                        
                        <View className="flex-1 justify-center">
                            {[5, 4, 3, 2, 1].map((star) => (
                                <RatingBar 
                                    key={star} 
                                    star={star} 
                                    count={ratingStats[star as 1|2|3|4|5]} 
                                    total={reviews?.length || 0} 
                                />
                            ))}
                        </View>
                    </View>

                    {loadingReviews ? (
                        <ActivityIndicator size="small" color="#0061FF" />
                    ) : (!reviews || reviews.length === 0) ? (
                        <View className="bg-gray-50 p-5 rounded-xl items-center">
                            <Text className="text-gray-500 font-rubik text-center">
                                Chưa có đánh giá nào.
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-4">
                            {reviews.map((review) => (
                                <View key={review.$id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View className="flex-row items-center gap-2">
                                            <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center">
                                                <Image source={icons.person} className="w-4 h-4" tintColor="#0061FF"/>
                                            </View>
                                            <View>
                                                <Text className="font-rubik-bold text-black-300 text-sm">
                                                    Khách hàng ẩn danh
                                                </Text>
                                                <Text className="text-gray-400 text-[10px] font-rubik">
                                                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex-row bg-yellow-50 px-2 py-1 rounded-md">
                                            <Text className="text-yellow-700 font-rubik-bold text-xs mr-1">{review.rating}</Text>
                                            <Image source={icons.star} className="w-3 h-3" tintColor="#F59E0B" />
                                        </View>
                                    </View>
                                    <Text className="text-gray-600 font-rubik text-sm leading-5 pl-2 border-l-2 border-gray-100">
                                        {review.comment}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default BrokerDetails;