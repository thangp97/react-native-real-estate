import { ID, Query } from "react-native-appwrite";
import { config, databases, updateUserProfile } from "../appwrite";

export async function getLatestProperties() {
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

export async function getProperties({filter, query, limit, minPrice, maxPrice, bedrooms, area, region}: any) {
    try {
        const buildQuery = [Query.or([Query.equal('status', 'available'), Query.equal('status', 'approved'), Query.equal('status', 'sold')]), Query.orderDesc('$createdAt')];

        if (filter && filter !== 'All') {
            buildQuery.push(Query.equal('type', filter));
        }

        if (region && region !== 'All') {
             buildQuery.push(Query.equal('region', region));
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

export async function getSimilarProperties({ propertyId, type }: any) {
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

export async function getPropertyById({ id }: { id: string }) {
    try {
        if (!id) {
            console.error("ID bất động sản không hợp lệ");
            return null;
        }

        const property: any = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            id,
            // Corrected: Fetch brokerId info instead of assignedBroker
            [Query.select(['*', 'brokerId.name', 'brokerId.email', 'brokerId.avatar'])] 
        );

        if (!property) return null;

        // Corrected: Map brokerId to property.agent
        if (property.brokerId) {
            const brokerData = typeof property.brokerId === 'object' ? property.brokerId : null;
            property.agent = {
                $id: brokerData?.$id || property.brokerId, // Lấy ID của broker
                name: brokerData?.name || 'N/A', // Tên broker
                email: brokerData?.email || 'N/A', // Email broker
                avatar: brokerData?.avatar || null, // Avatar broker
            };
        } else {
            property.agent = null; // Không có broker
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

export async function createBooking({ userId, agentId, propertyId, date, note }: any) {
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

export async function getBuyerBookings(userId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.bookingsCollectionId!,
            [Query.equal('user', userId), Query.orderDesc('date')]
        );

        // Manually fetch property details for each booking to ensure data availability
        const enrichedBookings = await Promise.all(result.documents.map(async (booking: any) => {
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
