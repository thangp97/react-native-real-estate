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
    Keyboard,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    Alert
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/constants/icons";
import Search from "@/components/Search";
import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import { useAppwrite } from "@/lib/useAppwrite";
import { getProperties, togglePropertyFavorite } from "@/lib/api/buyer";
import { useEffect, useState } from "react";
import NoResults from "@/components/NoResults";
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useFilterContext } from "@/lib/filter-provider";
import { useGlobalContext } from "@/lib/global-provider";

export default function Explore() {
    const { user, refetch: refetchUser, setUser } = useGlobalContext();
    const { 
        minPrice, setMinPrice,
        maxPrice, setMaxPrice,
        bedrooms, setBedrooms,
        area, setArea,
        region, setRegion,
        filter,
        query,
        resetFilters
    } = useFilterContext();
    
    const [modalVisible, setModalVisible] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    
    const [tempMinPrice, setTempMinPrice] = useState(minPrice);
    const [tempMaxPrice, setTempMaxPrice] = useState(maxPrice);
    const [tempBedrooms, setTempBedrooms] = useState(bedrooms);
    const [tempArea, setTempArea] = useState(area);
    const [tempRegion, setTempRegion] = useState(region);

    const cities = [
        { label: 'Toàn quốc', value: 'All' },
        { label: 'Hồ Chí Minh', value: 'TPHCM' },
        { label: 'Hà Nội', value: 'HaNoi' },
        { label: 'Đà Nẵng', value: 'DaNang' },
        { label: 'Bình Dương', value: 'BinhDuong' },
        { label: 'Đồng Nai', value: 'DongNai' },
        { label: 'Cần Thơ', value: 'CanTho' },
    ];

    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const { data: properties, loading, refetch } = useAppwrite({
        fn: getProperties,
        params: {
            filter: filter,
            query: query,
            limit: 20,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bedrooms: bedrooms,
            area: area,
            region: region
        },
        skip: true,
    })

    const handleCardPress = (id: string) => router.push(`/properties/${id}`);

    const handleToggleFavorite = async (propertyId: string) => {
        if (!user) {
            Alert.alert("Thông báo", "Vui lòng đăng nhập để lưu tin này.");
            return;
        }
        if (togglingId === propertyId) return;

        setTogglingId(propertyId);
        try {
            // Extract IDs if favorites are objects
            const currentFavorites = (user.favorites || []).map((item: any) => 
                typeof item === 'string' ? item : item.$id
            );
            
            const newFavorites = await togglePropertyFavorite(user.$id, propertyId, currentFavorites);
            
            if (setUser) {
                setUser({
                    ...user,
                    favorites: newFavorites
                });
            }
            
            // Optional: Show toast or small feedback
        } catch (error) {
            Alert.alert("Lỗi", "Không thể cập nhật danh sách yêu thích.");
            console.error(error);
        } finally {
            setTogglingId(null);
        }
    };

    const isFavorite = (propertyId: string) => {
        if (!user?.favorites) return false;
        return user.favorites.some((item: any) => {
            const itemId = typeof item === 'string' ? item : item.$id;
            return itemId === propertyId;
        });
    };

    useEffect(() => {
        refetch({
            filter: filter,
            query: query,
            limit: 20,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bedrooms: bedrooms,
            area: area,
            region: region
        })
    }, [filter, query, minPrice, maxPrice, bedrooms, area, region]);

    useEffect(() => {
        if (modalVisible) {
            setTempMinPrice(minPrice);
            setTempMaxPrice(maxPrice);
            setTempBedrooms(bedrooms);
            setTempArea(area);
            setTempRegion(region);
        }
    }, [modalVisible, minPrice, maxPrice, bedrooms, area, region]);

    const handleApplyFilters = () => {
        setMinPrice(tempMinPrice);
        setMaxPrice(tempMaxPrice);
        setBedrooms(tempBedrooms);
        setArea(tempArea);
        setRegion(tempRegion);
        setModalVisible(false);
    };

    const handleResetFilters = () => {
        setTempMinPrice('');
        setTempMaxPrice('');
        setTempBedrooms('');
        setTempArea('');
        setTempRegion('All');
        resetFilters();
        setModalVisible(false);
    };

    const renderHeader = () => (
        <View className="px-5 pb-2">
            <View className="flex flex-row items-center justify-between mt-5">
                <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">
                    Tìm kiếm ngôi nhà lý tưởng
                </Text>
                <TouchableOpacity onPress={() => router.push('/notifications')}>
                    <Image source={icons.bell} className="w-6 h-6" />
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

            <View className="mt-5">
                <Filters />
                <Text className="text-xl font-rubik-bold text-black-300 mt-5">
                    {`Tìm thấy ${properties?.length || 0} bất động sản`}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="bg-white h-full">
            {renderHeader()}

            {viewMode === 'list' ? (
                <FlatList 
                    key="flatlist-1-column"
                    data={properties}
                    renderItem={({ item }) => (
                        <View className="px-5 mb-6">
                            <Card 
                                item={item} 
                                onPress={() => handleCardPress(item.$id)}
                                onFavoritePress={() => handleToggleFavorite(item.$id)}
                                isFavorite={isFavorite(item.$id)}
                            />
                        </View>
                    )}
                    keyExtractor={(item) => item.$id}
                    numColumns={1}
                    contentContainerClassName="pb-32"
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator size="large" className="text-primary-300 mt-5" />
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
                                    const idNum = item.$id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
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
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View className="flex-1 justify-end bg-black/50">
                            <View className="bg-white rounded-t-3xl h-3/4 w-full overflow-hidden">
                                {/* Header */}
                                <View className="flex-row justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                                    <Text className="text-xl font-rubik-bold text-black-300">Bộ lọc nâng cao</Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                                        <Text className="text-black-200 text-lg">✕</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Scrollable Content */}
                                <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                                    <View className="space-y-4 py-4">
                                        <View>
                                            <Text className="text-base font-rubik-medium mb-2">Khu vực / Thành phố</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                <View className="flex-row gap-2">
                                                    {cities.map((city) => (
                                                        <TouchableOpacity
                                                            key={city.value}
                                                            onPress={() => setTempRegion(city.value)}
                                                            className={`px-4 py-2 rounded-full border ${
                                                                tempRegion === city.value 
                                                                    ? 'bg-primary-300 border-primary-300' 
                                                                    : 'bg-white border-primary-200'
                                                            }`}
                                                        >
                                                            <Text className={`font-rubik-medium ${
                                                                tempRegion === city.value ? 'text-white' : 'text-black-300'
                                                            }`}>
                                                                {city.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </ScrollView>
                                        </View>

                                        <View>
                                            <Text className="text-base font-rubik-medium mb-2">Khoảng giá (VNĐ)</Text>
                                            <View className="flex-row gap-3">
                                                <TextInput
                                                    className="flex-1 bg-gray-100 p-5 text-xl rounded-xl font-rubik"
                                                    placeholder="Tối thiểu"
                                                    keyboardType="numeric"
                                                    value={tempMinPrice}
                                                    onChangeText={setTempMinPrice}
                                                />
                                                <TextInput
                                                    className="flex-1 bg-gray-100 p-5 text-xl rounded-xl font-rubik"
                                                    placeholder="Tối đa"
                                                    keyboardType="numeric"
                                                    value={tempMaxPrice}
                                                    onChangeText={setTempMaxPrice}
                                                />
                                            </View>
                                        </View>

                                        <View className="mt-4">
                                            <Text className="text-base font-rubik-medium mb-2">Số phòng ngủ (tối thiểu)</Text>
                                            <TextInput
                                                className="flex-1 bg-gray-100 p-5 text-xl rounded-xl font-rubik"
                                                placeholder="Nhập số phòng ngủ"
                                                keyboardType="numeric"
                                                value={tempBedrooms}
                                                onChangeText={setTempBedrooms}
                                            />
                                        </View>

                                        <View className="mt-4">
                                            <Text className="text-base font-rubik-medium mb-2">Diện tích (m² tối thiểu)</Text>
                                            <TextInput
                                                className="flex-1 bg-gray-100 p-5 text-xl rounded-xl font-rubik"
                                                placeholder="Nhập diện tích"
                                                keyboardType="numeric"
                                                value={tempArea}
                                                onChangeText={setTempArea}
                                            />
                                        </View>
                                    </View>
                                </ScrollView>

                                {/* Footer Buttons */}
                                <View className="p-6 border-t border-gray-100 bg-white">
                                    <View className="flex-row gap-3">
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
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}