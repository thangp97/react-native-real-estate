import * as Linking from 'expo-linking';
import { Account, Avatars, Client, Databases, ID, OAuthProvider, Storage } from "react-native-appwrite";

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    platform: 'com.ptit.restate',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID,
    profilesCollectionId: 'profiles',
    agentsCollectionId: 'agents',
    propertiesCollectionId: 'properties',
    galleriesCollectionId: 'galleries',
    bookingsCollectionId: 'bookings',
    notificationsCollectionId: 'notifications',
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

export async function createUser(email: string, password, username: string, role: string) {
    try {
        const newAccount = await account.create(ID.unique(), email, password, username);
        if (!newAccount) throw Error("Không thể tạo tài khoản");
        return await databases.createDocument(config.databaseId!, config.profilesCollectionId!, newAccount.$id, { role: role });
    } catch (error: any) {
        console.log("Lỗi createUser:", error);
        throw new Error(error.message);
    }
}

export async function signIn(email: string, password) {
    try {
        try { await account.deleteSession('current'); } catch (_) { /* Bỏ qua lỗi nếu không có session */ }
        return await account.createEmailPasswordSession(email, password);
    } catch (error: any) {
        console.log("Lỗi signIn:", error);
        throw new Error(error.message);
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
        return { ...currentAccount, ...userProfile };
    } catch (error: any) {
        if (error.code === 404) {
            try {
                console.log("Không tìm thấy profile, đang tự động tạo...");
                const currentAccount = await account.get();
                if(!currentAccount) return null;
                const newProfile = await databases.createDocument(config.databaseId!, config.profilesCollectionId!, currentAccount.$id, { role: 'buyer' });
                return { ...currentAccount, ...newProfile };
            } catch (createError) {
                console.error("Lỗi khi đang tự tạo profile:", createError);
                return null;
            }
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