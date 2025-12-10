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
    Alert,
    Modal,
} from "react-native";
import { router, useLocalSearchParams, Link } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById } from "@/lib/api/buyer";
import { getAgentById } from "@/lib/api/broker";
import { getPropertyGallery, deleteProperty } from "@/lib/api/seller";
import { Models } from "react-native-appwrite";

const REGIONS = {
    AnGiang: "An Giang", BaRiaVungTau: "Bà Rịa - Vũng Tàu", BacGiang: "Bắc Giang", BacKan: "Bắc Kạn", BacLieu: "Bạc Liêu", BacNinh: "Bắc Ninh", BenTre: "Bến Tre", BinhDinh: "Bình Định", BinhDuong: "Bình Dương", BinhPhuoc: "Bình Phước", BinhThuan: "Bình Thuận", CaMau: "Cà Mau", CanTho: "Cần Thơ", CaoBang: "Cao Bằng", DaNang: "Đà Nẵng", DakLak: "Đắk Lắk", DakNong: "Đắk Nông", DienBien: "Điện Biên", DongNai: "Đồng Nai", DongThap: "Đồng Tháp", GiaLai: "Gia Lai", HaGiang: "Hà Giang", HaNam: "Hà Nam", HaNoi: "Hà Nội", HaTinh: "Hà Tĩnh", HaiDuong: "Hải Dương", HaiPhong: "Hải Phòng", HauGiang: "Hậu Giang", HoaBinh: "Hòa Bình", HungYen: "Hưng Yên", KhanhHoa: "Khánh Hòa", KienGiang: "Kiên Giang", KonTum: "Kon Tum", LaiChau: "Lai Châu", LamDong: "Lâm Đồng", LangSon: "Lạng Sơn", LaoCai: "Lào Cai", LongAn: "Long An", NamDinh: "Nam Định", NgheAn: "Nghệ An", NinhBinh: "Ninh Bình", NinhThuan: "Ninh Thuận", PhuTho: "Phú Thọ", PhuYen: "Phú Yên", QuangBinh: "Quảng Bình", QuangNam: "Quảng Nam", QuangNgai: "Quảng Ngãi", QuangNinh: "Quảng Ninh", QuangTri: "Quảng Trị", SocTrang: "Sóc Trăng", SonLa: "Sơn La", TayNinh: "Tây Ninh", ThaiBinh: "Thái Bình", ThaiNguyen: "Thái Nguyên", ThanhHoa: "Thanh Hóa", ThuaThienHue: "Thừa Thiên Huế", TienGiang: "Tiền Giang", TPHCM: "TP. Hồ Chí Minh", TraVinh: "Trà Vinh", TuyenQuang: "Tuyên Quang", VinhLong: "Vĩnh Long", VinhPhuc: "Vĩnh Phúc", YenBai: "Yên Bái"
};
type RegionKey = keyof typeof REGIONS;

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
    const { width } = Dimensions.get("window");
    const { user } = useGlobalContext();

    const { data: property, loading: loadingProperty } = useAppwrite({
        fn: getPropertyById,
        params: { id: id! },
        skip: !id
    });

    const { data: galleryImages, loading: loadingGallery } = useAppwrite({
        fn: getPropertyGallery,
        params: { propertyId: id! },
        skip: !id
    });

    const [agent, setAgent] = useState<Models.Document | null>(null);
    const [loadingAgent, setLoadingAgent] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    }, [property?.brokerId]);

    const handleDelete = () => {
        Alert.alert("Xác nhận Xóa", "Bạn có chắc chắn muốn xóa bài đăng này không? Hành động này không thể hoàn tác.",
            [{ text: "Hủy", style: "cancel" }, {
                text: "Xóa", style: "destructive",
                onPress: async () => {
                    try {
                        await deleteProperty({ propertyId: id! });
                        Alert.alert("Thành công", "Đã xóa bài đăng.");
                        router.back();
                    } catch (error: any) {
                        Alert.alert("Lỗi", `Không thể xóa bài đăng: ${error.message}`);
                    }
                },
            },]
        );
    };

    // **FIX: Sửa lại logic kiểm tra quyền sở hữu và quyền chỉnh sửa**
    const isOwner = user && property && user.$id === property.seller?.$id;
    const canEditOrDelete = isOwner && ['pending_approval', 'rejected'].includes(property.status);

    if (loadingProperty || !property) {
        return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={{ height: width * 0.8 }}>
                    {loadingGallery ? <ActivityIndicator /> : (
                        <FlatList
                            data={galleryImages}
                            keyExtractor={(item) => item.$id}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => setSelectedImage(item.image)}>
                                    <Image source={{ uri: item.image }} style={{ width: width, height: '100%' }} resizeMode="cover" />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>

                <View className="z-50 absolute inset-x-7" style={{ top: Platform.OS === "ios" ? 70 : 40 }}>
                    <View className="flex-row items-center w-full justify-between">
                        <TouchableOpacity onPress={() => router.back()} className="bg-white/70 rounded-full p-2">
                            <Image source={icons.backArrow} className="size-6" tintColor="#000" />
                        </TouchableOpacity>
                        <View className="flex-row items-center gap-4">
                            <TouchableOpacity className="bg-white/70 rounded-full p-2"><Image source={icons.heart} className="size-6" tintColor={"#000"} /></TouchableOpacity>
                            <TouchableOpacity className="bg-white/70 rounded-full p-2"><Image source={icons.send} className="size-6" tintColor={"#000"} /></TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="px-5 mt-7 flex gap-2">
                    <Text className="text-2xl font-rubik-extrabold">{property.name}</Text>
                    <Text style={styles.priceText}>{property.price.toLocaleString('vi-VN')} VNĐ</Text>
                    <View className="flex-row items-center gap-3 flex-wrap mt-2">
                        <View className="flex-row items-center px-4 py-2 bg-primary-100 rounded-full"><Text className="text-xs font-rubik-bold text-primary-300">{property.type}</Text></View>
                        {property.status && (
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status as PropertyStatus) }]}>
                                <Text style={styles.statusText}>{formatStatus(property.status as PropertyStatus)}</Text>
                            </View>
                        )}
                        <View className="flex-row items-center gap-2"><Image source={icons.star} className="size-5" /><Text className="text-black-200 text-sm mt-1 font-rubik-medium">{property.rating} ({property.reviews?.length ?? 0} đánh giá)</Text></View>
                    </View>

                    {canEditOrDelete && (
                        <View style={styles.actionContainer}>
                            <Link href={{ pathname: "/create-property", params: { id: id } }} asChild>
                                <TouchableOpacity style={styles.actionButton}><Text style={styles.actionButtonText}>Chỉnh sửa</Text></TouchableOpacity>
                            </Link>
                            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}><Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text></TouchableOpacity>
                        </View>
                    )}

                    <View className="flex-row items-center mt-5">
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10"><Image source={icons.bed} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{property.bedrooms} phòng ngủ</Text>
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7"><Image source={icons.bath} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{property.bathrooms} phòng tắm</Text>
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7"><Image source={icons.area} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{property.area} m²</Text>
                    </View>

                    <View className="flex-row items-center mt-3">
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full size-10"><Image source={icons.location} className="size-4" /></View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">{REGIONS[property.region as RegionKey] || property.region}</Text>
                    </View>

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">Tổng quan</Text>
                        <Text className="text-black-200 text-base font-rubik mt-2 leading-relaxed">{property.description}</Text>
                    </View>

                    {property.brokerId && (
                        loadingAgent ? <ActivityIndicator size="small" style={{marginTop: 20}} /> : agent ? (
                            <View className="w-full border-t border-primary-200 pt-7 mt-5">
                                <Text className="text-black-300 text-xl font-rubik-bold">Môi giới</Text>
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
                        ) : null
                    )}
                </View>
            </ScrollView>

            <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={() => setSelectedImage(null)}>
                    <Image source={{ uri: selectedImage! }} style={styles.fullscreenImage} resizeMode="contain" />
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start' },
    statusText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    actionContainer: { flexDirection: 'row', gap: 10, marginTop: 15 },
    actionButton: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
    actionButtonText: { fontSize: 16, fontWeight: '600' },
    deleteButton: { backgroundColor: '#FFEEEE' },
    deleteButtonText: { color: '#d9534f' },
    priceText: { fontSize: 22, fontWeight: 'bold', color: '#007BFF', marginTop: 4 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
    fullscreenImage: { width: '100%', height: '100%' },
});

export default PropertyDetails;
