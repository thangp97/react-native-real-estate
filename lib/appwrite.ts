import {Account, Avatars, Client, Databases, ID, Storage, OAuthProvider, AppwriteException} from "react-native-appwrite";
import * as Linking from 'expo-linking';

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
    
    // DEV ONLY: Tạm thời vô hiệu hóa việc gửi email xác thực
    // try {
    //     await account.createVerification(Linking.createURL('/verification'));
    // } catch (error) {
    //     console.error("Lỗi khi gửi email xác thực:", error);
    // }

    try {
        const profile = await databases.createDocument(
            config.databaseId!, 
            config.profilesCollectionId!, 
            newAccount.$id, 
            { role: role, name: username, email: email }
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

        const userProfile = await databases.getDocument(config.databaseId!, config.profilesCollectionId!, currentAccount.$id);
        
        return { 
            ...currentAccount, 
            role: userProfile.role,
            avatar: userProfile.avatar,
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
    if (!file) return;

    try {
        const { mimeType, ...rest } = file;
        const asset = { type: mimeType, ...rest };

        const uploadedFile = await storage.createFile(
            config.storageId!,
            ID.unique(),
            asset
        );

        const fileUrl = await storage.getFileView(
            config.storageId!,
            uploadedFile.$id
        );

        return fileUrl;
    } catch (error) {
        console.error("Lỗi upload file:", error);
        throw error;
    }
}

