import "react-native-appwrite";

declare module "react-native-appwrite" {
    namespace Models {
        interface Document {
            image?: string;
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
        }
    }
}
