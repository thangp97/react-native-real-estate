import { ID, Query } from "react-native-appwrite";
import { config, databases } from "../appwrite";

export async function createReview({ 
    reviewerId, 
    agentId, 
    propertyId, 
    rating, 
    comment 
}: { 
    reviewerId: string, 
    agentId: string, 
    propertyId: string, 
    rating: number, 
    comment: string 
}) {
    try {
        // 1. Tạo Review mới
        const review = await databases.createDocument(
            config.databaseId!,
            config.reviewsCollectionId!,
            ID.unique(),
            {
                reviewerId,
                agentId,
                propertyId,
                rating,
                comment,
                createdAt: new Date().toISOString()
            }
        );

        // 2. Tính toán lại Rating trung bình cho Broker
        await updateBrokerRating(agentId);

        return review;
    } catch (error) {
        console.error("Lỗi tạo đánh giá:", error);
        throw error;
    }
}

async function updateBrokerRating(agentId: string) {
    try {
        // Lấy tất cả review của agent
        const reviews = await databases.listDocuments(
            config.databaseId!,
            config.reviewsCollectionId!,
            [Query.equal('agentId', agentId)]
        );

        if (reviews.total === 0) return;

        // Tính trung bình
        const totalRating = reviews.documents.reduce((acc, doc) => acc + doc.rating, 0);
        const averageRating = totalRating / reviews.total;
        
        // Làm tròn 1 chữ số thập phân
        const finalRating = Math.round(averageRating * 10) / 10;

        // Cập nhật vào Collection Profiles
        await databases.updateDocument(
            config.databaseId!,
            config.profilesCollectionId!,
            agentId,
            {
                rating: finalRating,
                reviewCount: reviews.total
            }
        );
        
        console.log(`Updated Broker ${agentId} rating to ${finalRating} (${reviews.total} reviews)`);

    } catch (error) {
        console.error("Lỗi cập nhật rating broker:", error);
        // Không throw error để tránh chặn flow chính nếu chỉ lỗi update thống kê
    }
}

export async function checkReviewExists(userId: string, propertyId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.reviewsCollectionId!,
            [
                Query.equal('reviewerId', userId),
                Query.equal('propertyId', propertyId)
            ]
        );
        return result.total > 0;
    } catch (error) {
        return false;
    }
}

export async function getReviewsByAgentId(agentId: string) {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.reviewsCollectionId!,
            [Query.equal('agentId', agentId), Query.orderDesc('createdAt')]
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy danh sách đánh giá:", error);
        return [];
    }
}