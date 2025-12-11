import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
    FlatList
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import icons from "@/constants/icons";
import images from "@/constants/images";
import { useAppwrite } from "@/lib/useAppwrite";
import { getAgentById, getPropertiesByBrokerId } from "@/lib/api/broker";
import { Card } from "@/components/Cards";

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

    useEffect(() => {
        if (id) {
            refetchBroker();
            refetchProperties();
        }
    }, [id]);

    const handleContact = (method: 'call' | 'sms' | 'email' = 'call') => {
        if (!broker) return;

        const phone = broker.phone || "N/A";
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
                <ActivityIndicator size="large" color="#0000ff" />
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
    const agentPhone = broker.phone || "Đang cập nhật";

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Image source={icons.backArrow} className="w-6 h-6" />
                    </TouchableOpacity>
                    <Text className="text-xl font-rubik-bold text-black-300">
                        Thông tin Môi giới
                    </Text>
                    <View className="w-6" /> {/* Placeholder for alignment */}
                </View>

                <View className="p-5 items-center">
                    <Image
                        source={agentAvatar}
                        className="w-32 h-32 rounded-full border-2 border-primary-300"
                        resizeMode="cover"
                    />
                    <Text className="text-2xl font-rubik-extrabold text-black-300 mt-4">
                        {agentName}
                    </Text>
                    <Text className="text-base font-rubik-medium text-black-200 mt-1">
                        {agentEmail}
                    </Text>

                    <View className="flex-row mt-5 gap-4">
                        <TouchableOpacity
                            onPress={() => handleContact('call')}
                            className="bg-primary-300 p-3 rounded-full flex-row items-center justify-center min-w-[120px]"
                        >
                            <Image source={icons.phone} className="w-5 h-5 mr-2" tintColor="white" />
                            <Text className="text-white font-rubik-bold">Gọi</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleContact('sms')}
                            className="bg-primary-100 p-3 rounded-full flex-row items-center justify-center min-w-[120px]"
                        >
                            <Image source={icons.chat} className="w-5 h-5 mr-2" tintColor="#0061FF" />
                            <Text className="text-primary-300 font-rubik-bold">Nhắn tin</Text>
                        </TouchableOpacity>
                    </View>
                    <Text className="text-base font-rubik-medium text-black-200 mt-4">
                        Số điện thoại: {agentPhone}
                    </Text>
                </View>

                <View className="mt-7 px-5">
                    <Text className="text-xl font-rubik-bold text-black-300 mb-4">
                        Các bất động sản đang quản lý ({brokerProperties.length})
                    </Text>
                    {brokerProperties.length === 0 ? (
                        <Text className="text-gray-500 font-rubik-medium text-center">
                            Hiện không có bất động sản nào đang được quản lý.
                        </Text>
                    ) : (
                        <FlatList
                            data={brokerProperties}
                            keyExtractor={(item) => item.$id}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 15 }}
                            renderItem={({ item }) => (
                                <View style={{ width: '48%' }}>
                                    <Card 
                                        item={item} 
                                        onPress={() => router.push(`/properties/${item.$id}`)} 
                                    />
                                </View>
                            )}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            scrollEnabled={false} // Disable inner scroll, let parent ScrollView handle it
                        />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default BrokerDetails;
