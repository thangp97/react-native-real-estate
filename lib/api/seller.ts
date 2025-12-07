import { databases, config, storage } from "../appwrite";
import { Query, ID } from "react-native-appwrite";

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