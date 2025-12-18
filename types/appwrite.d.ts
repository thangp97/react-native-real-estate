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
        }
    }
}
