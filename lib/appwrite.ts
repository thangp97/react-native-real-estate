import {Account, Avatars, Client, Databases, ID, Query, Storage} from "react-native-appwrite";

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    platform: 'com.ptit.restate',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID,
    profilesCollectionId: 'profiles',
    propertiesCollectionId: 'properties',
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
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            username
        );

        if (!newAccount) throw Error("Không thể tạo tài khoản");

        const avatarUrl = avatar.getInitials(username);

        return await databases.createDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            newAccount.$id,
            {
                role: role,
                name: username,
                email: email,
                avatar: avatarUrl.href,
            }
        );
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
        await account.createOAuth2Session(
            'google',
            'restate://callback',
            'restate://failure'
        );
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

        const userProfile = await databases.getDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            currentAccount.$id
        );

        return { ...currentAccount, ...userProfile };

    } catch (error) {
        if (error.code === 404) {
            try {
                console.log("Không tìm thấy profile, đang tự động tạo...");
                const currentAccount = await account.get();
                const avatarUrl = avatar.getInitials(currentAccount.name);
                
                const newProfile = await databases.createDocument(
                    config.databaseId!,
                    config.profilesCollectionId!,
                    currentAccount.$id,
                    {
                        role: 'buyer',
                        name: currentAccount.name,
                        email: currentAccount.email,
                        avatar: avatarUrl.href
                    }
                );
                return { ...currentAccount, ...newProfile };
            } catch (createError) {
                console.error("Lỗi khi đang tự tạo profile:", createError);
                return null;
            }
        } else {
            console.error("Lỗi không xác định trong getCurrentUser:", error);
            return null;
        }
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
// **FIX: Sửa lại định nghĩa hàm để nhận một đối tượng**
export async function getUserProperties({ userId }) {
    if (!userId) return [];
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.equal('sellerId', userId), Query.orderDesc('$createdAt')]
        );
        return result.documents;
    } catch (e) {
        console.error("Lỗi khi lấy BĐS của người dùng:", e);
        return [];
    }
}

export async function getLastestProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.or([Query.equal('status', 'available'), Query.equal('status', 'sold')]), Query.orderDesc("$createdAt"), Query.limit(5)]
        );
        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getProperties({filter, query, limit}) {
    try {
        const buildQuery = [Query.or([Query.equal('status', 'available'), Query.equal('status', 'sold')]), Query.orderDesc('$createdAt')];
        if (filter && filter !== 'All') {
            buildQuery.push(Query.equal('type', filter));
        }
        if (query) {
            buildQuery.push(Query.or([
                Query.search('name', query),
                Query.search('address', query),
                Query.search('type', query),
            ]));
        }
        if (limit) buildQuery.push(Query.limit(limit));
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            buildQuery,
        );
        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getPropertyById({ id }) {
    try {
        if (!id) {
            console.error("ID bất động sản không hợp lệ");
            return null;
        }

        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            id
        );

        if (!property) return null;

        if (property.sellerId) {
            const sellerProfile = await databases.getDocument(
                config.databaseId!,
                config.profilesCollectionId!,
                property.sellerId
            );
            // Gán thông tin người bán vào một trường mới, ví dụ `agent`
            property.agent = sellerProfile;
        }

        return property;

    } catch (error) {
        console.error("Lỗi khi lấy chi tiết bất động sản:", error);
        return null;
    }
}
