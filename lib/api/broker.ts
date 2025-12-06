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
    // Placeholder stats function
    // Trong thực tế, bạn sẽ query count các properties, bookings, v.v.
    return {
        totalProperties: 10,
        activeListings: 5,
        totalSales: 1000000,
        pendingReviews: 2
    };
}

export async function getBrokerRecentProperties(userId: string) {
    try {
         // Lấy các property được assign cho broker này
         // Giả sử có field 'assignedBroker' trong properties
         // Hoặc lấy tất cả properties nếu là logic demo
         const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.limit(5), Query.orderDesc('$createdAt')]
        );
        return result.documents;
    } catch (error) {
        console.error("Lỗi lấy BĐS cho broker:", error);
        return [];
    }
}

export async function assignPropertyToBroker(propertyId: string, brokerId: string) {
    try {
        return await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            { assignedBroker: brokerId }
        );
    } catch (error) {
        console.error("Lỗi assign broker:", error);
        throw error;
    }
}

export async function finalizeVerification(propertyId: string) {
    try {
         return await databases.updateDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            propertyId,
            { status: 'approved' }
        );
    } catch (error) {
        console.error("Lỗi xác thực BĐS:", error);
        throw error;
    }
}