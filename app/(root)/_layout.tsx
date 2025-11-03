import {useGlobalContext} from "@/lib/global-provider";
import {SafeAreaView} from "react-native-safe-area-context";
import {ActivityIndicator} from "react-native";
import {Redirect, Slot} from "expo-router";

export default function AppLayout() {
    const {loading, isLoggedIn} = useGlobalContext();

    if (loading) {
        return (
            <SafeAreaView>
                <ActivityIndicator className={"text-primary-300 h-full flex justify-center items-center"} size={"large"} />
            </SafeAreaView>
        )
    }

    if (!isLoggedIn) return <Redirect href={"/sign-in"} />;

    return <Slot/>
}