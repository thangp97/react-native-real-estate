import {Account, Avatars, Client, Databases, ID, Query, Storage} from "react-native-appwrite";

export const config = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    platform: 'com.ptit.restate',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID, // Thêm dòng này
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
export const storage = new Storage(client); // Thêm dòng này

// --- AUTHENTICATION FUNCTIONS ---

// Register User
export async function createUser(email, password, username, role) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            username
        );

        if (!newAccount) throw Error("Không thể tạo tài khoản");

        return await databases.createDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            newAccount.$id,
            {
                role: role 
            }
        );
    } catch (error) {
        console.log("Lỗi createUser:", error);
        throw new Error(error);
    }
}

// Sign In with Email/Password
export async function signIn(email, password) {
    try {
        try { await account.deleteSession('current'); } catch (_) { /* Bỏ qua lỗi nếu không có session */ }
        return await account.createEmailPasswordSession(email, password);
    } catch (error) {
        console.log("Lỗi signIn:", error);
        throw new Error(error);
    }
}

// Sign In with Google
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

// Get Current User
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
                
                const newProfile = await databases.createDocument(
                    config.databaseId!,
                    config.profilesCollectionId!,
                    currentAccount.$id,
                    {
                        role: 'buyer' // Gán vai trò mặc định
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

// Sign Out
export async function signOut() {
    try {
        return await account.deleteSession('current');
    } catch (error) {
        console.log("Lỗi signOut:", error);
        throw new Error(error);
    }
}


// --- DATABASE FUNCTIONS ---
export async function getUserProperties(userId) {
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
            [Query.orderDesc("$createdAt"), Query.limit(5)]
        );
        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getProperties({filter, query, limit}) {
    try {
        const buildQuery = [Query.orderDesc('$createdAt')];
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
        const result = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            id
        );
        return result;
    } catch (error) {_
        console.error(error);
        return null;
    }
}
