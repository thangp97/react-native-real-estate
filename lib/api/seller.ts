import { Query } from "react-native-appwrite";
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

export async function getMyActiveProperties({ userId }: { userId: string }) {
    if (!userId) return [];
    try {
        const result = await databases.listDocuments(
            config.databaseId!, 
            config.propertiesCollectionId!, 
            [
                Query.equal('seller', userId), 
                Query.equal('status', 'available'),
                Query.orderDesc('$createdAt')
            ]
        );
        return result.documents;
    } catch (e: any) {
        console.error("Lỗi khi lấy BĐS đang hoạt động:", e);
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