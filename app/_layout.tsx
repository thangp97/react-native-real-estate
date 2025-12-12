import { SplashScreen, Stack } from "expo-router";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import GlobalProvider from "@/lib/global-provider";
import { ComparisonProvider } from "@/lib/comparison-provider";
import { FilterProvider } from "@/lib/filter-provider";
import { Text, TextInput } from "react-native";

// Giữ Splash Screen hiển thị cho đến khi load xong font
SplashScreen.preventAutoHideAsync();

// Fix font padding on Android to align text vertically
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;
// @ts-ignore
Text.defaultProps.style = { includeFontPadding: false, textAlignVertical: 'center' };

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;
// @ts-ignore
TextInput.defaultProps.style = { includeFontPadding: false, textAlignVertical: 'center' };

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
        "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
        "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
        "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
        "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
        "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    });

    useEffect(() => {
        // SỬA LỖI: Chỉ ẩn Splash Screen khi font ĐÃ load xong (fontsLoaded === true)
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <GlobalProvider>
            <FilterProvider>
                <ComparisonProvider>
                    {/* Đây là thành phần quan trọng nhất để sửa lỗi Navigation Context.
                        Nó tạo ra Navigation Container cho toàn bộ ứng dụng.
                    */}
                    <Stack screenOptions={{ headerShown: false }} />
                </ComparisonProvider>
            </FilterProvider>
        </GlobalProvider>
    );
}