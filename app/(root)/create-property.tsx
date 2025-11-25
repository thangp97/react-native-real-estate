import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { databases, storage, config, getPropertyById } from '@/lib/appwrite';
import { ID } from 'react-native-appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { ImagePickerAsset } from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import icons from '@/constants/icons';

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
        photos: []
    });

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
                            photos: [{ uri: property.image }]
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
            const data = {
                sellerId: user!.$id,
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
                status: 'pending_approval'
            };

            if (isEditing) {
                await databases.updateDocument(config.databaseId!, 'properties', propertyId!, data);
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

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Image source={icons.backArrow} style={{ width: 24, height: 24 }} tintColor="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{isEditing ? 'Chỉnh sửa tin' : 'Đăng tin Bất động sản'}</Text>
                </View>

                <Text style={styles.label}>Tên bài đăng</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: Bán nhà mặt tiền Quận 1" value={form.name} onChangeText={(e) => setForm({ ...form, name: e })} />
                
                <Text style={styles.label}>Mô tả chi tiết</Text>
                {/* **FIX: Áp dụng style mới cho ô mô tả** */}
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

                <TouchableOpacity style={styles.pickerButton} onPress={openPicker}>
                    <Text style={styles.pickerText}>Chọn ảnh (đã chọn {form.photos.length})</Text>
                </TouchableOpacity>

                <View style={styles.imagePreviewContainer}>
                    {form.photos.map((photo, index) => (
                        <Image key={index} source={{ uri: photo.uri }} style={styles.previewImage} />
                    ))}
                </View>

                <View style={{ marginTop: 20 }}>
                    <Button title={isSubmitting ? "Đang xử lý..." : (isEditing ? "Cập nhật" : "Gửi đi")} onPress={handleSubmit} disabled={isSubmitting} />
                </View>
            </ScrollView>

            <Modal visible={isPickerVisible} animationType="slide" transparent={true} onRequestClose={() => setIsPickerVisible(false)}>
                <View style={styles.modalContainer}><View style={styles.modalContent}><FlatList data={Object.entries(REGIONS)} keyExtractor={(item) => item[0]} renderItem={({ item }) => (<TouchableOpacity style={styles.modalItem} onPress={() => onRegionSelect(item[0] as RegionKey)}><Text style={styles.modalItemText}>{item[1]}</Text></TouchableOpacity>)} /><Button title="Đóng" onPress={() => setIsPickerVisible(false)} /></View></View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 10 },
    backButton: { padding: 8 },
    title: { fontSize: 24, fontWeight: 'bold', marginLeft: 10 },
    label: { fontSize: 16, fontWeight: '500', marginBottom: 5, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 15, fontSize: 16, height: 48, justifyContent: 'center' },
    // **FIX: Style mới cho ô mô tả**
    textArea: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        fontSize: 16,
        height: 120, // Chiều cao lớn hơn
        textAlignVertical: 'top' // Căn chữ bắt đầu từ trên xuống
    },
    inputText: { fontSize: 16 },
    pickerButton: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 5, alignItems: 'center', marginBottom: 15 },
    pickerText: { fontSize: 16 },
    imagePreviewContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    previewImage: { width: 100, height: 100, borderRadius: 5, margin: 5 },
    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
    typeButton: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, marginRight: 8, marginBottom: 8 },
    typeButtonSelected: { backgroundColor: '#007BFF', borderColor: '#007BFF' },
    typeText: { color: '#333' },
    typeTextSelected: { color: '#fff', fontWeight: 'bold' },
    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalItemText: { fontSize: 18, textAlign: 'center' }
});

export default CreateProperty;
