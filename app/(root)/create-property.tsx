import icons from '@/constants/icons';
import { getPropertyById } from '@/lib/api/buyer';
import { config, databases, storage } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ID } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

const PROPERTY_TYPES = ['House', 'Townhouse', 'Condo', 'Duplex', 'Studio', 'Villa', 'Apartment', 'Others'];

const REGIONS = {
    AnGiang: "An Giang",
    BaRiaVungTau: "Bà Rịa - Vũng Tàu",
    BacLieu: "Bạc Liêu",
    BenTre: "Bến Tre",
    BinhDinh: "Bình Định",
    BinhDuong: "Bình Dương",
    BinhPhuoc: "Bình Phước",
    BinhThuan: "Bình Thuận",
    CanTho: "Cần Thơ",
    DaNang: "Đà Nẵng",
    DakLak: "Đắk Lắk",
    DienBien: "Điện Biên",
    DongNai: "Đồng Nai",
    DongThap: "Đồng Tháp",
    HaGiang: "Hà Giang",
    HaNoi: "Hà Nội",
    HaTinh: "Hà Tĩnh",
    HaiDuong: "Hải Dương",
    HaiPhong: "Hải Phòng",
    HoaBinh: "Hòa Bình",
    KhanhHoa: "Khánh Hòa",
    KienGiang: "Kiên Giang",
    LamDong: "Lâm Đồng",
    LangSon: "Lạng Sơn",
    LongAn: "Long An",
    NgheAn: "Nghệ An",
    PhuTho: "Phú Thọ",
    QuangNam: "Quảng Nam",
    QuangNinh: "Quảng Ninh",
    SocTrang: "Sóc Trăng",
    TayNinh: "Tây Ninh",
    ThanhHoa: "Thanh Hóa",
    ThuaThienHue: "Thừa Thiên Huế",
    TPHCM: "TP. Hồ Chí Minh"
};

type RegionKey = keyof typeof REGIONS;

interface PropertyForm {
    name: string;
    description: string;
    price: string;
    address: string;
    region: RegionKey;
    type: string;
    area: string;
    bedrooms: string;
    bathrooms: string;
    photos: (ImagePickerAsset | { uri: string })[];
}

const CreateProperty = () => {
    const { id: propertyId } = useLocalSearchParams<{ id?: string }>();
    const isEditing = !!propertyId;

    const { user } = useGlobalContext();
    const router = useRouter();
    const [loading, setLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPickerVisible, setIsPickerVisible] = useState(false);

    const [form, setForm] = useState<PropertyForm>({
        name: '',
        description: '',
        price: '',
        address: '',
        region: 'TPHCM',
        type: 'House',
        area: '',
        bedrooms: '',
        bathrooms: '',
        photos: [],
    });

    // Tính toán ngày hết hạn (15 ngày từ hôm nay)
    const calculateExpiryDate = () => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 15);
        return expiryDate;
    };

    const expiryDate = calculateExpiryDate();

    useEffect(() => {
        if (isEditing) {
            const fetchPropertyData = async () => {
                setLoading(true);
                try {
                    const property = await getPropertyById({ id: propertyId! });
                    if (property) {
                        setForm({
                            name: property.name,
                            description: property.description,
                            price: property.price.toString(),
                            address: property.address,
                            region: property.region as RegionKey,
                            type: property.type,
                            area: property.area.toString(),
                            bedrooms: property.bedrooms.toString(),
                            bathrooms: property.bathrooms.toString(),
                            photos: [{ uri: property.image }],
                        });
                    }
                } catch (error) {
                    Alert.alert("Lỗi", "Không thể tải dữ liệu bài đăng.");
                } finally {
                    setLoading(false);
                }
            };
            fetchPropertyData();
        }
    }, [propertyId]);

    const openPicker = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Xin lỗi', 'Chúng tôi cần quyền truy cập thư viện ảnh để bạn có thể tải ảnh lên.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });
        if (!result.canceled) {
            setForm({ ...form, photos: result.assets });
        }
    };

    const uploadFile = async (file: ImagePickerAsset) => {
        if (!file || !file.mimeType || !file.fileSize) return null;
        const asset = { name: file.fileName || `${ID.unique()}.jpg`, type: file.mimeType, size: file.fileSize, uri: file.uri };
        try {
            const uploadedFile = await storage.createFile(config.storageId!, ID.unique(), asset);
            return `${config.endpoint}/storage/buckets/${config.storageId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;
        } catch (error) {
            console.error('Lỗi tải file:', error);
            throw error;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 15); // Mặc định 15 ngày

            const data = {
                seller: user!.$id,
                name: form.name,
                description: form.description,
                price: parseInt(form.price),
                address: form.address,
                region: form.region,
                type: form.type,
                area: parseFloat(form.area),
                bedrooms: parseInt(form.bedrooms),
                bathrooms: parseInt(form.bathrooms),
                rating: 0,
                status: 'pending_approval',
                expiresAt: expiresAt.toISOString(),
            };

            if (isEditing) {
                const { expiresAt, ...updateData } = data;
                await databases.updateDocument(config.databaseId!, 'properties', propertyId!, updateData);
                Alert.alert('Thành công', 'Đã cập nhật bài đăng.');
            } else {
                const coverImageUrl = await uploadFile(form.photos[0] as ImagePickerAsset);
                if (!coverImageUrl) throw new Error("Không thể tải ảnh đại diện.");
                const newProperty = await databases.createDocument(config.databaseId!, 'properties', ID.unique(), { ...data, image: coverImageUrl });
                const galleryPromises = form.photos.map(photo => uploadFile(photo as ImagePickerAsset).then(url => {
                    if (url) databases.createDocument(config.databaseId!, config.galleriesCollectionId!, ID.unique(), { propertyId: newProperty.$id, image: url, uploaderId: user!.$id });
                }));
                await Promise.all(galleryPromises);
            }
            router.push('/my-properties');
        } catch (error: any) {
            Alert.alert('Lỗi', `Đã có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onRegionSelect = (regionKey: RegionKey) => {
        setForm({ ...form, region: regionKey });
        setIsPickerVisible(false);
    };

    if (loading) return <ActivityIndicator />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* ... (Giao diện giữ nguyên) ... */}
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Image source={icons.backArrow} style={{ width: 24, height: 24 }} tintColor="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{isEditing ? 'Chỉnh sửa tin' : 'Đăng tin Bất động sản'}</Text>
                </View>

                {/* Thông báo ngày hết hạn */}
                {!isEditing && (
                    <View style={styles.expiryInfoBox}>
                        <Text style={styles.expiryInfoTitle}>📅 Thông tin hiển thị</Text>
                        <Text style={styles.expiryInfoText}>
                            Bài đăng sẽ được hiển thị trong <Text style={styles.expiryInfoBold}>15 ngày</Text>
                        </Text>
                        <Text style={styles.expiryInfoDate}>
                            Ngày hết hạn: <Text style={styles.expiryInfoBold}>
                                {expiryDate.toLocaleDateString('vi-VN', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </Text>
                        </Text>
                        <Text style={styles.expiryInfoNote}>
                            💡 Bạn có thể gia hạn thêm bằng Điểm sau khi bài đăng được duyệt
                        </Text>
                    </View>
                )}

                <Text style={styles.label}>Tên bài đăng</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: Bán nhà mặt tiền Quận 1" value={form.name} onChangeText={(e) => setForm({ ...form, name: e })} />

                <Text style={styles.label}>Mô tả chi tiết</Text>
                <TextInput style={styles.textArea} placeholder="Mô tả về vị trí, tiện ích, nội thất..." value={form.description} onChangeText={(e) => setForm({ ...form, description: e })} multiline numberOfLines={4} />

                <Text style={styles.label}>Tỉnh / Thành phố</Text>
                <TouchableOpacity style={styles.input} onPress={() => setIsPickerVisible(true)}>
                    <Text style={styles.inputText}>{REGIONS[form.region] || 'Chọn một tỉnh'}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Loại hình</Text>
                <View style={styles.typeContainer}>
                    {PROPERTY_TYPES.map(type => (
                        <TouchableOpacity key={type} onPress={() => setForm({ ...form, type: type })} style={[styles.typeButton, form.type === type && styles.typeButtonSelected]}>
                            <Text style={[styles.typeText, form.type === type && styles.typeTextSelected]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Giá (VND)</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: 5000000000" value={form.price} onChangeText={(e) => setForm({ ...form, price: e })} keyboardType="numeric" />

                <Text style={styles.label}>Địa chỉ</Text>
                <TextInput style={styles.input} placeholder="Số nhà, tên đường, phường, quận..." value={form.address} onChangeText={(e) => setForm({ ...form, address: e })} />

                <Text style={styles.label}>Diện tích (m²)</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: 80.5" value={form.area} onChangeText={(e) => setForm({ ...form, area: e })} keyboardType="numeric" />

                <Text style={styles.label}>Số phòng ngủ</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: 3" value={form.bedrooms} onChangeText={(e) => setForm({ ...form, bedrooms: e })} keyboardType="numeric" />

                <Text style={styles.label}>Số phòng tắm</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: 2" value={form.bathrooms} onChangeText={(e) => setForm({ ...form, bathrooms: e })} keyboardType="numeric" />

                <TouchableOpacity style={styles.pickerButton} onPress={openPicker} activeOpacity={0.7}>
                    <Text style={styles.pickerText}>
                        📸 Chọn ảnh {form.photos.length > 0 ? `(đã chọn ${form.photos.length})` : '(chưa có ảnh)'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.submitButtonContainer}>
                    <TouchableOpacity 
                        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                        onPress={handleSubmit} 
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.submitButtonText}>
                            {isSubmitting ? "⏳ Đang xử lý..." : (isEditing ? "✏️ Cập nhật" : "🚀 Đăng tin")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={isPickerVisible} animationType="slide" transparent={true} onRequestClose={() => setIsPickerVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>📍 Chọn Tỉnh/Thành phố</Text>
                        <FlatList 
                            data={Object.entries(REGIONS)} 
                            keyExtractor={(item) => item[0]} 
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalItem} 
                                    onPress={() => onRegionSelect(item[0] as RegionKey)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalItemText}>{item[1]}</Text>
                                </TouchableOpacity>
                            )} 
                            showsVerticalScrollIndicator={false}
                        />
                        <TouchableOpacity 
                            style={styles.modalCloseButton} 
                            onPress={() => setIsPickerVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalCloseButtonText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        paddingHorizontal: 20,
        backgroundColor: '#f8f9fa',
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 24,
        paddingTop: 10,
        backgroundColor: '#fff',
        marginHorizontal: -20,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    backButton: { 
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    title: { 
        fontSize: 26, 
        fontWeight: 'bold', 
        marginLeft: 12,
        color: '#1a1a1a',
        letterSpacing: 0.5,
    },
    label: { 
        fontSize: 15, 
        fontWeight: '600', 
        marginBottom: 8,
        marginTop: 4,
        color: '#333',
        letterSpacing: 0.3,
    },
    input: { 
        borderWidth: 1.5, 
        borderColor: '#d0d0d0', 
        padding: 14, 
        borderRadius: 10, 
        marginBottom: 18, 
        fontSize: 16, 
        height: 52,
        backgroundColor: '#fff',
        color: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    textArea: { 
        borderWidth: 1.5, 
        borderColor: '#d0d0d0', 
        padding: 14, 
        borderRadius: 10, 
        marginBottom: 18, 
        fontSize: 16, 
        height: 140, 
        textAlignVertical: 'top',
        backgroundColor: '#fff',
        color: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputText: { 
        fontSize: 16,
        color: '#333',
    },
    pickerButton: { 
        backgroundColor: '#fff', 
        padding: 16, 
        borderRadius: 10, 
        alignItems: 'center', 
        marginBottom: 18,
        borderWidth: 1.5,
        borderColor: '#d0d0d0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    pickerText: { 
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    imagePreviewContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'flex-start',
        marginBottom: 12,
    },
    previewImage: { 
        width: 100, 
        height: 100, 
        borderRadius: 10, 
        margin: 5,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    typeContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        marginBottom: 18,
        gap: 8,
    },
    typeButton: { 
        paddingVertical: 10, 
        paddingHorizontal: 18, 
        borderWidth: 1.5, 
        borderColor: '#d0d0d0', 
        borderRadius: 24, 
        marginRight: 0,
        marginBottom: 0,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    typeButtonSelected: { 
        backgroundColor: '#007BFF', 
        borderColor: '#007BFF',
        shadowColor: '#007BFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    typeText: { 
        color: '#555',
        fontSize: 14,
        fontWeight: '500',
    },
    typeTextSelected: { 
        color: '#fff', 
        fontWeight: 'bold',
    },
    modalContainer: { 
        flex: 1, 
        justifyContent: 'flex-end', 
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: { 
        backgroundColor: 'white', 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        padding: 24, 
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    modalItem: { 
        paddingVertical: 18, 
        borderBottomWidth: 1, 
        borderBottomColor: '#f0f0f0',
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    modalItemText: { 
        fontSize: 17, 
        textAlign: 'center',
        color: '#333',
        fontWeight: '500',
    },
    infoBox: {
        backgroundColor: '#E7F3FF',
        padding: 14,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#b3d9ff',
    },
    infoText: {
        color: '#004085',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    expiryInfoBox: {
        backgroundColor: '#f0f8ff',
        borderLeftWidth: 5,
        borderLeftColor: '#007BFF',
        padding: 18,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#d0e8ff',
    },
    expiryInfoTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#007BFF',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    expiryInfoText: {
        fontSize: 15,
        color: '#333',
        marginBottom: 6,
        lineHeight: 22,
    },
    expiryInfoDate: {
        fontSize: 15,
        color: '#333',
        marginBottom: 10,
        lineHeight: 22,
    },
    expiryInfoBold: {
        fontWeight: 'bold',
        color: '#007BFF',
    },
    expiryInfoNote: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 6,
        lineHeight: 20,
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    submitButtonContainer: {
        marginTop: 24,
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#007BFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    submitButtonDisabled: {
        backgroundColor: '#6c757d',
        shadowColor: '#6c757d',
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    modalCloseButton: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 16,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
});

export default CreateProperty;
