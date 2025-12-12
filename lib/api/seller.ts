import { ID, Query } from "react-native-appwrite";
import { config, databases, storage } from "../appwrite";

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

export async function getMyActiveProperties(userId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('brokerId', userId), // Lọc theo ID của Broker
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

export async function getPropertyGallery({ propertyId }: { propertyId: string }) {
    if (!propertyId) return [];
    try {
         const result = await databases.listDocuments(
            config.databaseId!,
            config.galleriesCollectionId!,
            [Query.equal('propertyId', propertyId)]
        );
        return result.documents;
    } catch (error) {
        console.error('Lỗi tải gallery:', error);
        return [];
    }
};

export async function deleteProperty({ propertyId }: { propertyId: string }) {
    if (!propertyId) throw new Error("Cần có ID của bất động sản");
    try {
        const galleryItems: any = await getPropertyGallery({ propertyId });
        
        if (Array.isArray(galleryItems)) {
             const deleteFilePromises = galleryItems.map((item: any) => {
                if (item.image && item.image.includes('/files/')) {
                    try {
                        // Extract ID from Appwrite View URL
                        // URL Format: .../files/[FILE_ID]/view...
                        const regex = /\/files\/([^/]+)\/view/;
                        const match = item.image.match(regex);
                        if (match && match[1]) {
                            return storage.deleteFile(config.storageId!, match[1]);
                        }
                    } catch (err) {
                        console.log("Lỗi parse url ảnh để xoá:", err);
                    }
                }
                return Promise.resolve();
            });
            await Promise.all(deleteFilePromises);

            const deleteDocPromises = galleryItems.map((item: any) => databases.deleteDocument(config.databaseId!, config.galleriesCollectionId!, item.$id));
            await Promise.all(deleteDocPromises);
        }

        await databases.deleteDocument(config.databaseId!, config.propertiesCollectionId!, propertyId);

        return true;
    } catch (error: any) {
        console.error("Lỗi khi xóa bất động sản:", error);
        throw new Error(error.message);
    }
}

export async function getSellerData({ userId }: { userId: string }) {
    if (!userId) return null;
    try {
        const result = await databases.getDocument(config.databaseId!, config.profilesCollectionId!, userId);
        return result;
    } catch (e: any) {
        console.error("Lỗi khi lấy dữ liệu người bán:", e);
        return null;
    }
}

export async function topUpCredit({ userId, amount }: { userId: string, amount: number }) {
    if (!userId || amount <= 0) throw new Error("Cần có ID người dùng và số credit hợp lệ");
    
    try {
        const seller: any = await getSellerData({ userId });
        if (!seller) {
            throw new Error("Không tìm thấy người dùng.");
        }

        const newCredits = (seller.credits || 0) + amount;

        await databases.updateDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            userId,
            { credits: newCredits }
        );

        return newCredits;
    } catch (error: any) {
        console.error("Lỗi khi nạp credit:", error);
        throw new Error(error.message);
    }
}

export async function renewProperty({ propertyId, currentExpiry, sellerId, days }: { propertyId: string, currentExpiry: Date, sellerId: string, days: number }) {
    if (!propertyId || !currentExpiry || !sellerId || !days || days <= 0) {
        throw new Error("Cần có ID bất động sản, ngày hết hạn hiện tại, ID người bán và số ngày gia hạn hợp lệ");
    }

    try {
        const seller: any = await getSellerData({ userId: sellerId });
        if (!seller || seller.credits < days) {
            throw new Error(`Không đủ credits để gia hạn ${days} ngày. Bạn cần ${days} credits nhưng chỉ có ${seller?.credits || 0} credits.`);
        }

        const newExpiryDate = new Date(currentExpiry);
        newExpiryDate.setDate(newExpiryDate.getDate() + days);

        await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            { expiresAt: newExpiryDate.toISOString() }
        );

        await databases.updateDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            sellerId,
            { credits: seller.credits - days }
        );

        return true;
    } catch (error: any) {
        console.error("Lỗi khi gia hạn bất động sản:", error);
        throw new Error(error.message);
    }
}

/**
 * Lưu lịch sử thay đổi giá vào database
 */
async function savePriceHistory({ 
    propertyId, 
    oldPrice, 
    newPrice, 
    changedBy, 
    reason 
}: { 
    propertyId: string, 
    oldPrice: number, 
    newPrice: number, 
    changedBy: string,
    reason?: string 
}) {
    try {
        await databases.createDocument(
            config.databaseId!,
            config.priceHistoryCollectionId!,
            ID.unique(),
            {
                propertyId: propertyId,
                oldPrice: oldPrice,
                newPrice: newPrice,
                changedBy: changedBy,
                reason: reason || 'Cập nhật giá từ môi giới',
                changedAt: new Date().toISOString()
            }
        );
    } catch (error: any) {
        console.error("Lỗi khi lưu lịch sử giá:", error);
        // Không throw error để không ảnh hưởng đến việc cập nhật giá
    }
}

/**
 * Lấy lịch sử thay đổi giá của một bất động sản
 */
export async function getPriceHistory({ propertyId }: { propertyId: string }) {
    if (!propertyId) return [];
    
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.priceHistoryCollectionId!,
            [
                Query.equal('propertyId', propertyId),
                Query.orderDesc('$createdAt') // Sắp xếp mới nhất trước
            ]
        );
        return result.documents;
    } catch (error: any) {
        console.error("Lỗi khi lấy lịch sử giá:", error);
        return [];
    }
}

export async function acceptProposedPrice({ propertyId, proposedPrice, userId }: { 
    propertyId: string, 
    proposedPrice: number,
    userId: string 
}) {
    if (!propertyId || !proposedPrice || !userId) {
        throw new Error("Cần có ID bất động sản, giá gợi ý và ID người dùng");
    }

    try {
        // Lấy giá cũ trước khi cập nhật
        const property: any = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId
        );
        
        const oldPrice = property.price || 0;

        // Cập nhật giá mới
        await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            { 
                price: proposedPrice,
                proposedPrice: null
            }
        );

        // Lưu lịch sử thay đổi giá
        await savePriceHistory({
            propertyId,
            oldPrice,
            newPrice: proposedPrice,
            changedBy: userId,
            reason: 'Chấp nhận giá gợi ý từ môi giới'
        });

        return true;
    } catch (error: any) {
        console.error("Lỗi khi cập nhật giá gợi ý:", error);
        throw new Error(error.message);
    }
}

export async function getSellerBookings(sellerId: string) {
    try {
        // Khi môi giới đặt lịch với người bán:
        // - Môi giới là agent
        // - Người bán là user
        // Vì vậy cần query theo 'user' để tìm booking của seller
        const result = await databases.listDocuments(
            config.databaseId!,
            config.bookingsCollectionId!,
            [Query.equal('user', sellerId), Query.orderDesc('date')]
        );

        const enrichedBookings = await Promise.all(result.documents.map(async (booking: any) => {
            try {
                // Lấy thông tin BĐS
                const propId = typeof booking.property === 'string'
                    ? booking.property
                    : booking.property?.$id;

                if (propId) {
                     // Nếu property thiếu thông tin chi tiết, gọi API lấy lại
                    const fullProperty = await databases.getDocument(
                         config.databaseId!,
                         config.propertiesCollectionId!,
                         propId
                    );
                    if (fullProperty) {
                        booking.property = fullProperty;
                    }
                }
                
                // Lấy thông tin người đặt (Môi giới)
                // Trong trường hợp này booking.agent chính là Môi giới
                 if (booking.agent && typeof booking.agent === 'string') {
                    const agentProfile = await databases.getDocument(
                        config.databaseId!,
                        config.profilesCollectionId!,
                        booking.agent
                    );
                    booking.agent = agentProfile;
                }

            } catch (err) {
                console.warn(`[SellerBookings] Không thể lấy chi tiết cho booking ${booking.$id}`, err);
            }
            return booking;
        }));

        return enrichedBookings;
    } catch (error) {
        console.error("Lỗi lấy danh sách lịch hẹn cho Seller:", error);
        return [];
    }
}

export async function confirmBooking(bookingId: string) {
    try {
        return await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            { status: 'confirmed' }
        );
    } catch (error) {
        console.error("Lỗi xác nhận lịch hẹn:", error);
        throw error;
    }
}

export async function rejectBooking(bookingId: string) {
    try {
        return await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            { status: 'cancelled' }
        );
    } catch (error) {
        console.error("Lỗi từ chối lịch hẹn:", error);
        throw error;
    }
}