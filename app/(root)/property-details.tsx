import {
    FlatList,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Platform,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";
import { facilities } from "@/constants/data";

import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById, getAgentById } from "@/lib/appwrite";
import { Models } from "react-native-appwrite";

type PropertyStatus = 'pending_approval' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired';

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
        'pending_approval': '#f0ad4e',
        'for_sale': '#5cb85c',
        'deposit_paid': '#337ab7',
        'sold': '#d9534f',
        'rejected': '#777',
        'expired': '#777'
    };
    return colors[status] || '#777';
};

const PropertyDetails = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const windowHeight = Dimensions.get("window").height;

    // Bước 1: Lấy thông tin property
    const { data: property, loading: loadingProperty } = useAppwrite({
        fn: getPropertyById,
        params: { id: id! },
        skip: !id
    });

    // **FIX: Tạo state riêng để lưu thông tin agent**
    const [agent, setAgent] = useState<Models.Document | null>(null);
    const [loadingAgent, setLoadingAgent] = useState(true);

    // **FIX: Bước 2: Dùng useEffect để lấy thông tin agent sau khi đã có property**
    useEffect(() => {
        const fetchAgent = async () => {
            if (property && property.brokerId) {
                setLoadingAgent(true);
                const agentData = await getAgentById({ agentId: property.brokerId });
                setAgent(agentData);
                setLoadingAgent(false);
            } else {
                setLoadingAgent(false);
            }
        };

        fetchAgent();
    }, [property]); // Chạy lại mỗi khi 'property' thay đổi

    if (loadingProperty || !property) {
        return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" /></View>;
    }

    return (
        <View style={{flex: 1}}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 128, backgroundColor: 'white' }}
            >
                <View className="relative w-full" style={{ height: windowHeight / 2 }}>
                    <Image
                        source={{ uri: property.image }}
                        className="size-full"
                        resizeMode="cover"
                    />
                    <Image
                        source={images.whiteGradient}
                        className="absolute top-0 w-full z-40"
                    />
                    <View className="z-50 absolute inset-x-7" style={{ top: Platform.OS === "ios" ? 70 : 20 }}>
                        <View className="flex-row items-center w-full justify-between">
                            <TouchableOpacity onPress={() => router.back()} className="flex-row bg-primary-200 rounded-full size-11 items-center justify-center">
                                <Image source={icons.backArrow} className="size-5" />
                            </TouchableOpacity>
                            <View className="flex-row items-center gap-3">
                                <Image source={icons.heart} className="size-7" tintColor={"#191D31"} />
                                <Image source={icons.send} className="size-7" />
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-5 mt-7 flex gap-2">
                    <Text className="text-2xl font-rubik-extrabold">{property.name}</Text>
                    <View className="flex-row items-center gap-3 flex-wrap">
                        <View className="flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
                            <Text className="text-xs font-rubik-bold text-primary-300">{property.type}</Text>
                        </View>
                        {property.status && (
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status as PropertyStatus) }]}>
                                <Text style={styles.statusText}>{formatStatus(property.status as PropertyStatus)}</Text>
                            </View>
                        )}
                        <View className="flex-row items-center gap-2">
                            <Image source={icons.star} className="size-5" />
                            <Text className="text-black-200 text-sm mt-1 font-rubik-medium">{property.rating} ({property.reviews?.length ?? 0} reviews)</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center mt-5">
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10"><Image source={icons.bed} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{property.bedrooms} Beds</Text>
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7"><Image source={icons.bath} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{property.bathrooms} Baths</Text>
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7"><Image source={icons.area} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{property.area} sqft</Text>
                    </View>

                    {/* **FIX: Hiển thị thông tin Agent một cách an toàn** */}
                    {loadingAgent ? (
                        <ActivityIndicator size="small" style={{marginTop: 20}} />
                    ) : agent ? (
                        <View className="w-full border-t border-primary-200 pt-7 mt-5">
                            <Text className="text-black-300 text-xl font-rubik-bold">Agent</Text>
                            <View className="flex-row items-center justify-between mt-4">
                                <View className="flex-row items-center">
                                    <Image source={{ uri: agent.avatar }} className="size-14 rounded-full bg-gray-200" />
                                    <View className="flex-col items-start justify-center ml-3">
                                        <Text className="text-lg text-black-300 text-start font-rubik-bold">{agent.username}</Text>
                                        <Text className="text-sm text-black-200 text-start font-rubik-medium">{agent.email}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-3">
                                    <Image source={icons.chat} className="size-7" />
                                    <Image source={icons.phone} className="size-7" />
                                </View>
                            </View>
                        </View>
                    ) : null}

                    {/* ... (Các phần còn lại của UI) ... */}
                </View>
            </ScrollView>
            <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
                <View className="flex-row items-center justify-between gap-10">
                    <View className="flex-col items-start">
                        <Text className="text-black-200 text-xs font-rubik-medium">Price</Text>
                        <Text numberOfLines={1} className="text-primary-300 text-start text-2xl font-rubik-bold">${property.price}</Text>
                    </View>
                    <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400">
                        <Text className="text-white text-lg text-center font-rubik-bold">Book Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start' },
    statusText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});

export default PropertyDetails;
