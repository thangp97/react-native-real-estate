import { useEffect } from "react";
import { useGlobalContext } from "@/lib/global-provider";
import { useRouter, Slot } from "expo-router";

export default function AppLayout() {
    const { loading, isLoggedIn } = useGlobalContext();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isLoggedIn) {
            router.replace("/sign-in");
        }
    }, [loading, isLoggedIn]); // <-- CỰC QUAN TRỌNG

    if (loading) {
        return null;
    }

    return <Slot />;
}
