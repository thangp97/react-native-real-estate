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

// --- AUTHENTICATION FUNCTIONS ---
export async function createUser(email, password, username, role) {
    try {
        const newAccount = await account.create(ID.unique(), email, password, username);
        if (!newAccount) throw Error("Không thể tạo tài khoản");
        return await databases.createDocument(config.databaseId!, config.profilesCollectionId!, newAccount.$id, { role: role });
    } catch (error) {
        console.log("Lỗi createUser:", error);
        throw new Error(error);
    }
}

export async function signIn(email, password) {
    try {
        try { await account.deleteSession('current'); } catch (_) { /* Bỏ qua lỗi nếu không có session */ }
        return await account.createEmailPasswordSession(email, password);
    } catch (error) {
        console.log("Lỗi signIn:", error);
        throw new Error(error);
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
    } catch (error) {
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
    } catch (error) {
        console.log("Lỗi signOut:", error);
        throw new Error(error);
    }
}

// --- DATABASE FUNCTIONS ---
export async function getUserProperties({ userId }) {
    if (!userId) return [];
    try {
        const result = await databases.listDocuments(config.databaseId!, config.propertiesCollectionId!, [Query.equal('sellerId', userId), Query.orderDesc('$createdAt')]);
        return result.documents;
    } catch (e) {
        console.error("Lỗi khi lấy BĐS của người dùng:", e);
        return [];
    }
}

export async function getPropertyById({ id }) {
    if (!id) return null;
    try {
        return await databases.getDocument(config.databaseId!, config.propertiesCollectionId!, id);
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getPropertyGallery({ propertyId }) {
    if (!propertyId) return [];
    try {
        const result = await databases.listDocuments(config.databaseId!, config.galleriesCollectionId!, [Query.equal('propertyId', propertyId)]);
        return result.documents;
    } catch (e) {
        console.error("Lỗi khi lấy gallery:", e);
        return [];
    }
}

export async function getAgentById({ agentId }) {
    if (!agentId) return null;
    try {
        return await databases.getDocument(config.databaseId!, config.profilesCollectionId!, agentId);
    } catch (error) {
        console.error("Lỗi khi lấy thông tin agent:", error);
        return null;
    }
}

// **FIX: Thêm hàm xóa BĐS**
export async function deleteProperty({ propertyId }) {
    if (!propertyId) throw new Error("Cần có ID của bất động sản");
    try {
        // Lấy danh sách ảnh trong gallery để xóa file trong storage
        const galleryItems = await getPropertyGallery({ propertyId });
        const deleteFilePromises = galleryItems.map(item => {
            const fileId = item.image.split('/files/')[1].split('/view')[0];
            return storage.deleteFile(config.storageId!, fileId);
        });
        await Promise.all(deleteFilePromises);

        // Xóa các document trong galleries
        const deleteDocPromises = galleryItems.map(item => databases.deleteDocument(config.databaseId!, config.galleriesCollectionId!, item.$id));
        await Promise.all(deleteDocPromises);

        // Cuối cùng, xóa document property
        await databases.deleteDocument(config.databaseId!, config.propertiesCollectionId!, propertyId);

        return true;
    } catch (error) {
        console.error("Lỗi khi xóa bất động sản:", error);
        throw new Error(error);
    }
}
