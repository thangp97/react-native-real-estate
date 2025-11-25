import {createContext, ReactNode, useContext} from "react";
import {useAppwrite} from "@/lib/useAppwrite";
import {getCurrentUser} from "./appwrite";

interface User {
    role: string;
    $id: string;
    name: string;
    email: string;
    avatar: string;
}

interface GlobalContextType {
    isLoggedIn: boolean;
    user: User | null;
    loading: boolean;
    refetch: (newParams?: Record<string, string | number>) => Promise<void>;
    setUser: (user: User | null) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({children}: {children: ReactNode}) => {
    const {
        data: user,
        loading,
        refetch,
        setData
    } = useAppwrite({
        fn: getCurrentUser,
    })

    const isLoggedIn = !!user;
    console.log(JSON.stringify(user,null,2));

    return (
        <GlobalContext.Provider value={{
            isLoggedIn,
            user,
            loading,
            refetch,
            setUser: setData as any
        }}>
            {children}
        </GlobalContext.Provider>
    )
}

export const useGlobalContext = () : GlobalContextType => {
    const context = useContext(GlobalContext);

    if (!context) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }

    return context;
}

export default GlobalProvider;