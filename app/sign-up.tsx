import { createUser } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import * as ImagePicker from 'expo-image-picker';
import { Link, Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// REGIONS phải khớp với enum trong database
// Enum trong database: AnGiang, BaRiaVungTau, BacLieu, BenTre, BinhDinh, BinhDuong, BinhPhuoc, BinhThuan, CanTho, DaNang, DakLak, DienBien, DongNai, DongThap, HaGiang, HaNoi, HaTinh, HaiDuong, HaiPhong, HoaBinh, KhanhHoa, KienGiang, LamDong, LangSon, LongAn, NgheAn, PhuTho, QuangNam, QuangNinh, SocTrang, TayNinh, ThanhHoa, ThuaThienHue, TPHCM
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

const SignUp = () => {
    const { user, loading, refetch } = useGlobalContext();
    const [form, setForm] = useState<{
        name: string;
        email: string;
        password: string;
        phoneNumber: string;
        role: string;
        region?: RegionKey;
    }>({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'buyer',
        region: undefined
    });
    const [avatar, setAvatar] = useState<{ uri: string; type: string; name: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const router = useRouter();

    if (!loading && user) {
        return <Redirect href="/" />;
    }

    const pickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setAvatar({
                    uri: asset.uri,
                    type: 'image/jpeg',
                    name: `avatar_${Date.now()}.jpg`
                });
            }
        } catch (error) {
            console.error('Lỗi chọn ảnh:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const handleSignUp = async () => {
        if (!form.name || !form.email || !form.password || !form.phoneNumber) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (form.role === 'broker' && !form.region) {
            Alert.alert('Lỗi', 'Vui lòng chọn khu vực hoạt động cho Môi giới');
            return;
        }

        setIsSubmitting(true);
        try {
            await createUser(form.email, form.password, form.name, form.role, form.region, form.phoneNumber, avatar);

            // Sau khi đăng ký thành công (đã tự động đăng nhập), refetch lại dữ liệu người dùng
            await refetch({});

            Alert.alert('Thành công', 'Đăng ký thành công!', [
                { text: 'OK', onPress: () => router.replace('/') },
            ]);

        } catch (error: any) {
            console.error("Lỗi đăng ký chi tiết:", JSON.stringify(error, null, 2));
            Alert.alert('Lỗi đăng ký', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    const onRegionSelect = (regionKey: RegionKey) => {
        setForm({ ...form, region: regionKey });
        setIsPickerVisible(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Đăng Ký</Text>
                
                <View>
                    <Text className="text-base text-gray-600 font-rubik-medium">Username</Text>
                    <TextInput placeholder="Username" value={form.name} onChangeText={(e) => setForm({...form, name: e})} style={styles.input} />
                </View>

                {/* Ảnh đại diện (tùy chọn) */}
                <View style={{ marginBottom: 12 }}>
                    <Text className="text-base text-gray-600 font-rubik-medium">Ảnh đại diện (không bắt buộc)</Text>
                    {avatar ? (
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} />
                            <TouchableOpacity 
                                style={styles.removeAvatarButton}
                                onPress={() => setAvatar(null)}
                            >
                                <Text style={styles.removeAvatarText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={styles.avatarPlaceholder}
                            onPress={pickAvatar}
                        >
                            <Text style={styles.avatarPlaceholderText}>📷 Chọn ảnh đại diện</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                <View>
                    <Text className="text-base text-gray-600 font-rubik-medium">Email</Text>
                    <TextInput placeholder="Email" value={form.email} onChangeText={(e) => setForm({...form, email: e})} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
                </View>

                <View>
                    <Text className="text-base text-gray-600 font-rubik-medium">Số điện thoại</Text>
                    <TextInput 
                        placeholder="Số điện thoại" 
                        value={form.phoneNumber} 
                        onChangeText={(e) => setForm({...form, phoneNumber: e})} 
                        style={styles.input} 
                        keyboardType="phone-pad" 
                    />
                </View>
                
                <View>
                    <Text className="text-base text-gray-600 font-rubik-medium">Mật khẩu</Text>
                    <TextInput placeholder="Mật khẩu" value={form.password} onChangeText={(e) => setForm({...form, password: e})} style={styles.input} secureTextEntry />
                </View>
                
                <Text style={styles.roleLabel}>Bạn là:</Text>
                <View style={styles.roleContainer}>
                    <TouchableOpacity onPress={() => setForm({...form, role: 'buyer', region: undefined})} style={[styles.roleButton, form.role === 'buyer' && styles.roleButtonSelected]}>
                        <Text style={[styles.roleText, form.role === 'buyer' && styles.roleTextSelected]}>Người Mua</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setForm({...form, role: 'seller', region: undefined})} style={[styles.roleButton, form.role === 'seller' && styles.roleButtonSelected]}>
                        <Text style={[styles.roleText, form.role === 'seller' && styles.roleTextSelected]}>Người Bán</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setForm({...form, role: 'broker'})} style={[styles.roleButton, form.role === 'broker' && styles.roleButtonSelected]}>
                        <Text style={[styles.roleText, form.role === 'broker' && styles.roleTextSelected]}>Môi giới</Text>
                    </TouchableOpacity>
                </View>

                {form.role === 'broker' && (
                    <View style={{ marginTop: 15 }}>
                        <Text style={styles.roleLabel}>Khu vực hoạt động:</Text>
                        <TouchableOpacity style={styles.input} onPress={() => setIsPickerVisible(true)}>
                            <Text style={{ fontSize: 16, color: form.region ? '#333' : '#999', paddingVertical: 10 }}>
                                {form.region ? REGIONS[form.region] : 'Chọn Tỉnh / Thành phố'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ marginTop: 20 }}>
                    <Button title={isSubmitting ? "Đang xử lý..." : "Đăng Ký"} onPress={handleSignUp} disabled={isSubmitting} />
                </View>

                <View style={styles.loginLinkContainer}>
                    <Text>Đã có tài khoản? </Text>
                    <Link href="/sign-in" style={styles.loginLink}>Đăng nhập</Link>
                </View>
            </ScrollView>

            <Modal visible={isPickerVisible} animationType="slide" transparent={true} onRequestClose={() => setIsPickerVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>📍 Chọn Khu Vực Hoạt Động</Text>
                        <FlatList 
                            data={Object.entries(REGIONS)} 
                            keyExtractor={(item) => item[0]} 
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalItem} 
                                    onPress={() => onRegionSelect(item[0] as RegionKey)}
                                >
                                    <Text style={styles.modalItemText}>{item[1]}</Text>
                                </TouchableOpacity>
                            )} 
                            showsVerticalScrollIndicator={false}
                        />
                        <TouchableOpacity 
                            style={styles.modalCloseButton} 
                            onPress={() => setIsPickerVisible(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, marginTop: 40 },
    input: { height: 50, borderColor: '#ccc', borderWidth: 1, marginBottom: 12, paddingHorizontal: 10, borderRadius: 8, justifyContent: 'center' },
    avatarContainer: {
        alignItems: 'center',
        marginTop: 8,
        position: 'relative',
    },
    avatarPreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#007BFF',
    },
    removeAvatarButton: {
        position: 'absolute',
        top: -5,
        right: '35%',
        backgroundColor: '#DC3545',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeAvatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatarPlaceholder: {
        height: 120,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        marginTop: 8,
    },
    avatarPlaceholderText: {
        fontSize: 16,
        color: '#666',
    },
    roleLabel: { marginTop: 10, marginBottom: 5, fontSize: 16, fontWeight: '600', color: '#333' },
    roleContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    roleButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
    roleButtonSelected: { backgroundColor: '#007BFF', borderColor: '#007BFF' },
    roleText: { color: '#333' },
    roleTextSelected: { color: '#fff', fontWeight: 'bold' },
    loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
    loginLink: { color: '#007BFF', fontWeight: 'bold' },
    modalContainer: { 
        flex: 1, 
        justifyContent: 'flex-end', 
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: { 
        backgroundColor: 'white', 
        borderTopLeftRadius: 20, 
        borderTopRightRadius: 20, 
        padding: 20, 
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalItem: { 
        paddingVertical: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee',
    },
    modalItemText: { 
        fontSize: 16, 
        textAlign: 'center',
    },
    modalCloseButton: {
        marginTop: 15,
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontWeight: 'bold',
        color: '#333',
    }
});


export default SignUp;