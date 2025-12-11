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
    priceHistoryCollectionId: 'price_history', // Collection lưu lịch sử giá
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

export async function createUser(email: string, password: string, username: string, role: string) {
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
        const profile = await databases.createDocument(
            config.databaseId!, 
            config.profilesCollectionId!, 
            newAccount.$id, 
            { 
                role: role, 
                name: username, 
                email: email,
                credits: 10 // **GÁN CREDITS MẶC ĐỊNH**
            }
        );
        return profile;
    } catch (error: any) {
        console.error("Lỗi khi tạo document profile:", error);
        throw new Error(`Không thể tạo hồ sơ người dùng: ${error.message}`);
    }
}


export async function signIn(email: string, password) {
    try {
        try { await account.deleteSession('current'); } catch (_) { /* Bỏ qua lỗi nếu không có session */ }
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

        // Lấy profile từ profiles collection theo userId (so sánh theo email thông qua userId)
        const userProfile = await databases.getDocument(config.databaseId!, config.profilesCollectionId!, currentAccount.$id);
        
        return { 
            $id: currentAccount.$id,
            email: currentAccount.email, // Email từ Account
            name: userProfile.name || currentAccount.name, // Lấy name từ profiles collection, fallback về Account nếu không có
            role: userProfile.role,
            avatar: userProfile.avatar || currentAccount.avatar,
            credits: userProfile.credits // **LẤY CREDITS**
        };

    } catch (error: any) {
        if (error.code !== 401) {
            console.log("Lỗi getCurrentUser:", error);
        }
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
        const updatedProfile = await databases.updateDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            userId,
            data
        );
        return updatedProfile;
    } catch (error) {
        console.error('Lỗi cập nhật hồ sơ:', error);
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