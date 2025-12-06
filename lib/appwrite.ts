import {Account, Avatars, Client, Databases, ID, Query, Storage} from "react-native-appwrite";

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
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.or([Query.equal('status', 'available'), Query.equal('status', 'approved'), Query.equal('status', 'sold')]), Query.orderDesc("$createdAt"), Query.limit(5)]
        );
        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getProperties({filter, query, limit, minPrice, maxPrice, bedrooms, area}) {
    try {
        const buildQuery = [Query.or([Query.equal('status', 'available'), Query.equal('status', 'approved'), Query.equal('status', 'sold')]), Query.orderDesc('$createdAt')];

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

        if (minPrice) buildQuery.push(Query.greaterThanEqual('price', Number(minPrice)));
        if (maxPrice) buildQuery.push(Query.lessThanEqual('price', Number(maxPrice)));
        if (bedrooms) buildQuery.push(Query.greaterThanEqual('bedrooms', Number(bedrooms)));
        if (area) buildQuery.push(Query.greaterThanEqual('area', Number(area)));

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

export async function getSimilarProperties({ propertyId, type }) {
    try {
        const buildQuery = [
            Query.equal('type', type),
            Query.notEqual('$id', propertyId),
            Query.or([Query.equal('status', 'available'), Query.equal('status', 'approved')]),
            Query.limit(5),
            Query.orderDesc('$createdAt')
        ];

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            buildQuery
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy BĐS tương tự:", error);
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
            id,
            [Query.select(['*', 'seller.name', 'seller.email', 'seller.avatar'])] // Yêu cầu trả về các trường của seller
        );

        if (!property) return null;

        // Gán thông tin seller vào property.agent để frontend không cần thay đổi nhiều
        if (property.seller) {
            property.agent = {
                name: property.seller.name,
                email: property.seller.email,
                avatar: property.seller.avatar,
                // Thêm các trường khác của seller nếu cần thiết cho frontend
            };
        }

        // --- Lấy các ảnh từ collection galleries ---
        const galleryResult = await databases.listDocuments(
            config.databaseId!,
            config.galleriesCollectionId!,
            [Query.equal('propertyId', id), Query.orderAsc('$createdAt')] // Sắp xếp theo thời gian tạo để có thứ tự nhất định
        );

        // Trích xuất URL ảnh và gán vào property.galleryImages
        property.galleryImages = galleryResult.documents.map((doc) => doc.image);

        return property;

    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getPropertyGallery({ propertyId }: { propertyId: string }) {
    if (!propertyId) return [];
    try {
        const uploadedFile = await storage.createFile(
            config.storageId!,
            ID.unique(),
            asset
        );

        // Tự tạo URL view để đảm bảo trả về string chuẩn
        const fileUrl = `${config.endpoint}/storage/buckets/${config.storageId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;
        
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

export async function togglePropertyFavorite(userId: string, propertyId: string, currentFavorites: string[] = []) {
    try {
        // Đảm bảo currentFavorites luôn là mảng
        let safeFavorites = Array.isArray(currentFavorites) ? [...currentFavorites] : [];
        
        const index = safeFavorites.indexOf(propertyId);

        if (index !== -1) {
            safeFavorites.splice(index, 1);
        } else {
            safeFavorites.push(propertyId);
        }

        console.log(`Updating favorites for user ${userId}:`, safeFavorites);

        await updateUserProfile(userId, { favorites: safeFavorites });
        return safeFavorites;
    } catch (error) {
        console.error("Lỗi khi toggle favorite:", JSON.stringify(error, null, 2));
        throw error;
    }
}

export async function getSavedProperties(favoriteIds: string[]) {
    if (!favoriteIds || favoriteIds.length === 0) return [];
    try {
        // Appwrite hỗ trợ query theo mảng ID bằng Query.equal('$id', [array])
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.equal('$id', favoriteIds)]
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy danh sách đã lưu:", error);
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

export async function createBooking({ userId, agentId, propertyId, date, note }) {
    try {
        const booking = await databases.createDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            ID.unique(),
            {
                user: userId,
                agent: agentId,
                property: propertyId,
                date,
                note,
                status: 'pending'
            }
        );
        return booking;
    } catch (error) {
        console.error("Lỗi tạo lịch hẹn:", error);
        throw error;
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

export async function cancelBooking(bookingId: string) {
    try {
        // 1. Lấy document hiện tại để kiểm tra và sửa dữ liệu nếu cần
        const doc = await databases.getDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId
        );

        // Helper để lấy ID an toàn từ string, object hoặc mảng
        const getSafeId = (field: any) => {
            if (!field) return null;
            if (Array.isArray(field)) return field[0]?.$id || field[0]; // Lấy phần tử đầu nếu là mảng
            if (typeof field === 'object' && field.$id) return field.$id; // Lấy $id nếu là object
            return field; // Giữ nguyên nếu là string ID
        };

        const updates: any = {
            status: 'cancelled',
            // Cập nhật lại các trường relationship để đảm bảo chúng đúng định dạng (Single ID)
            // Nếu DB đang lưu sai (Array), dòng này sẽ sửa lại thành String ID
            property: getSafeId(doc.property),
            user: getSafeId(doc.user),
            agent: getSafeId(doc.agent)
        };

        // Loại bỏ các trường null/undefined khỏi updates
        Object.keys(updates).forEach(key => updates[key] === null && delete updates[key]);

        const result = await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            updates
        );
        return result;
    } catch (error) {
        console.error("Lỗi hủy lịch hẹn:", error);
        throw error;
    }
}

export async function getUserBookings(userId) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.bookingsCollectionId!,
            [Query.equal('user', userId), Query.orderDesc('date')]
        );

        // Manually fetch property details for each booking to ensure data availability
        const enrichedBookings = await Promise.all(result.documents.map(async (booking) => {
            try {
                // Case 1: property is a string ID
                if (booking.property && typeof booking.property === 'string') {
                    const propertyData = await getPropertyById({ id: booking.property });
                    if (propertyData) {
                        booking.property = propertyData;
                    }
                }
                // Case 2: property is an object but might be incomplete (e.g., missing name)
                else if (booking.property && typeof booking.property === 'object') {
                    // If name is missing, likely just a relationship wrapper or partial data
                    if (!booking.property.name && booking.property.$id) {
                        const propertyData = await getPropertyById({ id: booking.property.$id });
                        if (propertyData) {
                            booking.property = propertyData;
                        }
                    }
                }
                // Case 3: property is missing (null/undefined) - Data integrity issue
                // We can't do much if we don't have an ID.
            } catch (err) {
                console.error(`Failed to enrich booking ${booking.$id}:`, err);
            }

            return booking;
        }));

        return enrichedBookings;
    } catch (error) {
        console.error("Lỗi lấy danh sách lịch hẹn:", error);
        return [];
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