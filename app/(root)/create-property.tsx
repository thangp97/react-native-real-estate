import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { databases, storage } from '@/lib/appwrite';
import { ID } from 'react-native-appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { ImagePickerAsset } from 'expo-image-picker';

interface PropertyForm {
    name: string;
    description: string;
    price: string;
    address: string;
    type: string;
    area: string;
    bedrooms: string;
    bathrooms: string;
    geolocation: string;
    photos: ImagePickerAsset[];
}

const CreateProperty = () => {
    const { user } = useGlobalContext();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<PropertyForm>({
        name: '',
        description: '',
        price: '',
        address: '',
        type: 'Nhà đất',
        area: '',
        bedrooms: '',
        bathrooms: '',
        geolocation: '',
        photos: []
    });

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
        if (!file) return null;
        
        const asset = {
            name: file.fileName || `${ID.unique()}.jpg`,
            type: file.mimeType,
            size: file.fileSize,
            uri: file.uri,
        };

        // **DEBUG: In ra đối tượng asset để kiểm tra**
        console.log('Đang chuẩn bị tải lên asset:', JSON.stringify(asset, null, 2));

        try {
            const uploadedFile = await storage.createFile(
                process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID!,
                ID.unique(),
                asset
            );
            const fileUrl = storage.getFilePreview(uploadedFile.bucketId, uploadedFile.$id);
            return fileUrl.toString();
        } catch (error) {
            console.error('Lỗi tải file:', error);
            throw error;
        }
    };

    const handleSubmit = async () => {
        if (!process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || !process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID) {
            Alert.alert('Lỗi cấu hình', 'Vui lòng kiểm tra lại các biến môi trường Appwrite.');
            return;
        }

        if (!form.name || !form.price || !form.address || !user || form.photos.length === 0) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc và chọn ít nhất 1 ảnh.');
            return;
        }
        setIsSubmitting(true);

        try {
            const coverImageUrl = await uploadFile(form.photos[0]);
            if (!coverImageUrl) {
                throw new Error("Không thể tải ảnh đại diện.");
            }

            await databases.createDocument(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
                'properties',
                ID.unique(),
                {
                    sellerId: user.$id,
                    name: form.name,
                    description: form.description,
                    price: parseInt(form.price),
                    address: form.address,
                    type: form.type,
                    area: parseFloat(form.area),
                    bedrooms: parseInt(form.bedrooms),
                    bathrooms: parseInt(form.bathrooms),
                    geolocation: form.geolocation,
                    image: coverImageUrl,
                    rating: 0,
                    status: 'pending_approval'
                }
            );

            Alert.alert('Thành công', 'Bài đăng của bạn đã được gửi đi và đang chờ phê duyệt.');
            router.push('/my-properties');

        } catch (error: any) {
            console.error('Lỗi đăng bài:', error);
            Alert.alert('Lỗi', `Đã có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
            <Text style={styles.title}>Đăng tin Bất động sản</Text>

            <Text style={styles.label}>Tên bài đăng</Text>
            <TextInput style={styles.input} placeholder="Ví dụ: Bán nhà mặt tiền Quận 1" value={form.name} onChangeText={(e) => setForm({ ...form, name: e })} />
            
            <Text style={styles.label}>Mô tả chi tiết</Text>
            <TextInput style={styles.input} placeholder="Mô tả về vị trí, tiện ích, nội thất..." value={form.description} onChangeText={(e) => setForm({ ...form, description: e })} multiline numberOfLines={4} />
            
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

            <Text style={styles.label}>Tọa độ (Geolocation)</Text>
            <TextInput style={styles.input} placeholder="Ví dụ: 10.7769, 106.7009" value={form.geolocation} onChangeText={(e) => setForm({ ...form, geolocation: e })} />

            <TouchableOpacity style={styles.pickerButton} onPress={openPicker}>
                <Text style={styles.pickerText}>Chọn ảnh (đã chọn {form.photos.length})</Text>
            </TouchableOpacity>

            <View style={styles.imagePreviewContainer}>
                {form.photos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo.uri }} style={styles.previewImage} />
                ))}
            </View>

            <View style={{ marginTop: 20 }}>
                <Button title={isSubmitting ? "Đang xử lý..." : "Gửi đi"} onPress={handleSubmit} disabled={isSubmitting} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '500', marginBottom: 5, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 15, fontSize: 16 },
    pickerButton: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 5, alignItems: 'center', marginBottom: 15 },
    pickerText: { fontSize: 16 },
    imagePreviewContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    previewImage: { width: 100, height: 100, borderRadius: 5, margin: 5 }
});

export default CreateProperty;
