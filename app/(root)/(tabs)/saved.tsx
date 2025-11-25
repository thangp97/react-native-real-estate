import {ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View} from "react-native";
import {router} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import icons from "@/constants/icons";
import {Card} from "@/components/Cards";
import {useGlobalContext} from "@/lib/global-provider";
import {getSavedProperties} from "@/lib/appwrite";
import {useState, useEffect} from "react";

export default function Saved() {
    const {user, refetch} = useGlobalContext();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSavedProperties = async () => {
        if (user?.favorites && user.favorites.length > 0) {
            setLoading(true);
            try {
                const result = await getSavedProperties(user.favorites);
                setProperties(result);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        } else {
            setProperties([]);
        }
    };

    // Fetch lại khi màn hình được focus hoặc user favorites thay đổi
    useEffect(() => {
        fetchSavedProperties();
    }, [user?.favorites]);

    const handleCardPress = (id: string) => router.push(`/properties/${id}`);

    return (
        <SafeAreaView className={"bg-white h-full"}>
            <View className={"px-5 py-5 border-b border-gray-100"}>
                <Text className={"text-2xl font-rubik-bold text-black-300"}>
                    Tin đã lưu
                </Text>
            </View>

            <FlatList 
                data={properties}
                renderItem={({item}) => <Card item={item} onPress={() => handleCardPress(item.$id)} />}
                keyExtractor={(item) => item.$id}
                numColumns={2}
                contentContainerClassName={"pb-32"}
                columnWrapperClassName={"flex gap-5 px-5"}
                showsVerticalScrollIndicator={false}
                onRefresh={fetchSavedProperties}
                refreshing={loading}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size={"large"} className={"text-primary-300 mt-10"} />
                    ) : (
                        <View className="flex-1 items-center justify-center mt-20">
                             <Image 
                                source={icons.heart} 
                                className="size-20 mb-4 opacity-20" 
                                tintColor="#000"
                            />
                            <Text className="text-lg font-rubik-medium text-gray-500">
                                Bạn chưa lưu tin nào.
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/explore')} className="mt-4">
                                <Text className="text-primary-300 font-rubik-bold text-base">
                                    Khám phá ngay
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}
