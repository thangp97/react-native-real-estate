import { databases, config } from "../appwrite";
import { Query } from "react-native-appwrite";

export async function getAgentById({ agentId }: { agentId: string }) {
    if (!agentId) return null;
    try {
        return await databases.getDocument(config.databaseId!, config.profilesCollectionId!, agentId);
    } catch (error) {
        console.error("Lỗi khi lấy thông tin agent:", error);
        return null;
    }
}

export async function getBrokerStats(userId: string) {
    try {
            // 1. Đếm số tin đang chờ duyệt trên toàn hệ thống (Work Queue)
            const pendingDocs = await databases.listDocuments(
                config.databaseId!,
                config.propertiesCollectionId!,
                [Query.equal('status', 'available')]
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

export async function getBrokerRecentProperties(userId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('status', 'available'), // FIX: Dùng giá trị thật
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

// File: lib/appwrite.ts

export async function assignPropertyToBroker(propertyId: string, brokerId: string) {
    try {
        // 1. Dữ liệu cần cập nhật: brokerId (Relationship) và trạng thái
        const payload = {
            brokerId: brokerId,    // Gán Broker ID vào cột Relationship
            status: 'reviewing'    // Quan trọng: Chuyển trạng thái tin đăng
        };

        // 2. Quyền truy cập (Permissions): Cấp quyền update/delete cho Broker mới
        // Đây là phần rất quan trọng để đảm bảo Broker mới có thể quản lý tin này sau đó.
        const permissions = [
            // Giữ quyền đọc cho bất kỳ ai (hoặc chỉ users đã đăng nhập)
            'read("any")',

            // Cấp quyền UPDATE và DELETE cho Broker mới nhận việc
            `update("user:${brokerId}")`,
            `delete("user:${brokerId}")`
        ];

        console.log(`[AssignBroker] Cập nhật Property: ${propertyId}. Payload:`, payload);
        console.log(`[AssignBroker] Permissions mới:`, permissions);

        return await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            payload,
            permissions // Truyền Permissions vào hàm update
        );

    } catch (error: any) {
        // Bắt lỗi chi tiết (Quan trọng để xác định lỗi 403/Permission)
        console.error("[AssignBroker] LỖI APPWRITE khi gán Broker:");
        console.error(" - Message:", error.message);
        console.error(" - Code:", error.code); // Nếu là 403, nghĩa là Broker không có quyền update document này.
        throw error;
    }
}



// File: lib/appwrite.ts (Đã sửa)

export async function finalizeVerification(
    propertyId: string,
    decision: 'approved' | 'rejected' | 'request_changes',
    note?: string,
    proposedPrice?: number
) {
    try {
        const updateData: any = {
            status: decision,
            verificationDate: new Date().toISOString(), // Thêm ngày xác thực
        };

        if (note) updateData.rejectionReason = note;
        if (proposedPrice) updateData.proposedPrice = proposedPrice;

         return await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            updateData // Truyền payload động
        );
    } catch (error) {
        console.error("Lỗi xác thực BĐS:", error);
        throw error;
    }
}

export async function getAllPendingProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('status', 'available'),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy danh sách pending:", error);
        return [];
    }
}

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled') {
    try {
        const result = await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            {
                status: status
            }
        );
        return result;
    } catch (error) {
        console.error("Lỗi cập nhật lịch hẹn:", error);
        throw error;
    }
}

export async function getBrokerBookings(brokerId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.bookingsCollectionId!,
            [Query.equal('agent', brokerId), Query.orderDesc('date')]
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

export async function confirmBooking(bookingId: string) {
    try {
        // 1. Lấy document hiện tại
        const doc = await databases.getDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId
        );

        // 2. Helper lấy ID an toàn
        const getSafeId = (field: any) => {
            if (!field) return null;
            if (Array.isArray(field)) return field[0]?.$id || field[0];
            if (typeof field === 'object' && field.$id) return field.$id;
            return field;
        };

        // 3. Chuẩn bị dữ liệu cập nhật
        const updates: any = {
            status: 'confirmed', // <--- Trạng thái xác nhận
            property: getSafeId(doc.property),
            user: getSafeId(doc.user),
            agent: getSafeId(doc.agent)
        };

        // 4. Xóa các trường null
        Object.keys(updates).forEach(key => updates[key] === null && delete updates[key]);

        // 5. Cập nhật
        const result = await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            updates
        );
        return result;

    } catch (error) {
        console.error("Lỗi xác nhận lịch hẹn:", error);
        throw error;
    }
}

/**
 * Môi giới TỪ CHỐI lịch hẹn
 * (Code lặp lại logic xử lý Relationship để an toàn)
 */
export async function rejectBooking(bookingId: string) {
    try {
        // 1. Lấy document hiện tại
        const doc = await databases.getDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId
        );

        // 2. Helper lấy ID an toàn
        const getSafeId = (field: any) => {
            if (!field) return null;
            if (Array.isArray(field)) return field[0]?.$id || field[0];
            if (typeof field === 'object' && field.$id) return field.$id;
            return field;
        };

        // 3. Chuẩn bị dữ liệu cập nhật
        const updates: any = {
            status: 'cancelled', // <--- Trạng thái hủy/từ chối
            property: getSafeId(doc.property),
            user: getSafeId(doc.user),
            agent: getSafeId(doc.agent)
        };

        // 4. Xóa các trường null
        Object.keys(updates).forEach(key => updates[key] === null && delete updates[key]);

        // 5. Cập nhật
        const result = await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            updates
        );
        return result;

    } catch (error) {
        console.error("Lỗi từ chối lịch hẹn:", error);
        throw error;
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