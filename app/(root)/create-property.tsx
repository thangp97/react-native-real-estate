import icons from '@/constants/icons';
import { getPropertyById } from '@/lib/api/buyer';
import { config, databases, storage } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ID, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

const PROPERTY_TYPES = [
    { value: 'House', label: 'Nhà phố' },
    { value: 'Townhouse', label: 'Nhà liền kề' },
    { value: 'Condo', label: 'Căn hộ' },
    { value: 'Duplex', label: 'Nhà song lập' },
    { value: 'Studio', label: 'Studio' },
    { value: 'Villa', label: 'Biệt thự' },
    { value: 'Apartment', label: 'Chung cư' },
    { value: 'Others', label: 'Khác' }
];

const DIRECTIONS = [
    { value: 'North', label: 'Bắc' },
    { value: 'South', label: 'Nam' },
    { value: 'East', label: 'Đông' },
    { value: 'West', label: 'Tây' },
    { value: 'Northeast', label: 'Đông Bắc' },
    { value: 'Northwest', label: 'Tây Bắc' },
    { value: 'Southeast', label: 'Đông Nam' },
    { value: 'Southwest', label: 'Tây Nam' },
    { value: 'Multiple', label: 'Nhiều hướng' },
    { value: 'Others', label: 'Khác' }
];

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
    ward: string; // Phường / Xã
    region: RegionKey;
    type: string;
    direction: string; // Hướng
    area: string;
    floors: number; // Số tầng (chỉ cho nhà)
    frontage: string; // Mặt tiền (chỉ cho nhà)
    depth: string; // Chiều sâu (chỉ cho nhà)
    roadWidth: string; // Đường trước nhà (chỉ cho nhà)
    bedrooms: number;
    bathrooms: number;
    photos: (ImagePickerAsset | { uri: string })[];
    video: ImagePickerAsset | { uri: string } | null;
    enableBidding: boolean; // Bật tính năng đấu giá môi giới
    biddingMinutes: number; // Số phút cho môi giới đăng ký nhận tin
}

const CreateProperty = () => {
    const { id: propertyId } = useLocalSearchParams<{ id?: string }>();
    const isEditing = !!propertyId;

    const { user } = useGlobalContext();
    const router = useRouter();
    const [loading, setLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    const [form, setForm] = useState<PropertyForm>({
        name: '',
        description: '',
        price: '',
        address: '',
        ward: '',
        region: 'TPHCM',
        type: 'House',
        direction: 'South',
        area: '',
        floors: 0,
        frontage: '',
        depth: '',
        roadWidth: '',
        bedrooms: 0,
        bathrooms: 0,
        photos: [],
        video: null,
        enableBidding: false,
        biddingMinutes: 1440, // 24 giờ = 1440 phút
    });

    // Tính toán ngày hết hạn (15 ngày từ hôm nay)
    const calculateExpiryDate = () => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 15);
        return expiryDate;
    };

    const expiryDate = calculateExpiryDate();

    useEffect(() => {
        if (isEditing && propertyId) {
            const fetchPropertyData = async () => {
                setLoading(true);
                try {
                    const property = await getPropertyById({ id: propertyId! });
                    if (property) {
                        // Lấy tất cả ảnh từ galleryImages, nếu không có thì dùng image chính
                        const allPhotos = property.galleryImages && property.galleryImages.length > 0
                            ? property.galleryImages.map((url: string) => ({ uri: url }))
                            : [{ uri: property.image }];
                        
                        setForm({
                            name: property.name,
                            description: property.description,
                            price: property.price.toString(),
                            address: property.address,
                            ward: property.ward || '',
                            region: property.region as RegionKey,
                            type: property.type,
                            direction: property.direction || 'South',
                            area: property.area.toString(),
                            floors: property.floors || 0,
                            frontage: property.frontage?.toString() || '',
                            depth: property.depth?.toString() || '',
                            roadWidth: property.roadWidth?.toString() || '',
                            bedrooms: property.bedrooms || 0,
                            bathrooms: property.bathrooms || 0,
                            photos: allPhotos,
                            video: property.video ? { uri: property.video } : null,
                        });
                    }
                } catch {
                    Alert.alert("Lỗi", "Không thể tải dữ liệu bài đăng.");
                } finally {
                    setLoading(false);
                }
            };
            fetchPropertyData();
        }
    }, [isEditing, propertyId]);

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

    const openVideoPicker = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Xin lỗi', 'Chúng tôi cần quyền truy cập thư viện để bạn có thể tải video lên.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: false,
            quality: 1,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const video = result.assets[0];
            // Kiểm tra kích thước video (giới hạn 50MB)
            if (video.fileSize && video.fileSize > 50 * 1024 * 1024) {
                Alert.alert('Lỗi', 'Video phải nhỏ hơn 50MB. Vui lòng chọn video khác.');
                return;
            }
            setForm({ ...form, video });
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

    const uploadVideo = async (file: ImagePickerAsset) => {
        if (!file || !file.mimeType || !file.fileSize) return null;
        const asset = { 
            name: file.fileName || `${ID.unique()}.mp4`, 
            type: file.mimeType, 
            size: file.fileSize, 
            uri: file.uri 
        };
        try {
            const uploadedFile = await storage.createFile(config.storageId!, ID.unique(), asset);
            return `${config.endpoint}/storage/buckets/${config.storageId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;
        } catch (error) {
            console.error('Lỗi tải video:', error);
            throw error;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 15); // Mặc định 15 ngày

            // Kiểm tra loại hình có phải là nhà không (không phải chung cư)
            const isHouseType = ['House', 'Townhouse', 'Duplex', 'Villa'].includes(form.type);
            
            const data: any = {
                seller: user!.$id,
                name: form.name,
                description: form.description,
                price: parseInt(form.price),
                address: form.address,
                ward: form.ward,
                region: form.region,
                type: form.type,
                direction: form.direction,
                area: parseFloat(form.area),
                bedrooms: form.bedrooms,
                bathrooms: form.bathrooms,
                status: 'available', // Bài đăng mới luôn có status là 'available' để môi giới có thể nhận
                expiresAt: expiresAt.toISOString(),
            };

            // Thêm bidding system nếu được bật
            if (form.enableBidding && !isEditing) {
                const biddingDeadline = new Date();
                biddingDeadline.setMinutes(biddingDeadline.getMinutes() + form.biddingMinutes);
                
                data.biddingDeadline = biddingDeadline.toISOString();
                data.biddingBrokers = [];
                data.biddingStatus = 'open';
                data.selectedBroker = null;
            }

            // Chỉ thêm các trường này nếu là loại hình nhà
            if (isHouseType) {
                if (form.floors > 0) data.floors = form.floors;
                if (form.frontage) data.frontage = parseFloat(form.frontage);
                if (form.depth) data.depth = parseFloat(form.depth);
                if (form.roadWidth) data.roadWidth = parseFloat(form.roadWidth);
            }

            if (isEditing) {
                // Khi chỉnh sửa, không thay đổi status và expiresAt
                const { status, expiresAt, ...updateData } = data;
                
                // Upload video nếu có video mới
                if (form.video && 'mimeType' in form.video) {
                    const videoUrl = await uploadVideo(form.video as ImagePickerAsset);
                    if (videoUrl) {
                        updateData.video = videoUrl;
                    }
                }
                
                // Xử lý cập nhật ảnh trong galleries
                // 1. Lấy tất cả ảnh hiện có từ galleries
                const existingGallery = await databases.listDocuments(
                    config.databaseId!,
                    config.galleriesCollectionId!,
                    [Query.equal('propertyId', propertyId!)]
                );
                
                // 2. Lấy danh sách URL ảnh hiện có và URL ảnh mới
                const existingUrls = existingGallery.documents.map(doc => doc.image);
                const newUrls = form.photos.filter(p => 'uri' in p && p.uri.startsWith('http')).map(p => p.uri);
                
                // 3. Xóa các ảnh không còn trong danh sách mới
                const urlsToDelete = existingUrls.filter(url => !newUrls.includes(url));
                const deletePromises = existingGallery.documents
                    .filter(doc => urlsToDelete.includes(doc.image))
                    .map(doc => databases.deleteDocument(
                        config.databaseId!,
                        config.galleriesCollectionId!,
                        doc.$id
                    ));
                await Promise.all(deletePromises);
                
                // 4. Upload và thêm ảnh mới (ảnh local chưa có trên server)
                const newPhotos = form.photos.filter(p => 'mimeType' in p) as ImagePickerAsset[];
                const uploadPromises = newPhotos.map(async photo => {
                    const url = await uploadFile(photo);
                    if (url) {
                        await databases.createDocument(
                            config.databaseId!,
                            config.galleriesCollectionId!,
                            ID.unique(),
                            { propertyId: propertyId!, image: url, uploaderId: user!.$id }
                        );
                    }
                });
                await Promise.all(uploadPromises);
                
                // 5. Cập nhật ảnh đại diện nếu có thay đổi
                if (form.photos.length > 0) {
                    const firstPhoto = form.photos[0];
                    if ('mimeType' in firstPhoto) {
                        // Ảnh đại diện mới được chọn
                        const coverImageUrl = await uploadFile(firstPhoto as ImagePickerAsset);
                        if (coverImageUrl) {
                            updateData.image = coverImageUrl;
                        }
                    } else if ('uri' in firstPhoto) {
                        // Ảnh đại diện là ảnh cũ
                        updateData.image = firstPhoto.uri;
                    }
                }
                
                await databases.updateDocument(config.databaseId!, 'properties', propertyId!, updateData);
                Alert.alert('Thành công', 'Đã cập nhật bài đăng.');
            } else {
                const coverImageUrl = await uploadFile(form.photos[0] as ImagePickerAsset);
                if (!coverImageUrl) throw new Error("Không thể tải ảnh đại diện.");
                
                // Upload video nếu có
                let videoUrl = null;
                if (form.video && 'mimeType' in form.video) {
                    videoUrl = await uploadVideo(form.video as ImagePickerAsset);
                }
                
                const propertyData = { ...data, image: coverImageUrl };
                if (videoUrl) {
                    propertyData.video = videoUrl;
                }
                
                const newProperty = await databases.createDocument(config.databaseId!, 'properties', ID.unique(), propertyData);
                const galleryPromises = form.photos.map(photo => uploadFile(photo as ImagePickerAsset).then(url => {
                    if (url) databases.createDocument(config.databaseId!, config.galleriesCollectionId!, ID.unique(), { propertyId: newProperty.$id, image: url, uploaderId: user!.$id });
                }));
                await Promise.all(galleryPromises);

                // Tạo thông báo cho tất cả broker trong cùng khu vực
                try {
                    const { createNotification } = await import('@/lib/api/notifications');
                    const { Query } = await import('react-native-appwrite');
                    
                    // Lấy tất cả broker
                    const brokersResult = await databases.listDocuments(
                        config.databaseId!,
                        config.profilesCollectionId!,
                        [
                            Query.equal('role', 'broker'),
                            Query.limit(100) // Giới hạn để tránh quá tải
                        ]
                    );

                    // Gửi thông báo cho từng broker
                    const notificationPromises = brokersResult.documents.map(broker =>
                        createNotification({
                            userId: broker.$id,
                            message: `Có bài đăng mới "${form.name}" tại ${REGIONS[form.region]} đang chờ môi giới tiếp nhận`,
                            type: 'property_available',
                            relatedPropertyId: newProperty.$id
                        }).catch(err => {
                            console.warn(`Không thể gửi thông báo cho broker ${broker.$id}:`, err);
                        })
                    );

                    await Promise.all(notificationPromises);
                } catch (notifError) {
                    console.warn("Không thể tạo thông báo cho broker:", notifError);
                    // Không throw error để không ảnh hưởng đến việc tạo property
                }
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

    // Kiểm tra đủ thông tin để gọi AI
    const canGenerateAI = () => {
        return form.region && form.ward && form.price && form.address && form.area;
    };

    // Lấy danh sách models khả dụng
    const listAvailableModels = async (): Promise<string[]> => {
        try {
            console.log('[AI] Đang lấy danh sách models khả dụng...');
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`
            );
            const data = await response.json();
            
            // Lọc các models hỗ trợ generateContent và ưu tiên models ổn định
            if (data.models) {
                const contentModels = data.models
                    .filter((model: any) => 
                        model.supportedGenerationMethods?.includes('generateContent') &&
                        !model.name.includes('embedding') &&
                        !model.name.includes('imagen') &&
                        !model.name.includes('veo')
                    )
                    .map((m: any) => m.name.replace('models/', ''));
                
                // Sắp xếp ưu tiên: Flash > Pro > Lite > Experimental
                const sortedModels = contentModels.sort((a: string, b: string) => {
                    const priorityOrder = ['flash-latest', 'flash', 'pro-latest', 'pro', 'lite'];
                    const getPriority = (name: string) => {
                        for (let i = 0; i < priorityOrder.length; i++) {
                            if (name.includes(priorityOrder[i])) return i;
                        }
                        return 999;
                    };
                    return getPriority(a) - getPriority(b);
                });
                
                console.log('[AI] ✅ Models khả dụng (ưu tiên):', sortedModels.slice(0, 5));
                return sortedModels.length > 0 ? sortedModels : ['gemini-2.5-flash'];
            }
            return ['gemini-2.5-flash'];
        } catch (error) {
            console.error('[AI] Lỗi lấy danh sách models:', error);
            return ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro-latest'];
        }
    };

    // Gọi Gemini AI để tạo tên bài đăng
    const generateTitle = async () => {
        if (!canGenerateAI()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ: Tỉnh/Thành phố, Phường/Xã, Giá, Địa chỉ và Diện tích');
            return;
        }

        setIsGeneratingTitle(true);
        try {
            // Lấy danh sách models khả dụng
            const modelNames = await listAvailableModels();
            
            const typeLabel = PROPERTY_TYPES.find(t => t.value === form.type)?.label || form.type;
            const priceInBillion = (parseInt(form.price) / 1000000000).toFixed(2);
            
            const prompt = `Viết một tiêu đề bài đăng bán bất động sản hấp dẫn (tối đa 60 ký tự) với thông tin sau:
- Loại: ${typeLabel}
- Địa chỉ: ${form.address}, ${form.ward}, ${REGIONS[form.region]}
- Diện tích: ${form.area}m²
- Giá: ${priceInBillion} tỷ VND
${form.bedrooms > 0 ? `- Phòng ngủ: ${form.bedrooms}` : ''}
${form.bathrooms > 0 ? `- Phòng tắm: ${form.bathrooms}` : ''}

Chỉ trả về tiêu đề, không giải thích.`;

            console.log('[AI generateTitle] Bắt đầu gọi Gemini API...');
            console.log('[AI generateTitle] Prompt:', prompt);

            // Thử từng model cho đến khi thành công
            let lastError = null;
            for (let i = 0; i < Math.min(3, modelNames.length); i++) {
                const modelName = modelNames[i];
                try {
                    console.log(`[AI generateTitle] Thử model ${i + 1}/${Math.min(3, modelNames.length)}:`, modelName);

                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        }
                    );

                    console.log('[AI generateTitle] Response status:', response.status);

                    const data = await response.json();

                    if (response.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                        const generatedTitle = data.candidates[0].content.parts[0].text.trim();
                        console.log('[AI generateTitle] ✅ Thành công với model:', modelName);
                        console.log('[AI generateTitle] Tiêu đề:', generatedTitle);
                        setForm({ ...form, name: generatedTitle });
                        return; // Thành công, thoát
                    } else if (response.status === 503) {
                        console.log(`[AI generateTitle] ⚠️ Model ${modelName} bị overload, thử model khác...`);
                        lastError = 'Model bị quá tải';
                        continue; // Thử model tiếp theo
                    } else {
                        console.log('[AI generateTitle] Response data:', JSON.stringify(data, null, 2));
                        lastError = data.error?.message || 'Không có kết quả';
                        continue;
                    }
                } catch (err) {
                    console.error(`[AI generateTitle] Lỗi với model ${modelName}:`, err);
                    lastError = err;
                    continue;
                }
            }

            // Nếu tất cả models đều thất bại
            console.log('[AI generateTitle] ❌ Tất cả models đều thất bại');
            Alert.alert('Lỗi', lastError || 'Không thể tạo tiêu đề. Vui lòng thử lại sau.');
        } catch (error) {
            console.error('[AI generateTitle] ❌ Lỗi gọi AI:', error);
            Alert.alert('Lỗi', 'Không thể kết nối AI. Vui lòng kiểm tra kết nối mạng.');
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    // Gọi Gemini AI để tạo mô tả chi tiết
    const generateDescription = async () => {
        if (!canGenerateAI()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ: Tỉnh/Thành phố, Phường/Xã, Giá, Địa chỉ và Diện tích');
            return;
        }

        setIsGeneratingDescription(true);
        try {
            // Lấy danh sách models khả dụng
            const modelNames = await listAvailableModels();
            
            const typeLabel = PROPERTY_TYPES.find(t => t.value === form.type)?.label || form.type;
            const directionLabel = DIRECTIONS.find(d => d.value === form.direction)?.label || '';
            const priceInBillion = (parseInt(form.price) / 1000000000).toFixed(2);
            const isHouseType = ['House', 'Townhouse', 'Duplex', 'Villa'].includes(form.type);
            
            const prompt = `Viết mô tả chi tiết bài đăng bán bất động sản (200-300 từ) chuyên nghiệp, hấp dẫn với thông tin sau:
- Loại: ${typeLabel}
- Địa chỉ: ${form.address}, ${form.ward}, ${REGIONS[form.region]}
- Diện tích: ${form.area}m²
- Giá: ${priceInBillion} tỷ VND
- Hướng: ${directionLabel}
${form.bedrooms > 0 ? `- Phòng ngủ: ${form.bedrooms}` : ''}
${form.bathrooms > 0 ? `- Phòng tắm: ${form.bathrooms}` : ''}
${isHouseType && form.floors > 0 ? `- Số tầng: ${form.floors}` : ''}
${isHouseType && form.frontage ? `- Mặt tiền: ${form.frontage}m` : ''}
${isHouseType && form.depth ? `- Chiều sâu: ${form.depth}m` : ''}

Mô tả cần:
1. Nêu bật ưu điểm vị trí, giao thông
2. Mô tả cấu trúc, thiết kế
3. Tiện ích xung quanh
4. Phù hợp cho gia đình hoặc đầu tư

Chỉ trả về mô tả, không giải thích.`;

            console.log('[AI generateDescription] Bắt đầu gọi Gemini API...');
            console.log('[AI generateDescription] Prompt:', prompt);

            // Thử từng model cho đến khi thành công
            let lastError = null;
            for (let i = 0; i < Math.min(3, modelNames.length); i++) {
                const modelName = modelNames[i];
                try {
                    console.log(`[AI generateDescription] Thử model ${i + 1}/${Math.min(3, modelNames.length)}:`, modelName);

                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        }
                    );

                    console.log('[AI generateDescription] Response status:', response.status);

                    const data = await response.json();

                    if (response.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                        const generatedDesc = data.candidates[0].content.parts[0].text.trim();
                        console.log('[AI generateDescription] ✅ Thành công với model:', modelName);
                        console.log('[AI generateDescription] Mô tả:', generatedDesc.substring(0, 100) + '...');
                        setForm({ ...form, description: generatedDesc });
                        return; // Thành công, thoát
                    } else if (response.status === 503) {
                        console.log(`[AI generateDescription] ⚠️ Model ${modelName} bị overload, thử model khác...`);
                        lastError = 'Model bị quá tải';
                        continue; // Thử model tiếp theo
                    } else {
                        console.log('[AI generateDescription] Response data:', JSON.stringify(data, null, 2));
                        lastError = data.error?.message || 'Không có kết quả';
                        continue;
                    }
                } catch (err) {
                    console.error(`[AI generateDescription] Lỗi với model ${modelName}:`, err);
                    lastError = err;
                    continue;
                }
            }

            // Nếu tất cả models đều thất bại
            console.log('[AI generateDescription] ❌ Tất cả models đều thất bại');
            Alert.alert('Lỗi', lastError || 'Không thể tạo mô tả. Vui lòng thử lại sau.');
        } catch (error) {
            console.error('[AI generateDescription] ❌ Lỗi gọi AI:', error);
            Alert.alert('Lỗi', 'Không thể kết nối AI. Vui lòng kiểm tra kết nối mạng.');
        } finally {
            setIsGeneratingDescription(false);
        }
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

                <View style={styles.labelWithButton}>
                    <Text style={styles.label}>Tên bài đăng</Text>
                    <TouchableOpacity 
                        style={[styles.aiButton, !canGenerateAI() && styles.aiButtonDisabled]}
                        onPress={generateTitle}
                        disabled={!canGenerateAI() || isGeneratingTitle}
                        activeOpacity={0.7}
                    >
                        {isGeneratingTitle ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.aiButtonText}>✨ AI</Text>
                        )}
                    </TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Ví dụ: Bán nhà mặt tiền Quận 1" value={form.name} onChangeText={(e) => setForm({ ...form, name: e })} />

                <View style={styles.labelWithButton}>
                    <Text style={styles.label}>Mô tả chi tiết</Text>
                    <TouchableOpacity 
                        style={[styles.aiButton, !canGenerateAI() && styles.aiButtonDisabled]}
                        onPress={generateDescription}
                        disabled={!canGenerateAI() || isGeneratingDescription}
                        activeOpacity={0.7}
                    >
                        {isGeneratingDescription ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.aiButtonText}>✨ AI</Text>
                        )}
                    </TouchableOpacity>
                </View>
                <TextInput 
                    style={styles.textArea} 
                    placeholder="Mô tả về vị trí, tiện ích, nội thất..." 
                    value={form.description} 
                    onChangeText={(e) => setForm({ ...form, description: e })} 
                    multiline 
                    scrollEnabled
                />

                <Text style={styles.label}>Tỉnh / Thành phố</Text>
                <TouchableOpacity style={styles.input} onPress={() => setIsPickerVisible(true)}>
                    <Text style={styles.inputText}>{REGIONS[form.region] || 'Chọn một tỉnh'}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Phường / Xã</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ví dụ: Phường 1, Quận 1" 
                    value={form.ward} 
                    onChangeText={(e) => setForm({ ...form, ward: e })} 
                />

                <Text style={styles.label}>Loại hình</Text>
                <View style={styles.typeContainer}>
                    {PROPERTY_TYPES.map(type => (
                        <TouchableOpacity key={type.value} onPress={() => setForm({ ...form, type: type.value })} style={[styles.typeButton, form.type === type.value && styles.typeButtonSelected]}>
                            <Text style={[styles.typeText, form.type === type.value && styles.typeTextSelected]}>{type.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Hướng</Text>
                <View style={styles.typeContainer}>
                    {DIRECTIONS.map(direction => (
                        <TouchableOpacity 
                            key={direction.value} 
                            onPress={() => setForm({ ...form, direction: direction.value })} 
                            style={[styles.typeButton, form.direction === direction.value && styles.typeButtonSelected]}
                        >
                            <Text style={[styles.typeText, form.direction === direction.value && styles.typeTextSelected]}>
                                {direction.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Giá (VND)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ví dụ: 5.000.000.000" 
                    value={form.price ? parseInt(form.price.replace(/\./g, '')).toLocaleString('vi-VN') : ''} 
                    onChangeText={(text) => {
                        const numericValue = text.replace(/\./g, '');
                        if (/^\d*$/.test(numericValue)) {
                            setForm({ ...form, price: numericValue });
                        }
                    }} 
                    keyboardType="numeric" 
                />

                <Text style={styles.label}>Địa chỉ</Text>
                <TextInput style={styles.input} placeholder="Số nhà, tên đường, phường, quận..." value={form.address} onChangeText={(e) => setForm({ ...form, address: e })} />

                <Text style={styles.label}>Diện tích (m²)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ví dụ: 80.5" 
                    value={form.area} 
                    onChangeText={(text) => {
                        // Chấp nhận dấu phẩy và chuyển thành dấu chấm
                        const normalizedText = text.replace(',', '.');
                        // Cho phép số và tối đa 1 dấu chấm
                        if (/^\d*\.?\d*$/.test(normalizedText)) {
                            setForm({ ...form, area: normalizedText });
                        }
                    }} 
                    keyboardType="decimal-pad" 
                />

                {/* Các trường chỉ hiển thị cho loại hình nhà (không phải chung cư) */}
                {['House', 'Townhouse', 'Duplex', 'Villa'].includes(form.type) && (
                    <>
                        <Text style={styles.label}>Số tầng</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity 
                                style={styles.counterButton}
                                onPress={() => setForm({ ...form, floors: Math.max(0, form.floors - 1) })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.counterButtonText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.counterValue}>{form.floors}</Text>
                            <TouchableOpacity 
                                style={styles.counterButton}
                                onPress={() => setForm({ ...form, floors: form.floors + 1 })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.counterButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Mặt tiền (m)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ví dụ: 5.5" 
                            value={form.frontage} 
                            onChangeText={(e) => setForm({ ...form, frontage: e })} 
                            keyboardType="numeric" 
                        />

                        <Text style={styles.label}>Chiều sâu (m)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ví dụ: 15" 
                            value={form.depth} 
                            onChangeText={(e) => setForm({ ...form, depth: e })} 
                            keyboardType="numeric" 
                        />

                        <Text style={styles.label}>Đường trước nhà (m)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ví dụ: 6" 
                            value={form.roadWidth} 
                            onChangeText={(e) => setForm({ ...form, roadWidth: e })} 
                            keyboardType="numeric" 
                        />
                    </>
                )}

                <Text style={styles.label}>Số phòng ngủ</Text>
                <View style={styles.counterContainer}>
                    <TouchableOpacity 
                        style={styles.counterButton}
                        onPress={() => setForm({ ...form, bedrooms: Math.max(0, form.bedrooms - 1) })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.counterButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{form.bedrooms}</Text>
                    <TouchableOpacity 
                        style={styles.counterButton}
                        onPress={() => setForm({ ...form, bedrooms: form.bedrooms + 1 })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.counterButtonText}>+</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Số phòng tắm, vệ sinh</Text>
                <View style={styles.counterContainer}>
                    <TouchableOpacity 
                        style={styles.counterButton}
                        onPress={() => setForm({ ...form, bathrooms: Math.max(0, form.bathrooms - 1) })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.counterButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{form.bathrooms}</Text>
                    <TouchableOpacity 
                        style={styles.counterButton}
                        onPress={() => setForm({ ...form, bathrooms: form.bathrooms + 1 })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.counterButtonText}>+</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.pickerButton} onPress={openPicker} activeOpacity={0.7}>
                    <Text style={styles.pickerText}>
                        📸 Chọn ảnh {form.photos.length > 0 ? `(đã chọn ${form.photos.length})` : '(chưa có ảnh)'}
                    </Text>
                </TouchableOpacity>

                {/* Preview ảnh đã chọn */}
                {form.photos.length > 0 && (
                    <View style={styles.imagePreviewContainer}>
                        {form.photos.map((photo, index) => (
                            <View key={index} style={styles.previewImageWrapper}>
                                <Image 
                                    source={{ uri: photo.uri }} 
                                    style={styles.previewImage}
                                />
                                <TouchableOpacity 
                                    style={styles.removeImageButton}
                                    onPress={() => {
                                        const newPhotos = form.photos.filter((_, i) => i !== index);
                                        setForm({ ...form, photos: newPhotos });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.removeImageText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity style={styles.pickerButton} onPress={openVideoPicker} activeOpacity={0.7}>
                    <Text style={styles.pickerText}>
                        🎥 Chọn video {form.video ? '(đã chọn video)' : '(tùy chọn - tối đa 50MB)'}
                    </Text>
                </TouchableOpacity>

                {form.video && (
                    <View style={styles.videoPreviewContainer}>
                        <Text style={styles.videoPreviewText}>✅ Video đã chọn</Text>
                        <TouchableOpacity 
                            style={styles.removeVideoButton} 
                            onPress={() => setForm({ ...form, video: null })}
                        >
                            <Text style={styles.removeVideoText}>Xóa</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Bidding System Settings - Chỉ hiển thị khi tạo mới */}
                {!isEditing && (
                    <View style={styles.biddingSection}>
                        <View style={styles.biddingSectionHeader}>
                            <Text style={styles.biddingSectionTitle}>🎲 Hệ thống đấu giá môi giới</Text>
                            <TouchableOpacity 
                                style={[styles.biddingToggle, form.enableBidding && styles.biddingToggleActive]}
                                onPress={() => setForm({ ...form, enableBidding: !form.enableBidding })}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.biddingToggleText, form.enableBidding && styles.biddingToggleTextActive]}>
                                    {form.enableBidding ? 'BẬT' : 'TẮT'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {form.enableBidding && (
                            <View style={styles.biddingOptions}>
                                <Text style={styles.biddingDescription}>
                                    Cho phép nhiều môi giới đăng ký nhận tin trong khoảng thời gian bạn chọn. 
                                    Sau khi hết thời gian, hệ thống sẽ tự động chọn môi giới phù hợp.
                                </Text>
                                
                                <Text style={styles.biddingLabel}>Thời gian chờ môi giới đăng ký:</Text>
                                <View style={styles.biddingHoursContainer}>
                                    {[
                                        { value: 5, label: '5 phút' },
                                        { value: 10, label: '10 phút' },
                                        { value: 360, label: '6 giờ' },
                                        { value: 720, label: '12 giờ' },
                                        { value: 1440, label: '24 giờ' },
                                        { value: 2880, label: '48 giờ' },
                                        { value: 4320, label: '72 giờ' },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.biddingHourButton,
                                                form.biddingMinutes === option.value && styles.biddingHourButtonActive
                                            ]}
                                            onPress={() => setForm({ ...form, biddingMinutes: option.value })}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.biddingHourText,
                                                form.biddingMinutes === option.value && styles.biddingHourTextActive
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.biddingInfoBox}>
                                    <Text style={styles.biddingInfoTitle}>📋 Quy tắc đấu giá:</Text>
                                    <Text style={styles.biddingInfoText}>• Nếu có 1 môi giới: Tự động nhận tin</Text>
                                    <Text style={styles.biddingInfoText}>• Nếu có 2+ môi giới: Bốc thăm ngẫu nhiên</Text>
                                    <Text style={styles.biddingInfoText}>• Nếu không có ai: Chuyển về chế độ thường</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

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
        minHeight: 140, 
        maxHeight: 400,
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
        marginTop: 12,
    },
    previewImageWrapper: {
        position: 'relative',
        margin: 5,
    },
    previewImage: { 
        width: 100, 
        height: 100, 
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#DC3545',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    removeImageText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 16,
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
    videoPreviewContainer: {
        backgroundColor: '#e7f3ff',
        padding: 16,
        borderRadius: 10,
        marginBottom: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#b3d9ff',
    },
    videoPreviewText: {
        fontSize: 15,
        color: '#004085',
        fontWeight: '500',
    },
    removeVideoButton: {
        backgroundColor: '#dc3545',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    removeVideoText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    // Bidding System Styles
    biddingSection: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: '#9c27b0',
    },
    biddingSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    biddingSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    biddingToggle: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 60,
    },
    biddingToggleActive: {
        backgroundColor: '#9c27b0',
    },
    biddingToggleText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    biddingToggleTextActive: {
        color: '#fff',
    },
    biddingOptions: {
        marginTop: 12,
    },
    biddingDescription: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 16,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
    },
    biddingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    biddingHoursContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    biddingHourButton: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        minWidth: 80,
    },
    biddingHourButtonActive: {
        backgroundColor: '#9c27b0',
        borderColor: '#9c27b0',
    },
    biddingHourText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    biddingHourTextActive: {
        color: '#fff',
    },
    biddingInfoBox: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#9c27b0',
    },
    biddingInfoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    biddingInfoText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 20,
        marginBottom: 4,
    },
    counterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007BFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007BFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    counterButtonText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
        lineHeight: 24,
    },
    counterValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        minWidth: 40,
        textAlign: 'center',
    },
    labelWithButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 4,
    },
    aiButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    aiButtonDisabled: {
        backgroundColor: '#9CA3AF',
        shadowColor: '#000',
        shadowOpacity: 0.1,
    },
    aiButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default CreateProperty;
