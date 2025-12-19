import "react-native-appwrite";

declare module "react-native-appwrite" {
    namespace Models {
        interface Document {
            image?: string;
            video?: string;
            rating?: number;
            name?: string;
            address?: string;
            price?: number;
            proposedPrice?: number;
            avatar?: string;
            review?: string;
            username?: string;
            email?: string;
            role?: string;
            credits?: number;
            status?: string;
            buyerName?: string;
            buyerPhone?: string;
            buyerIdentityCard?: string;
            // Bidding system fields
            biddingDeadline?: string | null; // Thời hạn để môi giới nhận tin
            biddingBrokers?: string[]; // Danh sách ID môi giới đã bấm nhận
            selectedBroker?: string | null; // Môi giới được chọn (sau bốc thăm)
            biddingStatus?: 'open' | 'closed' | 'assigned' | 'normal'; // Trạng thái đấu giá
        }
    }
}
