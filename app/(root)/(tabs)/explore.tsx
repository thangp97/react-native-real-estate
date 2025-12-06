import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/constants/icons";
import Search from "@/components/Search";
import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import { useAppwrite } from "@/lib/useAppwrite";
import { getProperties } from "@/lib/appwrite";
import { useEffect, useState } from "react";
import NoResults from "@/components/NoResults";
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

export default function Explore() {
    const params = useLocalSearchParams<{ query?: string; filter?: string; }>();
    
    // State cho bộ lọc nâng cao
    const [modalVisible, setModalVisible] = useState(false);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [area, setArea] = useState('');

    // State cho chế độ xem (List vs Map)
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const { data: properties, loading, refetch } = useAppwrite({
        fn: getProperties,
        params: {
            filter: params.filter!,
            query: params.query!,
            limit: 20,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bedrooms: bedrooms,
            area: area
        },
        skip: true,
    })

    const handleCardPress = (id: string) => router.push(`/properties/${id}`);

    useEffect(() => {
        refetch({
            filter: params.filter!,
            query: params.query!,
            limit: 20,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bedrooms: bedrooms,
            area: area
        })
    }, [params.filter, params.query]);

    const handleApplyFilters = () => {
        refetch({
            filter: params.filter!,
            query: params.query!,
            limit: 20,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bedrooms: bedrooms,
            area: area
        });
        setModalVisible(false);
    };

    const handleResetFilters = () => {
        setMinPrice('');
        setMaxPrice('');
        setBedrooms('');
        setArea('');
        refetch({
            filter: params.filter!,
            query: params.query!,
            limit: 20,
            minPrice: '',
            maxPrice: '',
            bedrooms: '',
            area: ''
        });
        setModalVisible(false);
    };

    const renderHeader = () => (
        <View className={"px-5 pb-2"}>
            <View className={"flex flex-row items-center justify-between mt-5"}>
                <Text className={"text-base mr-2 text-center font-rubik-medium text-black-300"}>
                    Tìm kiếm ngôi nhà lý tưởng
                </Text>
                <TouchableOpacity onPress={() => router.push('/notifications')}>
                    <Image source={icons.bell} className={"w-6 h-6"} />
                </TouchableOpacity>
            </View>
            
            <View className="flex-row items-center mt-5 gap-3">
                <View className="flex-1">
                    <Search />
                </View>
                <TouchableOpacity 
                    onPress={() => setModalVisible(true)}
                    className="bg-primary-300 p-3 rounded-lg"
                >
                    <Image source={icons.filter} className="size-6" tintColor="white"/>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                    className="bg-primary-300 p-3 rounded-lg"
                >
                    <Image 
                        source={viewMode === 'list' ? icons.location : icons.home} 
                        className="size-6" 
                        tintColor="white"
                    />
                </TouchableOpacity>
            </View>

            <View className={"mt-5"}>
                <Filters />
                <Text className={"text-xl font-rubik-bold text-black-300 mt-5"}>
                    {`Tìm thấy ${properties?.length || 0} bất động sản`}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className={"bg-white h-full"}>
            {renderHeader()}

            {viewMode === 'list' ? (
                <FlatList 
                    data={properties}
                    renderItem={({ item }) => <Card item={item} onPress={() => handleCardPress(item.$id)} />}
                    keyExtractor={(item) => item.$id}
                    numColumns={2}
                    contentContainerClassName={"pb-32"}
                    columnWrapperClassName={"flex gap-5 px-5"}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator size={"large"} className={"text-primary-300 mt-5"} />
                        ) : <NoResults />
                    }
                />
            ) : (
                <View className="flex-1 px-5 pt-2 pb-24">
                    <View className="flex-1 rounded-2xl overflow-hidden border border-primary-200 relative bg-gray-100">
                        {loading ? (
                             <ActivityIndicator size="large" className="mt-20 text-primary-300"/>
                        ) : (
                            <MapView
                                style={{ width: '100%', height: '100%' }}
                                provider={PROVIDER_DEFAULT}
                                initialRegion={{
                                    latitude: 10.762622,
                                    longitude: 106.660172,
                                    latitudeDelta: 0.05,
                                    longitudeDelta: 0.05,
                                }}
                            >
                                {properties?.map((item) => {
                                    // Generate consistent fake coordinates based on ID
                                    const idNum = item.$id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                                    // Jitter around HCMC (10.76, 106.66)
                                    const lat = 10.762622 + (idNum % 100 - 50) / 1500;
                                    const lng = 106.660172 + (idNum % 70 - 35) / 1500;
                                    
                                    return (
                                        <Marker
                                            key={item.$id}
                                            coordinate={{ latitude: lat, longitude: lng }}
                                            title={item.name}
                                            description={item.price ? `${item.price.toLocaleString()} VND` : ''}
                                            onCalloutPress={() => handleCardPress(item.$id)}
                                        />
                                    )
                                })}
                            </MapView>
                        )}
                        {!properties?.length && !loading && (
                             <View className="absolute top-1/2 w-full">
                                 <Text className="text-center text-gray-500 font-rubik-medium">Không có bất động sản nào để hiển thị</Text>
                             </View>
                        )}
                    </View>
                    <Text className="text-xs text-gray-400 text-center mt-2 font-rubik">
                        * Vị trí trên bản đồ chỉ mang tính chất minh họa (Demo)
                    </Text>
                </View>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-3xl p-6 h-3/4">
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-xl font-rubik-bold text-black-300">Bộ lọc nâng cao</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text className="text-black-200 text-lg">✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="space-y-4">
                                <View>
                                    <Text className="text-base font-rubik-medium mb-2">Khoảng giá (VNĐ)</Text>
                                    <View className="flex-row gap-3">
                                        <TextInput
                                            className="flex-1 bg-gray-100 p-3 rounded-xl font-rubik"
                                            placeholder="Tối thiểu"
                                            keyboardType="numeric"
                                            value={minPrice}
                                            onChangeText={setMinPrice}
                                        />
                                        <TextInput
                                            className="flex-1 bg-gray-100 p-3 rounded-xl font-rubik"
                                            placeholder="Tối đa"
                                            keyboardType="numeric"
                                            value={maxPrice}
                                            onChangeText={setMaxPrice}
                                        />
                                    </View>
                                </View>

                                <View className="mt-4">
                                    <Text className="text-base font-rubik-medium mb-2">Số phòng ngủ (tối thiểu)</Text>
                                    <TextInput
                                        className="bg-gray-100 p-3 rounded-xl font-rubik"
                                        placeholder="Nhập số phòng ngủ"
                                        keyboardType="numeric"
                                        value={bedrooms}
                                        onChangeText={setBedrooms}
                                    />
                                </View>

                                <View className="mt-4">
                                    <Text className="text-base font-rubik-medium mb-2">Diện tích (m² tối thiểu)</Text>
                                    <TextInput
                                        className="bg-gray-100 p-3 rounded-xl font-rubik"
                                        placeholder="Nhập diện tích"
                                        keyboardType="numeric"
                                        value={area}
                                        onChangeText={setArea}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-3 mt-8">
                                <TouchableOpacity 
                                    onPress={handleResetFilters}
                                    className="flex-1 bg-gray-100 p-4 rounded-full"
                                >
                                    <Text className="text-center font-rubik-bold text-black-300">Đặt lại</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={handleApplyFilters}
                                    className="flex-1 bg-primary-300 p-4 rounded-full"
                                >
                                    <Text className="text-center font-rubik-bold text-white">Áp dụng</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        </SafeAreaView>
    );
}