import { ID, Query } from "react-native-appwrite";
import { config, databases, storage } from "../appwrite";

export async function getPropertiesByBrokerId(agentId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('brokerId', agentId),
                Query.or([
                    Query.equal('status', 'approved'),
                    Query.equal('status', 'deposit_paid'),
                    Query.equal('status', 'sold')
                ]),
                Query.orderDesc('$createdAt'),
                Query.limit(100) // Adjust limit as needed
            ]
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy danh sách bất động sản của broker:", error);
        return [];
    }
}

export async function getAgentById({ agentId }: { agentId: string }) {
    if (!agentId) return null;
    
    // Validate agentId format
    const trimmedId = typeof agentId === 'string' ? agentId.trim() : '';
    if (!trimmedId || trimmedId.length > 36 || !/^[a-zA-Z0-9_]+$/.test(trimmedId) || trimmedId.startsWith('_')) {
        console.warn("ID môi giới không hợp lệ:", agentId);
        return null;
    }
    
    try {
        return await databases.getDocument(config.databaseId!, config.profilesCollectionId!, trimmedId);
    } catch (error) {
        console.error("Lỗi khi lấy thông tin agent:", error);
        return null;
    }
}

export async function getBrokerStats(userId: string, region?: string) {
    try {
            // 1. Đếm số tin đang chờ duyệt (Work Queue) - Có lọc theo region
            const pendingQueries = [Query.equal('status', 'available')];
            if (region) {
                pendingQueries.push(Query.equal('region', region));
            }

            const pendingDocs = await databases.listDocuments(
                config.databaseId!,
                config.propertiesCollectionId!,
                pendingQueries
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

            // 4. Lấy thông tin Broker để hiển thị Rating thật
            const brokerProfile = await databases.getDocument(
                config.databaseId!,
                config.profilesCollectionId!,
                userId
            );

            return {
                pendingCount: pendingDocs.total,
                myActiveCount: myActiveDocs.total,
                mySoldCount: mySoldDocs.total,
                rating: brokerProfile.rating,
            };

        } catch (error) {
            console.error("Error fetching broker stats (Real Data):", error);
            return { pendingCount: 0, myActiveCount: 0, mySoldCount: 0, rating: 0 };
        }
}

export async function getBrokerRecentProperties(userId: string, region: string) {
    try {
        if (!region) return [];
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('status', 'available'),
                Query.equal('region', region), // Filter by region
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
        // Lấy thông tin property trước khi cập nhật
        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId
        );

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

        const updatedProperty = await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            payload,
            permissions // Truyền Permissions vào hàm update
        );

        // Tạo thông báo cho seller
        try {
            const { createNotification } = await import('./notifications');
            const sellerId = typeof property.seller === 'string' ? property.seller : property.seller?.$id;
            const propertyName = property.name || 'Bất động sản';
            
            if (sellerId) {
                // Lấy tên broker
                const brokerProfile = await databases.getDocument(
                    config.databaseId!,
                    config.profilesCollectionId!,
                    brokerId
                );
                const brokerName = brokerProfile?.name || 'Môi giới';
                
                await createNotification({
                    userId: sellerId,
                    message: `Môi giới ${brokerName} đã tiếp nhận bài đăng "${propertyName}" của bạn`,
                    type: 'broker_assigned',
                    relatedPropertyId: propertyId
                });
            }
        } catch (notifError) {
            console.warn("Không thể tạo thông báo:", notifError);
        }

        return updatedProperty;

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
        // Lấy thông tin property trước khi cập nhật
        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId
        );

        const updateData: any = {
            status: decision,
            verificationDate: new Date().toISOString(), // Thêm ngày xác thực
        };

        if (note) updateData.rejectionReason = note;
        if (proposedPrice) updateData.proposedPrice = proposedPrice;

        const updatedProperty = await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            updateData // Truyền payload động
        );

        // Tạo thông báo cho seller
        try {
            const { createNotification } = await import('./notifications');
            const sellerId = typeof property.seller === 'string' ? property.seller : property.seller?.$id;
            const propertyName = property.name || 'Bất động sản';
            
            if (sellerId) {
                let statusMessage = '';
                switch (decision) {
                    case 'approved':
                        statusMessage = `Bài đăng "${propertyName}" của bạn đã được duyệt`;
                        break;
                    case 'rejected':
                        statusMessage = `Bài đăng "${propertyName}" của bạn đã bị từ chối`;
                        break;
                    case 'request_changes':
                        statusMessage = `Bài đăng "${propertyName}" của bạn cần chỉnh sửa`;
                        break;
                }
                
                await createNotification({
                    userId: sellerId,
                    message: statusMessage,
                    type: 'property_status_updated',
                    relatedPropertyId: propertyId
                });
            }
        } catch (notifError) {
            console.warn("Không thể tạo thông báo:", notifError);
        }

        return updatedProperty;
    } catch (error) {
        console.error("Lỗi xác thực BĐS:", error);
        throw error;
    }
}


export async function updatePropertyPrice(propertyId: string, newPrice: number, changedBy: string) {
    try {
        // 1. Cập nhật giá trong Properties
        await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            { price: newPrice }
        );

        // 2. Lưu lịch sử giá
        try {
            await databases.createDocument(
                config.databaseId!,
                config.priceHistoryCollectionId!,
                ID.unique(),
                {
                    propertyId,
                    price: newPrice,
                    changedBy,
                    changedAt: new Date().toISOString()
                }
            );
        } catch (hError) {
            console.log("Lỗi lưu lịch sử giá (có thể do chưa tạo collection price_history):", hError);
        }

        return true;
    } catch (error) {
        console.error("Lỗi cập nhật giá:", error);
        throw error;
    }
}

export async function getUserByEmail(email: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.profilesCollectionId!,
            [Query.equal('email', email)]
        );
        if (result.total > 0) return result.documents[0];
        return null;
    } catch (error) {
        console.error("Lỗi tìm user bằng email:", error);
        return null;
    }
}

export async function markPropertyAsSold(propertyId: string, buyerId: string) {
    try {
        const result = await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            {
                status: 'sold',
                buyerId: buyerId // Lưu ID người mua để cấp quyền đánh giá
            }
        );
        return result;
    } catch (error) {
        console.error("Lỗi đánh dấu đã bán:", error);
        throw error;
    }
}

export async function getAllPendingProperties(region: string) {
    try {
        if (!region) return [];
        
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('status', 'available'),
                Query.equal('region', region), // Chỉ lấy BĐS cùng vùng với Broker
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

        const enrichedBookings = await Promise.all(result.documents.map(async (booking: any) => {
            try {
                // 1. Lấy ID an toàn (dù nó là string hay object)
                const propId = typeof booking.property === 'string'
                    ? booking.property
                    : booking.property?.$id;

                // 2. Kiểm tra xem dữ liệu có bị thiếu không?
                // (Thiếu là khi: property là chuỗi ID, HOẶC là object nhưng không có tên)
                const isDataMissing = !booking.property || typeof booking.property === 'string' || !booking.property.name;

                // 3. Nếu có ID và dữ liệu đang thiếu -> Gọi API lấy lại
                if (propId && isDataMissing) {
                    const fullProperty = await getPropertyById({ id: propId });
                    if (fullProperty) {
                        booking.property = fullProperty;
                    }
                }
                
                // 4. Enrich thông tin user (có thể là buyer hoặc seller)
                if (booking.user && typeof booking.user === 'string') {
                    try {
                        const userProfile = await databases.getDocument(
                            config.databaseId!,
                            config.profilesCollectionId!,
                            booking.user
                        );
                        booking.user = userProfile;
                    } catch {
                        console.warn(`[BrokerBookings] Không thể lấy thông tin user cho booking ${booking.$id}`);
                    }
                }
            } catch {
                console.warn(`[BrokerBookings] Không thể lấy chi tiết BĐS cho booking ${booking.$id}`);
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
        // Lấy thông tin booking trước khi cập nhật
        const booking = await databases.getDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId
        );

        const updatedBooking = await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            { status: 'confirmed' }
        );

        // Tạo thông báo cho user (buyer hoặc seller)
        try {
            const { createNotification } = await import('./notifications');
            const userId = typeof booking.user === 'string' ? booking.user : booking.user?.$id;
            const propertyId = typeof booking.property === 'string' ? booking.property : booking.property?.$id;
            
            if (userId && propertyId) {
                const property = await databases.getDocument(
                    config.databaseId!,
                    config.propertiesCollectionId!,
                    propertyId
                );
                const propertyName = property.name || 'Bất động sản';
                const formattedDate = new Date(booking.date).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                await createNotification({
                    userId,
                    message: `Lịch hẹn xem "${propertyName}" vào ${formattedDate} đã được chấp nhận`,
                    type: 'booking_confirmed',
                    relatedPropertyId: propertyId
                });
            }
        } catch (notifError) {
            console.warn("Không thể tạo thông báo:", notifError);
        }

        return updatedBooking;
    } catch (error) {
        console.error("Lỗi xác nhận lịch hẹn:", error);
        throw error;
    }
}

/**
 * Môi giới TỪ CHỐI lịch hẹn
 */
export async function rejectBooking(bookingId: string) {
    try {
        // Lấy thông tin booking trước khi cập nhật
        const booking = await databases.getDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId
        );

        const updatedBooking = await databases.updateDocument(
            config.databaseId!,
            config.bookingsCollectionId!,
            bookingId,
            { status: 'cancelled' }
        );

        // Tạo thông báo cho user (buyer hoặc seller)
        try {
            const { createNotification } = await import('./notifications');
            const userId = typeof booking.user === 'string' ? booking.user : booking.user?.$id;
            const propertyId = typeof booking.property === 'string' ? booking.property : booking.property?.$id;
            
            if (userId && propertyId) {
                const property = await databases.getDocument(
                    config.databaseId!,
                    config.propertiesCollectionId!,
                    propertyId
                );
                const propertyName = property.name || 'Bất động sản';
                const formattedDate = new Date(booking.date).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                await createNotification({
                    userId,
                    message: `Lịch hẹn xem "${propertyName}" vào ${formattedDate} đã bị từ chối`,
                    type: 'booking_rejected',
                    relatedPropertyId: propertyId
                });
            }
        } catch (notifError) {
            console.warn("Không thể tạo thông báo:", notifError);
        }

        return updatedBooking;
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
            [Query.select(['*'])] // Yêu cầu trả về các trường của seller
        );

        if (!property) return null;

        if (property.seller && typeof property.seller === 'string') {
                    const sellerProfile = await getUserProfile(property.seller);
                    if (sellerProfile) {
                        property.seller = sellerProfile; // Gán đè lại object đầy đủ (có name, avatar,...)
                    }
                }
                // Trường hợp Appwrite trả về object nhưng thiếu tên
                else if (property.seller && !property.seller.name) {
                     const sellerProfile = await getUserProfile(property.seller.$id);
                     if (sellerProfile) property.seller = sellerProfile;
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

export async function getPropertyGallery(propertyId: string) {
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
}

// 2. Hàm Upload File (Dùng chung logic với CreateProperty)
export async function uploadFieldImage(file: any) {
    if (!file.mimeType || !file.fileSize) return null;

    const asset = {
        name: file.fileName || `${ID.unique()}.jpg`,
        type: file.mimeType,
        size: file.fileSize,
        uri: file.uri
    };

    try {
        const uploadedFile = await storage.createFile(
            config.storageId!,
            ID.unique(),
            asset
        );

        // Trả về URL xem ảnh
        return `${config.endpoint}/storage/buckets/${config.storageId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;
    } catch (error) {
        console.error('Lỗi upload file:', error);
        throw error;
    }
}

// 3. Hàm lưu link ảnh vào Collection Galleries
export async function addImageToGalleryDoc(propertyId: string, imageUrl: string, uploaderId: string) {
    return await databases.createDocument(
        config.databaseId!,
        config.galleriesCollectionId!,
        ID.unique(),
        {
            propertyId: propertyId,
            image: imageUrl,
            uploaderId: uploaderId // Ghi nhận ai là người up ảnh này (Broker)
        }
    );
}


async function getUserProfile(profileId: string) {
    try {
        const profile = await databases.getDocument(
            config.databaseId!,
            config.profilesCollectionId!, // Đã trỏ vào bảng 'profiles'
            profileId
        );
        return profile;
    } catch {
        console.error("Không tìm thấy profile:", profileId);
        return { name: "Người dùng ẩn danh", avatar: null }; // Fallback
    }
}

export async function getUserByPhone(phone: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.profilesCollectionId!,
            [Query.equal('phoneNumber', phone)] // Giả sử field trong profiles là 'phoneNumber'
        );
        if (result.total > 0) return result.documents[0];
        return null;
    } catch (error) {
        console.error("Lỗi tìm user bằng số điện thoại:", error);
        return null;
    }
}

export async function updatePropertyStatus(
    propertyId: string,
    status: 'deposit_paid' | 'sold',
    buyerId: string
) {
    try {
        const payload: any = {
            status: status,
            buyerId: buyerId // Chỉ lưu ID người mua, thông tin chi tiết sẽ lấy từ collection users
        };

        const result = await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            payload
        );

        return result;
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái BĐS:", error);
        throw error;
    }
}

/**
 * BIDDING SYSTEM - Môi giới bấm nhận duyệt tin trong thời gian bidding
 */
export async function submitBid(propertyId: string, brokerId: string) {
    try {
        // 1. Lấy thông tin property hiện tại
        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId
        );

        // 2. Kiểm tra deadline
        if (!property.biddingDeadline) {
            throw new Error("Tin đăng này không trong thời gian đấu giá");
        }

        const deadline = new Date(property.biddingDeadline);
        const now = new Date();
        
        if (now > deadline) {
            throw new Error("Đã hết thời gian nhận tin");
        }

        // 3. Kiểm tra đã submit chưa
        const currentBidders = property.biddingBrokers || [];
        if (currentBidders.includes(brokerId)) {
            throw new Error("Bạn đã đăng ký nhận tin này rồi");
        }

        // 4. Thêm broker vào danh sách
        const updatedBidders = [...currentBidders, brokerId];
        
        await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            {
                biddingBrokers: updatedBidders,
                biddingStatus: 'open'
            }
        );

        console.log(`✅ Broker ${brokerId} đã đăng ký nhận tin ${propertyId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi submit bid:", error);
        throw error;
    }
}

/**
 * BIDDING SYSTEM - Xử lý sau khi hết deadline
 * Logic:
 * - Nếu 0 người: chuyển về normal (available)
 * - Nếu 1 người: assign luôn
 * - Nếu >= 2 người: random chọn 1 người
 */
export async function processExpiredBidding(propertyId: string) {
    try {
        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId
        );

        const bidders = property.biddingBrokers || [];
        const biddersCount = bidders.length;

        console.log(`🔄 Xử lý bidding cho property ${propertyId}, có ${biddersCount} môi giới`);

        if (biddersCount === 0) {
            // Không có ai nhận -> chuyển về normal
            await databases.updateDocument(
                config.databaseId!,
                config.propertiesCollectionId!,
                propertyId,
                {
                    biddingStatus: 'normal',
                    biddingDeadline: null,
                    biddingBrokers: []
                }
            );
            console.log('📢 Không có môi giới nào nhận, chuyển về chế độ thường');
            
            // Thông báo cho seller
            try {
                const { createNotification } = await import('./notifications');
                const sellerId = typeof property.seller === 'string' ? property.seller : property.seller?.$id;
                if (sellerId) {
                    await createNotification({
                        userId: sellerId,
                        message: `Không có môi giới nào nhận tin "${property.name}". Tin đăng chuyển về chế độ thường.`,
                        type: 'bidding_no_bidders',
                        relatedPropertyId: propertyId
                    });
                }
            } catch (notifError) {
                console.warn("Không thể tạo thông báo:", notifError);
            }
            
        } else if (biddersCount === 1) {
            // 1 người -> assign luôn
            const selectedBroker = bidders[0];
            await assignPropertyToBroker(propertyId, selectedBroker);
            
            await databases.updateDocument(
                config.databaseId!,
                config.propertiesCollectionId!,
                propertyId,
                {
                    biddingStatus: 'assigned',
                    selectedBroker: selectedBroker
                }
            );
            
            console.log(`✅ Chỉ có 1 môi giới, tự động assign cho ${selectedBroker}`);
            
            // Thông báo cho broker được chọn
            try {
                const { createNotification } = await import('./notifications');
                await createNotification({
                    userId: selectedBroker,
                    message: `Chúc mừng! Bạn đã được chọn để quản lý tin "${property.name}"`,
                    type: 'bidding_winner',
                    relatedPropertyId: propertyId
                });
            } catch (notifError) {
                console.warn("Không thể tạo thông báo:", notifError);
            }
            
        } else {
            // >= 2 người -> random
            const randomIndex = Math.floor(Math.random() * biddersCount);
            const selectedBroker = bidders[randomIndex];
            
            await assignPropertyToBroker(propertyId, selectedBroker);
            
            await databases.updateDocument(
                config.databaseId!,
                config.propertiesCollectionId!,
                propertyId,
                {
                    biddingStatus: 'assigned',
                    selectedBroker: selectedBroker
                }
            );
            
            console.log(`🎲 Bốc thăm ngẫu nhiên, chọn môi giới ${selectedBroker} trong ${biddersCount} người`);
            
            // Thông báo cho broker được chọn
            try {
                const { createNotification } = await import('./notifications');
                await createNotification({
                    userId: selectedBroker,
                    message: `Chúc mừng! Bạn đã được chọn (qua bốc thăm) để quản lý tin "${property.name}"`,
                    type: 'bidding_winner',
                    relatedPropertyId: propertyId
                });
                
                // Thông báo cho các broker không được chọn
                for (const bidderId of bidders) {
                    if (bidderId !== selectedBroker) {
                        await createNotification({
                            userId: bidderId,
                            message: `Rất tiếc, bạn không được chọn cho tin "${property.name}"`,
                            type: 'bidding_loser',
                            relatedPropertyId: propertyId
                        });
                    }
                }
            } catch (notifError) {
                console.warn("Không thể tạo thông báo:", notifError);
            }
        }

        return { success: true, biddersCount, selectedBroker: biddersCount > 0 ? property.selectedBroker : null };
    } catch (error: any) {
        console.error("Lỗi xử lý bidding:", error);
        throw error;
    }
}

/**
 * BIDDING SYSTEM - Kiểm tra và xử lý tất cả các tin hết hạn bidding
 * Chạy định kỳ (có thể từ app hoặc background job)
 */
export async function checkAndProcessAllExpiredBiddings() {
    try {
        const now = new Date();
        
        // Lấy tất cả properties có bidding đang mở và đã hết hạn
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('biddingStatus', 'open'),
                Query.lessThan('biddingDeadline', now.toISOString()),
                Query.limit(100)
            ]
        );

        console.log(`🔍 Tìm thấy ${result.total} tin đã hết hạn bidding`);

        for (const property of result.documents) {
            try {
                await processExpiredBidding(property.$id);
            } catch (error) {
                console.error(`Lỗi xử lý property ${property.$id}:`, error);
            }
        }

        return { processed: result.total };
    } catch (error) {
        console.error("Lỗi kiểm tra bidding:", error);
        return { processed: 0 };
    }
}

/**
 * Lấy danh sách properties đang trong thời gian bidding theo region
 */
export async function getBiddingProperties(region: string) {
    try {
        const now = new Date();
        
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [
                Query.equal('biddingStatus', 'open'),
                Query.equal('region', region),
                Query.greaterThan('biddingDeadline', now.toISOString()),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );

        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy danh sách bidding:", error);
        return [];
    }
}