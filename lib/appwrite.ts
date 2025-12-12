import * as Linking from 'expo-linking';
import { Account, AppwriteException, Avatars, Client, Databases, ID, OAuthProvider, Storage } from "react-native-appwrite";

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    platform: 'com.ptit.restate',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID,
    profilesCollectionId: 'profiles',
    agentsCollectionId: 'agents', // Thêm collection Agents
    propertiesCollectionId: 'properties',
    galleriesCollectionId: 'galleries',
    bookingsCollectionId: 'bookings',
    notificationsCollectionId: 'notifications',
    messagesCollectionId: 'messages',
    chatsCollectionId: 'chats',
    priceHistoryCollectionId: 'price_history',
    reviewsCollectionId: 'reviews', // Collection đánh giá
}

export const client = new Client();

client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setPlatform(config.platform!);

export const account = new Account(client);
export const avatar = new Avatars(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export async function createUser(email: string, password: string, username: string, role: string, region?: string, phoneNumber?: string) {
    let newAccount;
    try {
        newAccount = await account.create(ID.unique(), email, password, username);
    } catch (error: any) {
        console.error("Lỗi khi tạo tài khoản Appwrite:", error);
        if (error instanceof AppwriteException) {
            if (error.code === 409) {
                throw new Error("Email này đã được sử dụng. Vui lòng chọn email khác.");
            } else if (error.code === 400) {
                if (error.message.includes('Password')) {
                    throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
                }
            }
        }
        throw new Error("Không thể tạo tài khoản. Vui lòng thử lại.");
    }

    if (!newAccount) throw new Error("Không thể tạo tài khoản, không có phản hồi từ máy chủ.");

    try {
        await account.createEmailPasswordSession(email, password);
    } catch (error) {
        console.error("Lỗi khi tạo session sau khi đăng ký:", error);
    }

    try {
        // Danh sách các giá trị region hợp lệ theo enum trong database
        const validRegions = [
            'AnGiang', 'BaRiaVungTau', 'BacLieu', 'BenTre', 'BinhDinh', 'BinhDuong', 
            'BinhPhuoc', 'BinhThuan', 'CanTho', 'DaNang', 'DakLak', 'DienBien', 
            'DongNai', 'DongThap', 'HaGiang', 'HaNoi', 'HaTinh', 'HaiDuong', 
            'HaiPhong', 'HoaBinh', 'KhanhHoa', 'KienGiang', 'LamDong', 'LangSon', 
            'LongAn', 'NgheAn', 'PhuTho', 'QuangNam', 'QuangNinh', 'SocTrang', 
            'TayNinh', 'ThanhHoa', 'ThuaThienHue', 'TPHCM'
        ];

        const profileData: any = {
            role: role,
            name: username,
            email: email,
            credits: 10, // **GÁN CREDITS MẶC ĐỊNH**
        };

        if (phoneNumber) {
            if (role === 'broker' || role === 'seller') {
                profileData.phoneNumber = phoneNumber;
            } else {
                console.warn(`[createUser] PhoneNumber không được lưu cho role ${role}.`);
            }
        }

        if (region) {
            // Kiểm tra xem region có hợp lệ không
            if (validRegions.includes(region)) {
                profileData.region = region;
            } else {
                console.warn(`[createUser] Region không hợp lệ: ${region}. Bỏ qua trường region.`);
                // Không thêm region nếu không hợp lệ
            }
        }

        console.log('[createUser] Profile data sẽ tạo:', JSON.stringify(profileData, null, 2));

        const profile = await databases.createDocument(
            config.databaseId!, 
            config.profilesCollectionId!, 
            newAccount.$id, 
            profileData
        );
        return profile;
    } catch (error: any) {
        console.error("Lỗi khi tạo document profile:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            type: error.type
        });
        throw new Error(`Không thể tạo hồ sơ người dùng: ${error.message}`);
    }
}


export async function signIn(email: string, password: string) {
    try {
        try { await account.deleteSession('current'); } catch { /* Bỏ qua lỗi nếu không có session */ }
        return await account.createEmailPasswordSession(email, password);
    } catch (error: any) {
        console.log("Lỗi signIn:", error);
        if (error instanceof AppwriteException) {
            if (error.code === 401) {
                throw new Error("Email hoặc mật khẩu không chính xác.");
            }
        }
        throw new Error("Đã có lỗi xảy ra khi đăng nhập.");
    }
}

export async function loginWithGoogle() {
    try {
        const redirectUri = Linking.createURL('/');
        return await account.createOAuth2Session(OAuthProvider.Google, redirectUri);
    } catch (error: any) {
        console.error("Lỗi login google:", error);
        return null;
    }
}

export async function getCurrentUser() {
    try {
        const currentAccount = await account.get();
        if (!currentAccount) return null;

        // Lấy profile từ profiles collection theo userId
        const userProfile = await databases.getDocument(config.databaseId!, config.profilesCollectionId!, currentAccount.$id);
        
        return { 
            $id: currentAccount.$id,
            email: currentAccount.email,
            name: userProfile.name || '', // Chỉ lấy từ profiles, không fallback về Auth
            role: userProfile.role,
            avatar: userProfile.avatar || null, // Chỉ lấy từ profiles
            credits: userProfile.credits,
            favorites: userProfile.favorites || [], // Lấy danh sách yêu thích
            region: userProfile.region, // Lấy thông tin vùng hoạt động của môi giới
            phoneNumber: userProfile.phoneNumber || null,
        };

    } catch (error: any) {
        if (error.code !== 401) {
            console.log("Lỗi getCurrentUser:", error);
        }
        return null;
    }
}


// ... other functions

export async function getUserProfileById(userId: string) {
    try {
        const userProfile = await databases.getDocument(config.databaseId!, config.profilesCollectionId!, userId);
        return userProfile;
    } catch (error) {
        console.error("Lỗi khi lấy hồ sơ người dùng theo ID:", error);
        return null;
    }
}

export async function signOut() {
    try {
        return await account.deleteSession('current');
    } catch (error: any) {
        console.log("Lỗi signOut:", error);
        throw new Error(error.message);
    }
}

export async function updateUserProfile(userId: string, data: object) {
    try {
        // Danh sách các trường được phép cập nhật (không bao gồm relationship fields)
        const allowedFields = ['name', 'avatar', 'email', 'role', 'credits', 'rating', 'reviewCount', 'region', 'favorites', 'phoneNumber'];
        
        // Danh sách các trường relationship cần loại bỏ hoàn toàn
        const relationshipFields = ['bookings', 'properties'];
        
        // Log dữ liệu đầu vào
        console.log('[updateUserProfile] Dữ liệu đầu vào:', JSON.stringify(data, null, 2));
        
        // Tạo payload chỉ chứa các trường được phép và không phải relationship
        const updatePayload: any = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Bỏ qua các trường relationship
            if (relationshipFields.includes(key)) {
                console.log(`[updateUserProfile] Bỏ qua ${key}: relationship field`);
                continue;
            }
            
            // Chỉ cho phép các trường trong danh sách allowed
            if (!allowedFields.includes(key)) {
                console.log(`[updateUserProfile] Bỏ qua ${key}: không trong danh sách allowed`);
                continue;
            }
            
            // Bỏ qua null/undefined
            if (value === null || value === undefined) {
                continue;
            }
            
            // Xử lý favorites (array của strings)
            if (key === 'favorites') {
                if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                    updatePayload[key] = value;
                }
                continue;
            }
            
            // Chỉ chấp nhận primitive values: string, number, boolean
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                updatePayload[key] = value;
            }
        }
        
        // Kiểm tra nếu không có dữ liệu hợp lệ
        if (Object.keys(updatePayload).length === 0) {
            throw new Error('Không có dữ liệu hợp lệ nào để cập nhật');
        }
        
        console.log('[updateUserProfile] Payload sẽ gửi:', JSON.stringify(updatePayload, null, 2));
        console.log('[updateUserProfile] User ID:', userId);
        console.log('[updateUserProfile] User role:', (data as any).role || 'unknown');
        
        // Lấy document hiện tại để kiểm tra cấu trúc
        try {
            const currentDoc = await databases.getDocument(
                config.databaseId!,
                config.profilesCollectionId!,
                userId
            );
            
            // Kiểm tra các trường relationship
            for (const field of relationshipFields) {
                if (field in currentDoc) {
                    const fieldValue = currentDoc[field];
                    console.log(`[updateUserProfile] Trường ${field} hiện tại:`, {
                        type: typeof fieldValue,
                        isArray: Array.isArray(fieldValue),
                        value: Array.isArray(fieldValue) ? `Array(${fieldValue.length})` : fieldValue
                    });
                }
            }
        } catch (docError) {
            console.warn('[updateUserProfile] Không thể lấy document hiện tại:', docError);
        }
        
        // Cập nhật document - chỉ gửi các trường cụ thể, không động đến relationship fields
        // Appwrite sẽ chỉ cập nhật các trường được gửi, các trường khác sẽ giữ nguyên
        try {
            const updatedProfile = await databases.updateDocument(
                config.databaseId!,
                config.profilesCollectionId!,
                userId,
                updatePayload
            );
            
            console.log('[updateUserProfile] Cập nhật thành công');
            return updatedProfile;
        } catch (updateError: any) {
            console.error('[updateUserProfile] Lỗi khi cập nhật:', {
                message: updateError.message,
                code: updateError.code,
                type: updateError.type,
                response: updateError.response
            });
            
            // Nếu lỗi liên quan đến relationship, thử cách khác
            if (updateError.message?.includes('relationship') || updateError.code === 400) {
                console.log('[updateUserProfile] Thử cách tiếp cận khác: chỉ cập nhật trường name');
                
                // Chỉ cập nhật trường name nếu đó là trường duy nhất được yêu cầu
                if (Object.keys(updatePayload).length === 1 && updatePayload.name) {
                    // Thử lại với chỉ trường name
                    const nameOnlyPayload = { name: updatePayload.name };
                    console.log('[updateUserProfile] Thử với payload chỉ có name:', nameOnlyPayload);
                    
                    const updatedProfile = await databases.updateDocument(
                        config.databaseId!,
                        config.profilesCollectionId!,
                        userId,
                        nameOnlyPayload
                    );
                    
                    console.log('[updateUserProfile] Cập nhật thành công với chỉ trường name');
                    return updatedProfile;
                }
            }
            
            throw updateError;
        }
    } catch (error: any) {
        console.error('Lỗi cập nhật hồ sơ:', error);
        console.error('Dữ liệu đã gửi:', JSON.stringify(data, null, 2));
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            type: error.type
        });
        throw error;
    }
}

export async function uploadFile(file: any) {
    if (!file) return null;

    try {
        // Xử lý file từ ImagePicker
        const asset: any = {
            name: file.fileName || file.name || `${ID.unique()}.jpg`,
            type: file.mimeType || file.type || 'image/jpeg',
            size: file.fileSize || file.size || 0,
            uri: file.uri
        };

        const uploadedFile = await storage.createFile(
            config.storageId!,
            ID.unique(),
            asset
        );

        if (!uploadedFile || !uploadedFile.$id) {
            throw new Error("Không thể tạo file trên server.");
        }

        // Tạo URL view cho file
        const fileUrl = `${config.endpoint}/storage/buckets/${config.storageId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;

        return fileUrl;
    } catch (error: any) {
        console.error("Lỗi upload file:", error);
        throw new Error(error.message || "Không thể tải file lên server.");
    }
}

export async function updateCredit(userId: string, amount: number) {
    try {
        const userProfile = await databases.getDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            userId
        );

        const currentCredits = userProfile.credits || 0;
        const newCredits = currentCredits + amount;

        await databases.updateDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            userId,
            { credits: newCredits }
        );

        return newCredits;
    } catch (error) {
        console.error('Lỗi cập nhật credits:', error);
        throw error;
    }
}

export async function updatePassword(oldPassword: string, newPassword: string) {
    try {
        // Cập nhật mật khẩu trong Appwrite Account
        await account.updatePassword(newPassword, oldPassword);
        return true;
    } catch (error: any) {
        console.error('Lỗi đổi mật khẩu:', error);
        if (error instanceof AppwriteException) {
            if (error.code === 401) {
                throw new Error("Mật khẩu cũ không chính xác.");
            } else if (error.code === 400) {
                if (error.message.includes('Password')) {
                    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
                }
            }
        }
        throw new Error(error.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    }
}