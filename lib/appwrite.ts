import {Account, Avatars, Client, Databases, ID, Query, Storage} from "react-native-appwrite";

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    platform: 'com.ptit.restate',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID,
    profilesCollectionId: 'profiles',
    propertiesCollectionId: 'properties',
    galleriesCollectionId: 'galleries',
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
        try { await account.deleteSession('current'); } catch (_) { /* Bỏ qua lỗi nếu không có session */ }
        await account.createOAuth2Session('google', 'restate://callback', 'restate://failure');
        return true;
    } catch (e) {
        console.error("Lỗi đăng nhập Google:", e);
        return false;
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
                const currentAccount = await account.get();
                if(!currentAccount) return null;
                const newProfile = await databases.createDocument(config.databaseId!, config.profilesCollectionId!, currentAccount.$id, { role: 'buyer' });
                return { ...currentAccount, ...newProfile };
            } catch (createError) {
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

export async function getUserProperties({ userId }: { userId: string }) {
    if (!userId) return [];
    try {
        // **FIX: Thay 'sellerId' bằng 'seller'**
        const result = await databases.listDocuments(config.databaseId!, config.propertiesCollectionId!, [Query.equal('seller', userId), Query.orderDesc('$createdAt')]);
        return result.documents;
    } catch (e: any) {
        console.error("Lỗi khi lấy BĐS của người dùng:", e);
        return [];
    }
}

export async function getPropertyById({ id }: { id: string }) {
    if (!id) return null;
    try {
        return await databases.getDocument(config.databaseId!, config.propertiesCollectionId!, id);
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getPropertyGallery({ propertyId }: { propertyId: string }) {
    if (!propertyId) return [];
    try {
        const result = await databases.listDocuments(config.databaseId!, config.galleriesCollectionId!, [Query.equal('propertyId', propertyId)]);
        return result.documents;
    } catch (e: any) {
        console.error("Lỗi khi lấy gallery:", e);
        return [];
    }
}

export async function getAgentById({ agentId }: { agentId: string }) {
    if (!agentId) return null;
    try {
        return await databases.getDocument(config.databaseId!, config.profilesCollectionId!, agentId);
    } catch (error) {
        console.error("Lỗi khi lấy thông tin agent:", error);
        return null;
    }
}

export async function deleteProperty({ propertyId }: { propertyId: string }) {
    if (!propertyId) throw new Error("Cần có ID của bất động sản");
    try {
        const galleryItems = await getPropertyGallery({ propertyId });
        const deleteFilePromises = galleryItems.map(item => {
            const fileId = item.image.split('/files/')[1].split('/view')[0];
            return storage.deleteFile(config.storageId!, fileId);
        });
        await Promise.all(deleteFilePromises);

        const deleteDocPromises = galleryItems.map(item => databases.deleteDocument(config.databaseId!, config.galleriesCollectionId!, item.$id));
        await Promise.all(deleteDocPromises);

        await databases.deleteDocument(config.databaseId!, config.propertiesCollectionId!, propertyId);

        return true;
    } catch (error: any) {
        console.error("Lỗi khi xóa bất động sản:", error);
        throw new Error(error.message);
    }
}

export async function getUserNotifications({ userId }: { userId: string }) {
    if (!userId) return [];
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.notificationsCollectionId!,
            [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
        );
        return result.documents;
    } catch (e: any) {
        console.error("Lỗi khi lấy thông báo:", e);
        return [];
    }
}
