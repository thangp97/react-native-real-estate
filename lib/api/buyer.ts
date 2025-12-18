import { ID, Query } from "react-native-appwrite";
import { config, databases, updateUserProfile } from "../appwrite";

export async function getLatestProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.or([
                    Query.equal('status', 'approved'),
                    Query.equal('status', 'deposit_paid'),
                    Query.equal('status', 'sold')
                ]),
                Query.orderDesc("$createdAt"),
                Query.limit(5)
            ]
        );
        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getProperties({filter, query, limit, minPrice, maxPrice, bedrooms, area, region}: any) {
    try {
        const buildQuery = [
            Query.or([
                Query.equal('status', 'approved'),
                Query.equal('status', 'deposit_paid'),
                Query.equal('status', 'sold')
            ]),
            Query.orderDesc('$createdAt')
        ];

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
            Query.equal('status', 'approved'),
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
            [
                Query.select([
                    '*', 
                    'region', 'direction', 'floors', 'roadWidth', 'depth', 'frontage',
                    'brokerId.name', 'brokerId.email', 'brokerId.avatar', 'brokerId.$id',
                    'seller.name', 'seller.email', 'seller.avatar', 'seller.$id'
                ])
            ] 
        );

        if (!property) return null;

        // 1. Xử lý thông tin Môi giới (Broker)
        if (property.brokerId) {
            const brokerData = typeof property.brokerId === 'object' ? property.brokerId : null;
            
            // Lấy thông tin chi tiết broker để có phoneNumber (tránh lỗi Query.select)
            let brokerPhoneNumber = null;
            if (brokerData?.$id) {
                try {
                    const fullBrokerProfile = await databases.getDocument(
                        config.databaseId!,
                        config.profilesCollectionId!,
                        brokerData.$id
                    );
                    brokerPhoneNumber = fullBrokerProfile.phoneNumber;
                } catch (err) {
                    console.warn("Không thể lấy thông tin chi tiết broker:", err);
                }
            }

            property.agent = {
                $id: brokerData?.$id || property.brokerId,
                name: brokerData?.name || 'Môi giới',
                email: brokerData?.email || 'N/A',
                avatar: brokerData?.avatar || null,
                phoneNumber: brokerPhoneNumber,
            };
        } else {
            property.agent = null;
        }

        // 2. Xử lý thông tin Người bán (Seller/Owner)
        if (property.seller) {
            const sellerData = typeof property.seller === 'object' ? property.seller : null;
            property.sellerInfo = {
                $id: sellerData?.$id || property.seller,
                name: sellerData?.name || 'Chủ nhà',
                email: sellerData?.email || 'N/A',
                avatar: sellerData?.avatar || null,
            };
        } else {
            // Fallback nếu không có relationship seller (dữ liệu cũ)
            property.sellerInfo = {
                $id: 'unknown',
                name: 'Chủ nhà (Ẩn danh)',
                email: 'N/A',
                avatar: null
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

        // Tạo mảng gallery đầy đủ thông tin (để check người up ảnh)
        const brokerId = property.brokerId?.$id || property.brokerId;
        property.gallery = galleryResult.documents.map((doc) => ({
            id: doc.$id,
            image: doc.image,
            uploaderId: doc.uploaderId,
            isBroker: brokerId && doc.uploaderId === brokerId // Check nếu người up là broker của bài đăng
        }));

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

        // Tạo thông báo cho agent (broker hoặc seller)
        try {
            const { createNotification } = await import('./notifications');
            const property = await databases.getDocument(
                config.databaseId!,
                config.propertiesCollectionId!,
                propertyId
            );
            const propertyName = property.name || 'Bất động sản';
            const formattedDate = new Date(date).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            await createNotification({
                userId: agentId,
                message: `Bạn có yêu cầu đặt lịch hẹn xem "${propertyName}" vào ${formattedDate}`,
                type: 'booking_created',
                relatedPropertyId: propertyId
            });
        } catch (notifError) {
            console.warn("Không thể tạo thông báo:", notifError);
            // Không throw error để không ảnh hưởng đến việc tạo booking
        }

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
            [Query.equal('user', userId), Query.orderDesc('$createdAt')]
        );

        // Manually fetch property details for each booking to ensure data availability
        const enrichedBookings = await Promise.all(result.documents.map(async (booking: any) => {
            try {
                // Enrich Property Info
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
                
                // Enrich Agent Info (Fix for "Anonymous" issue)
                if (booking.agent && typeof booking.agent === 'string') {
                    try {
                        const agentProfile = await databases.getDocument(
                            config.databaseId!,
                            config.profilesCollectionId!,
                            booking.agent
                        );
                        booking.agent = agentProfile;
                    } catch {
                        console.warn(`[BuyerBookings] Could not fetch agent profile for booking ${booking.$id}`);
                    }
                } else if (booking.agent && typeof booking.agent === 'object' && !booking.agent.name) {
                     // Try to fetch if name is missing but we have ID
                     if (booking.agent.$id) {
                         try {
                            const agentProfile = await databases.getDocument(
                                config.databaseId!,
                                config.profilesCollectionId!,
                                booking.agent.$id
                            );
                            booking.agent = agentProfile;
                         } catch {
                             console.warn(`[BuyerBookings] Could not fetch agent profile for booking ${booking.$id}`);
                         }
                     }
                }

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
