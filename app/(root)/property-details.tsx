import { Audio, ResizeMode, Video } from 'expo-av';
import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PriceHistory from "@/components/PriceHistory";
import icons from "@/constants/icons";
import { getAgentById } from "@/lib/api/broker";
import { getPropertyById } from "@/lib/api/buyer";
import { deleteProperty, getPropertyGallery } from "@/lib/api/seller";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { Models } from "react-native-appwrite";

const REGIONS = {
    AnGiang: "An Giang", BaRiaVungTau: "Bà Rịa - Vũng Tàu", BacGiang: "Bắc Giang", BacKan: "Bắc Kạn", BacLieu: "Bạc Liêu", BacNinh: "Bắc Ninh", BenTre: "Bến Tre", BinhDinh: "Bình Định", BinhDuong: "Bình Dương", BinhPhuoc: "Bình Phước", BinhThuan: "Bình Thuận", CaMau: "Cà Mau", CanTho: "Cần Thơ", CaoBang: "Cao Bằng", DaNang: "Đà Nẵng", DakLak: "Đắk Lắk", DakNong: "Đắk Nông", DienBien: "Điện Biên", DongNai: "Đồng Nai", DongThap: "Đồng Tháp", GiaLai: "Gia Lai", HaGiang: "Hà Giang", HaNam: "Hà Nam", HaNoi: "Hà Nội", HaTinh: "Hà Tĩnh", HaiDuong: "Hải Dương", HaiPhong: "Hải Phòng", HauGiang: "Hậu Giang", HoaBinh: "Hòa Bình", HungYen: "Hưng Yên", KhanhHoa: "Khánh Hòa", KienGiang: "Kiên Giang", KonTum: "Kon Tum", LaiChau: "Lai Châu", LamDong: "Lâm Đồng", LangSon: "Lạng Sơn", LaoCai: "Lào Cai", LongAn: "Long An", NamDinh: "Nam Định", NgheAn: "Nghệ An", NinhBinh: "Ninh Bình", NinhThuan: "Ninh Thuận", PhuTho: "Phú Thọ", PhuYen: "Phú Yên", QuangBinh: "Quảng Bình", QuangNam: "Quảng Nam", QuangNgai: "Quảng Ngãi", QuangNinh: "Quảng Ninh", QuangTri: "Quảng Trị", SocTrang: "Sóc Trăng", SonLa: "Sơn La", TayNinh: "Tây Ninh", ThaiBinh: "Thái Bình", ThaiNguyen: "Thái Nguyên", ThanhHoa: "Thanh Hóa", ThuaThienHue: "Thừa Thiên Huế", TienGiang: "Tiền Giang", TPHCM: "TP. Hồ Chí Minh", TraVinh: "Trà Vinh", TuyenQuang: "Tuyên Quang", VinhLong: "Vĩnh Long", VinhPhuc: "Vĩnh Phúc", YenBai: "Yên Bái"
};
type RegionKey = keyof typeof REGIONS;

type PropertyStatus = 'pending_approval' | 'reviewing' | 'approved' | 'deposit_paid' | 'sold' | 'rejected' | 'expired' | 'available';

const DIRECTIONS: Record<string, string> = {
    'North': 'Bắc',
    'South': 'Nam',
    'East': 'Đông',
    'West': 'Tây',
    'Northeast': 'Đông Bắc',
    'Northwest': 'Tây Bắc',
    'Southeast': 'Đông Nam',
    'Southwest': 'Tây Nam',
    'Multiple': 'Nhiều hướng',
    'Others': 'Khác'
};

const formatStatus = (status: PropertyStatus, brokerName?: string) => {
    const statuses: Record<PropertyStatus, string> = {
        'pending_approval': 'Chờ duyệt',
        'reviewing': 'Đang xem xét',
        'approved': 'Đã duyệt',
        'deposit_paid': 'Đã cọc',
        'sold': 'Đã bán',
        'rejected': 'Bị từ chối',
        'expired': 'Hết hạn',
        'available': brokerName ? `Môi giới ${brokerName} nhận duyệt` : 'Chờ môi giới nhận'
    };
    return statuses[status] || status;
};

const getStatusColor = (status: PropertyStatus) => {
    const colors: Record<PropertyStatus, string> = {
        'pending_approval': '#f0ad4e',
        'reviewing': '#17a2b8',
        'approved': '#5cb85c',
        'deposit_paid': '#337ab7',
        'sold': '#d9534f',
        'rejected': '#777',
        'expired': '#777',
        'available': '#9c27b0' // Màu tím cho trạng thái available
    };
    return colors[status] || '#777';
};

const formatPrice = (price: number): string => {
    if (price >= 1000000000) {
        // >= 1 tỷ
        const ty = price / 1000000000;
        if (ty % 1 === 0) {
            return `${ty} tỷ`;
        }
        return `${ty.toFixed(1)} tỷ`;
    } else if (price >= 1000000) {
        // >= 1 triệu
        const trieu = price / 1000000;
        if (trieu % 1 === 0) {
            return `${trieu} triệu`;
        }
        return `${trieu.toFixed(1)} triệu`;
    } else if (price >= 1000) {
        // >= 1 nghìn
        const nghin = price / 1000;
        if (nghin % 1 === 0) {
            return `${nghin} nghìn`;
        }
        return `${nghin.toFixed(1)} nghìn`;
    }
    return `${price.toLocaleString('vi-VN')} VND`;
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

    // Combine property cover image with gallery images
    const allImages = [
        property?.image,
        ...(galleryImages?.map((g: any) => g.image) || [])
    ].filter(Boolean);

    // Configure audio mode for video playback
    useEffect(() => {
        const configureAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });
            } catch (error) {
                console.warn('Error setting audio mode:', error);
            }
        };
        configureAudio();
    }, []);

    useEffect(() => {
        const fetchAgent = async () => {
            if (property && property.brokerId) {
                setLoadingAgent(true);
                try {
                    // Xử lý brokerId có thể là object hoặc string
                    let agentId: string | null = null;
                    
                    if (typeof property.brokerId === 'object' && property.brokerId !== null) {
                        // Nếu là object, lấy $id
                        agentId = property.brokerId.$id || null;
                    } else if (typeof property.brokerId === 'string') {
                        // Nếu là string, validate trước khi sử dụng
                        agentId = property.brokerId.trim();
                        // Kiểm tra độ dài và format hợp lệ (tối đa 36 ký tự, chỉ chứa a-z, A-Z, 0-9, _)
                        if (agentId.length > 36 || !/^[a-zA-Z0-9_]+$/.test(agentId) || agentId.startsWith('_')) {
                            console.warn("ID môi giới không hợp lệ:", agentId);
                            agentId = null;
                        }
                    }
                    
                    if (agentId) {
                        const agentData = await getAgentById({ agentId });
                        setAgent(agentData);
                    } else {
                        setAgent(null);
                    }
                } catch (error) {
                    console.error("Lỗi khi lấy thông tin agent:", error);
                    setAgent(null);
                } finally {
                    setLoadingAgent(false);
                }
            } else {
                setLoadingAgent(false);
                setAgent(null);
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
    // Người bán có thể chỉnh sửa/xóa khi: chờ môi giới nhận (available), chờ duyệt (pending_approval), đang xem xét (reviewing), hoặc bị từ chối (rejected)
    const isOwner = user && property && user.$id === property.seller?.$id;
    const canEditOrDelete = isOwner && ['available', 'pending_approval', 'reviewing', 'rejected'].includes(property.status);

    if (loadingProperty || !property) {
        return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={{ height: width * 0.8 }}>
                    {loadingGallery ? <ActivityIndicator /> : (
                        <FlatList
                            data={allImages}
                            keyExtractor={(item, index) => `image-${index}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => setSelectedImage(item)}>
                                    <Image source={{ uri: item }} style={{ width: width, height: '100%' }} resizeMode="cover" />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>

                {/* Video Section */}
                {property.video && (
                    <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
                        <Text style={styles.sectionTitle}>🎥 Video giới thiệu</Text>
                        <Video
                            source={{ uri: property.video }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            style={{
                                width: '100%',
                                height: 220,
                                borderRadius: 12,
                                backgroundColor: '#000',
                                marginTop: 12,
                            }}
                        />
                    </View>
                )}

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
                    <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
                    
                    <View className="flex-row items-center gap-3 flex-wrap mt-2">
                        <View className="flex-row items-center px-4 py-2 bg-primary-100 rounded-full"><Text className="text-xs font-rubik-bold text-primary-300">{property.type}</Text></View>
                        {property.status && (
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status as PropertyStatus) }]}>
                                <Text style={styles.statusText}>
                                    {formatStatus(
                                        property.status as PropertyStatus,
                                        property.broker?.name || property.assignedBroker?.name || undefined
                                    )}
                                </Text>
                            </View>
                        )}
                        <View className="flex-row items-center gap-2"><Image source={icons.star} className="size-5" /><Text className="text-black-200 text-sm mt-1 font-rubik-medium">{property.rating} ({property.reviews?.length ?? 0} đánh giá)</Text></View>
                    </View>

                    {/* Hiển thị ngày hết hạn cho seller */}
                    {isOwner && property.expiresAt && (
                        <View style={styles.expiryCard}>
                            <View style={styles.expiryCardHeader}>
                                <Text style={styles.expiryCardTitle}>⏰ Thời hạn hiển thị</Text>
                            </View>
                            <View style={styles.expiryCardBody}>
                                <View style={styles.expiryInfoRow}>
                                    <Text style={styles.expiryLabel}>Ngày hết hạn:</Text>
                                    <Text style={styles.expiryValue}>
                                        {new Date(property.expiresAt).toLocaleDateString('vi-VN', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </Text>
                                </View>
                                {(() => {
                                    const expiryDate = new Date(property.expiresAt);
                                    const today = new Date();
                                    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;
                                    const isExpired = daysLeft < 0;
                                    
                                    return (
                                        <View style={styles.expiryInfoRow}>
                                            <Text style={styles.expiryLabel}>Trạng thái:</Text>
                                            <Text style={[
                                                styles.expiryStatus,
                                                isExpired && styles.expiryStatusExpired,
                                                isExpiringSoon && styles.expiryStatusWarning,
                                                !isExpired && !isExpiringSoon && styles.expiryStatusActive
                                            ]}>
                                                {isExpired 
                                                    ? `❌ Đã hết hạn ${Math.abs(daysLeft)} ngày trước`
                                                    : isExpiringSoon
                                                    ? `⚠️ Sắp hết hạn (còn ${daysLeft} ngày)`
                                                    : `✅ Còn ${daysLeft} ngày`
                                                }
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>
                    )}

                    {/* Hiển thị lịch sử giá cho seller */}
                    {isOwner && id && (
                        <View style={styles.priceHistoryContainer}>
                            <PriceHistory propertyId={id} />
                        </View>
                    )}

                    {canEditOrDelete && (
                        <View style={styles.actionContainer}>
                            <Link href={{ pathname: "/create-property", params: { id: id } }} asChild>
                                <TouchableOpacity style={styles.actionButton}><Text style={styles.actionButtonText}>Chỉnh sửa</Text></TouchableOpacity>
                            </Link>
                            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}><Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text></TouchableOpacity>
                        </View>
                    )}

                    {/* Thông tin chi tiết */}
                    <View style={styles.detailsCard}>
                        <Text style={styles.sectionTitle}>📋 Thông tin cơ bản</Text>
                        
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <View style={styles.iconCircle}>
                                    <Image source={icons.bed} className="size-5" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={styles.detailLabel}>Phòng ngủ</Text>
                                    <Text style={styles.detailValue}>{property.bedrooms}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <View style={styles.iconCircle}>
                                    <Image source={icons.bath} className="size-5" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={styles.detailLabel}>Phòng tắm</Text>
                                    <Text style={styles.detailValue}>{property.bathrooms}</Text>
                                </View>
                            </View>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <View style={styles.iconCircle}>
                                    <Image source={icons.area} className="size-5" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={styles.detailLabel}>Diện tích</Text>
                                    <Text style={styles.detailValue}>{property.area} m²</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <View style={styles.iconCircle}>
                                    <Image source={icons.location} className="size-5" />
                                </View>
                                <View style={styles.detailTextContainer}>
                                    <Text style={styles.detailLabel}>Khu vực</Text>
                                    <Text style={styles.detailValue} numberOfLines={1}>{REGIONS[property.region as RegionKey] || property.region}</Text>
                                </View>
                            </View>
                        </View>
                        
                        {property.direction && (
                            <View style={styles.detailRow}>
                                <View style={[styles.detailItem, { flex: 1 }]}>
                                    <View style={styles.iconCircle}>
                                        <Text style={styles.iconText}>🧭</Text>
                                    </View>
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>Hướng</Text>
                                        <Text style={styles.detailValue}>{DIRECTIONS[property.direction] || property.direction}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Phường / Xã */}
                        {property.ward && (
                            <View style={styles.detailRow}>
                                <View style={[styles.detailItem, { flex: 1 }]}>
                                    <View style={styles.iconCircle}>
                                        <Image source={icons.location} className="size-5" />
                                    </View>
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>Phường / Xã</Text>
                                        <Text style={styles.detailValue} numberOfLines={1}>{property.ward}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Địa chỉ chi tiết */}
                        {property.address && (
                            <View style={styles.addressContainer}>
                                <Text style={styles.addressLabel}>📍 Địa chỉ</Text>
                                <Text style={styles.addressText}>{property.address}</Text>
                            </View>
                        )}
                    </View>

                    {/* Thông tin chi tiết cho nhà (không phải chung cư) */}
                    {['House', 'Townhouse', 'Duplex', 'Villa'].includes(property.type) && (
                        <View style={styles.detailsCard}>
                            <Text style={styles.sectionTitle}>🏠 Thông tin nhà</Text>
                            
                            {(property.floors || property.frontage || property.depth || property.roadWidth) ? (
                                <>
                                    {property.floors && (
                                        <View style={styles.detailRow}>
                                            <View style={[styles.detailItem, { flex: 1 }]}>
                                                <View style={styles.iconCircle}>
                                                    <Text style={styles.iconText}>🏗️</Text>
                                                </View>
                                                <View style={styles.detailTextContainer}>
                                                    <Text style={styles.detailLabel}>Số tầng</Text>
                                                    <Text style={styles.detailValue}>{property.floors} tầng</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.detailRow}>
                                        {property.frontage && (
                                            <View style={styles.detailItem}>
                                                <View style={styles.iconCircle}>
                                                    <Text style={styles.iconText}>📏</Text>
                                                </View>
                                                <View style={styles.detailTextContainer}>
                                                    <Text style={styles.detailLabel}>Mặt tiền</Text>
                                                    <Text style={styles.detailValue}>{property.frontage} m</Text>
                                                </View>
                                            </View>
                                        )}
                                        {property.depth && (
                                            <View style={styles.detailItem}>
                                                <View style={styles.iconCircle}>
                                                    <Text style={styles.iconText}>📐</Text>
                                                </View>
                                                <View style={styles.detailTextContainer}>
                                                    <Text style={styles.detailLabel}>Chiều sâu</Text>
                                                    <Text style={styles.detailValue}>{property.depth} m</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {property.roadWidth && (
                                        <View style={styles.detailRow}>
                                            <View style={[styles.detailItem, { flex: 1 }]}>
                                                <View style={styles.iconCircle}>
                                                    <Text style={styles.iconText}>🛣️</Text>
                                                </View>
                                                <View style={styles.detailTextContainer}>
                                                    <Text style={styles.detailLabel}>Đường trước nhà</Text>
                                                    <Text style={styles.detailValue}>{property.roadWidth} m</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.noDataText}>Chưa có thông tin chi tiết về nhà</Text>
                            )}
                        </View>
                    )}

                    <View style={styles.descriptionCard}>
                        <Text style={styles.sectionTitle}>📝 Tổng quan</Text>
                        <Text style={styles.descriptionText}>{property.description}</Text>
                    </View>

                    {property.brokerId && (
                        loadingAgent ? <ActivityIndicator size="small" style={{marginTop: 20}} /> : agent ? (
                            <View style={styles.agentCard}>
                                <Text style={styles.sectionTitle}>👤 Môi giới</Text>
                                <View style={styles.agentContent}>
                                    <View style={styles.agentInfo}>
                                        <Image source={{ uri: agent.avatar }} style={styles.agentAvatar} />
                                        <View style={styles.agentDetails}>
                                            <Text style={styles.agentName}>{agent.username}</Text>
                                            <Text style={styles.agentEmail}>{agent.email}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.agentActions}>
                                        <TouchableOpacity style={styles.agentActionButton}>
                                            <Image source={icons.chat} className="size-6" tintColor="#007BFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.agentActionButton}>
                                            <Image source={icons.phone} className="size-6" tintColor="#28a745" />
                                        </TouchableOpacity>
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
    statusBadge: { 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20, 
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    statusText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 13,
        letterSpacing: 0.5,
    },
    actionContainer: { 
        flexDirection: 'row', 
        gap: 12, 
        marginTop: 20,
        marginBottom: 10,
    },
    actionButton: { 
        flex: 1, 
        paddingVertical: 14,
        paddingHorizontal: 16, 
        borderRadius: 10, 
        backgroundColor: '#007BFF', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    actionButtonText: { 
        fontSize: 16, 
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    deleteButton: { 
        backgroundColor: '#dc3545',
    },
    deleteButtonText: { 
        color: '#fff',
    },
    priceText: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: '#007BFF', 
        marginTop: 8,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    modalContainer: { 
        flex: 1, 
        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    fullscreenImage: { 
        width: '100%', 
        height: '100%' 
    },
    expiryCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    expiryCardHeader: {
        backgroundColor: '#007BFF',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    expiryCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.5,
    },
    expiryCardBody: {
        padding: 16,
        gap: 12,
    },
    expiryInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    expiryLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        flex: 0,
        minWidth: 100,
    },
    expiryValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    expiryStatus: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'right',
    },
    expiryStatusActive: {
        color: '#28a745',
    },
    expiryStatusWarning: {
        color: '#ffc107',
    },
    expiryStatusExpired: {
        color: '#dc3545',
    },
    priceHistoryContainer: {
        marginTop: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    detailsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    detailRow: {
        flexDirection: 'row',
        gap: 12,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 10,
        gap: 10,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 2,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: 'bold',
    },
    descriptionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    descriptionText: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
        textAlign: 'justify',
    },
    agentCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    agentContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    agentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    agentAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#e0e0e0',
        borderWidth: 2,
        borderColor: '#007BFF',
    },
    agentDetails: {
        marginLeft: 12,
        flex: 1,
    },
    agentName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    agentEmail: {
        fontSize: 14,
        color: '#666',
    },
    agentActions: {
        flexDirection: 'row',
        gap: 10,
    },
    agentActionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    addressContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#007BFF',
    },
    addressLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
    },
    addressText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    iconText: {
        fontSize: 20,
    },
    noDataText: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 16,
    },
});

export default PropertyDetails;
