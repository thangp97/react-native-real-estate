import { useAppwrite } from "@/lib/useAppwrite";
import { createContext, ReactNode, useContext } from "react";
import { getCurrentUser } from "./appwrite";

interface User {
    $id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
    credits?: number; // Credit for sellers
    favorites?: string[]; // Add favorites
}

interface GlobalContextType {
    isLoggedIn: boolean;
    user: User | null;
    loading: boolean;
    refetch: (newParams: Record<string, string | number>) => Promise<void>;
    setUser?: (user: User) => void; // Add setUser
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
    const {
        data: user,
        loading,
        refetch,
        setData: setUser // Get setData
    } = useAppwrite({
        fn: getCurrentUser,
    });

    const isLogged = !!user;

    // Type assertion to match User interface since getCurrentUser returns a merged object
    const typedUser = user as unknown as User | null;

    return (
        <GlobalContext.Provider value={{
            isLoggedIn: isLogged,
            user: typedUser,
            loading,
            refetch,
            setUser: (newUser: User) => setUser(newUser as any) // Implement setUser
        }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = (): GlobalContextType => {
    const context = useContext(GlobalContext);
    if (!context)
        throw new Error("useGlobalContext must be used within a GlobalProvider");

    return context;
}

export default GlobalProvider;