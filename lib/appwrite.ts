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

const client = new Client();
client
    .setEndpoint(config.endpoint) // Dùng biến đã export
    .setProject(config.projectId)
    .setPlatform(config.platform);

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

export async function uploadFile(file: any) {
    if (!file) return null;

    const asset = {
        name: file.fileName || `${ID.unique()}.jpg`,
        type: file.mimeType,
        size: file.fileSize,
        uri: file.uri,
    };

    try {
        const uploadedFile = await storage.createFile(
            config.storageId!,
            ID.unique(),
            asset
        );

        const fileUrl = storage.getFilePreview(config.storageId!, uploadedFile.$id, 2000, 2000, 'top', 100);
        return fileUrl;
    } catch (error) {
        console.error('Lỗi tải file:', error);
        throw error;
    }
};

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

export async function getBrokerStats(userId: string) {
    try {
        // 1. Đếm số tin đang chờ duyệt trên toàn hệ thống (Work Queue)
        const pendingDocs = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.equal('status', 'pending_approval')] // FIX: Dùng giá trị thật
        );

        // 2. Đếm số tin BẠN đang quản lý (Active Work)
        const myActiveDocs = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('brokerId', userId),
                Query.or([
                    Query.equal('status', 'approved'),
                    Query.equal('status', 'reviewing'),
                ])
            ]
        );

         // 3. Đếm số tin BẠN đã bán thành công (Sold Count)
         const mySoldDocs = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('brokerId', userId),
                Query.equal('status', 'sold')
            ]
        );

        return {
            pendingCount: pendingDocs.total,
            myActiveCount: myActiveDocs.total,
            mySoldCount: mySoldDocs.total,
            rating: 4.8,
        };

    } catch (error) {
        console.error("Error fetching broker stats (Real Data):", error);
        return { pendingCount: 0, myActiveCount: 0, mySoldCount: 0, rating: 0 };
    }
}


/**
 * Lấy danh sách tin "Cần duyệt" (Work Queue) để hiện trên Dashboard (Dữ liệu thật)
 */
export async function getBrokerRecentProperties(userId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('status', 'pending_approval'), // FIX: Dùng giá trị thật
                Query.orderDesc('$createdAt'),
                Query.limit(5)
            ]
        );

        console.log("LOG: Danh sách tin chờ duyệt (Pending Properties):", JSON.stringify(result.documents.map(d => ({id: d.$id, status: d.status, brokerId: d.brokerId})), null, 2));

        return result.documents;
    } catch (error) {
        console.error("Error fetching pending properties (Real Data):", error);
        return [];
    }
}


/**
 * Hàm Broker nhận yêu cầu duyệt tin (Pick Task)
 */
export async function assignPropertyToBroker(propertyId: string, brokerId: string) {
    if (!propertyId || !brokerId) {
        throw new Error("Missing propertyId or brokerId.");
    }

    try {
        // Cần đảm bảo rằng sau khi Broker nhận việc, họ có thể tiếp tục quản lý tin này.
        // Cập nhật Document, đồng thời thêm quyền UPDATE và DELETE cho Broker ID
        const updatedDocument = await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            {
                brokerId: brokerId,
                status: 'reviewing',
            },
            // THÊM QUYỀN GHI MỚI CHO BROKER (Permissions)
            [
                // Giữ nguyên quyền đọc công khai (ví dụ: 'any')
                // Thêm quyền cập nhật/xóa cho Broker mới nhận việc
                'update("user:' + brokerId + '")',
                'delete("user:' + brokerId + '")',
            ]
        );

        console.log(`LOG: Broker ${brokerId} đã nhận duyệt tin ${propertyId} và cập nhật quyền.`);
        return updatedDocument;

    } catch (error) {
        console.error("Lỗi khi Broker nhận việc (Assign Task):", error);
        // Quan trọng: Trả về lỗi chi tiết để dễ debug hơn
        throw new Error(`Assignment Failed: ${error.message || 'Unknown Error'}`);
    }
}

export async function getMyActiveProperties(userId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('brokerId', userId), // Lọc theo ID của Broker
                Query.notEqual('status', 'sold'), // Loại bỏ các tin đã bán
                Query.notEqual('status', 'rejected'), // Loại bỏ các tin bị từ chối
                Query.orderDesc('$updatedAt'), // Tin được cập nhật gần nhất lên đầu
            ]
        );

        console.log(`LOG: Danh sách tin đang quản lý của Broker ${userId} (${result.total} tin)`);
        return result.documents;
    } catch (error) {
        console.error("Lỗi khi lấy danh sách tin đang quản lý:", error);
        return [];
    }
}

export async function finalizeVerification(
    propertyId: string,
    decision: 'approved' | 'rejected' | 'request_changes',
    note?: string,
    proposedPrice?: number
) {
    try {
        const updateData: any = {
            status: decision,
            verificationDate: new Date().toISOString(),
        };

        if (note) updateData.rejectionReason = note;
        if (proposedPrice) updateData.proposedPrice = proposedPrice;

        const result = await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            updateData
        );
        return result;

    } catch (error) {
        console.error("Lỗi khi kết thúc thẩm định:", error);
        throw error;
    }
}