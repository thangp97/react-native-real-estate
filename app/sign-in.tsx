import {View, Text, ScrollView, Image, TouchableOpacity, Alert, TextInput, StyleSheet, Button, ImageBackground} from 'react-native'
import React, {useState} from 'react'
import images from "@/constants/images";
import {SafeAreaView} from "react-native-safe-area-context";
import icons from "@/constants/icons";
import {account, loginWithGoogle, signIn} from "@/lib/appwrite";
import {useGlobalContext} from "@/lib/global-provider";
import {Link, Redirect, useRouter} from "expo-router";


const SignIn = () => {
    const {refetch, loading, isLoggedIn} = useGlobalContext();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho form email/password
    const [form, setForm] = useState({
        email: '',
        password: ''
    });

    if (!loading && isLoggedIn) return <Redirect href={"/"} />;

    // Hàm xử lý đăng nhập bằng Google
    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        const result = await loginWithGoogle();
        if (result) {
            await refetch();
            router.replace('/');
        } else {
            Alert.alert('Lỗi', 'Đăng nhập bằng Google thất bại.');
        }
        setIsSubmitting(false);
    };

    // Hàm xử lý đăng nhập bằng Email/Password
    const handleEmailLogin = async () => {
        if (!form.email || !form.password) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
            return;
        }
        setIsSubmitting(true);
        try {
            await signIn(form.email, form.password);
            await refetch();
            router.replace('/');
        } catch (error: any) {
            Alert.alert('Lỗi đăng nhập', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ImageBackground 
            source={images.onboarding} 
            resizeMode="cover" 
            style={styles.background}
        >
            {/* Lớp phủ màu trắng mờ để làm nổi bật nội dung */}
            <View style={styles.overlay} />

            <SafeAreaView className={"flex-1"}>
                <ScrollView>
                    <View className={"w-full justify-center min-h-[100vh] px-4 my-6"}>
                        <Text className={"text-3xl font-rubik-bold text-black-300 text-center"}>
                            Đăng nhập vào ReState
                        </Text>

                        {/* Form đăng nhập Email/Password */}
                        <View className="mt-7">
                            <Text className="text-base text-gray-600 font-rubik-medium">Email</Text>
                            <TextInput
                                style={styles.input}
                                value={form.email}
                                onChangeText={(e) => setForm({...form, email: e})}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <View className="mt-4">
                            <Text className="text-base text-gray-600 font-rubik-medium">Mật khẩu</Text>
                            <TextInput
                                style={styles.input}
                                value={form.password}
                                onChangeText={(e) => setForm({...form, password: e})}
                                secureTextEntry
                            />
                        </View>
                        
                        <View className="mt-6">
                            <Button title={isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"} onPress={handleEmailLogin} disabled={isSubmitting} />
                        </View>

                        <Text className={"text-lg font-rubik text-black-200 text-center mt-8"}>
                            hoặc
                        </Text>

                        {/* Đăng nhập Google */}
                        <TouchableOpacity onPress={handleGoogleLogin} disabled={isSubmitting}
                                          className={"bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5"}>
                            <View className={"flex flex-row items-center justify-center"}>
                                <Image source={icons.google}
                                       className={"h-5 w-5"}
                                       resizeMode={"contain"} />
                                <Text className={"text-lg font-rubik-medium text-black-300 ml-2"}>
                                    Tiếp tục với Google
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Link đến trang đăng ký */}
                        <View className="flex-row justify-center pt-5">
                            <Text className="text-lg text-gray-600 font-rubik-regular">
                                Chưa có tài khoản?{' '}
                            </Text>
                            <Link href="/sign-up" className="text-lg font-rubik-semibold text-primary-300">
                                Đăng ký
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject, // Lớp phủ chiếm toàn bộ màn hình
        backgroundColor: 'rgba(255, 255, 255, 0.85)' // Màu trắng với độ mờ 85%
    },
    input: {
        height: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Nền hơi mờ cho ô input
        borderColor: '#ccc',
        borderWidth: 1,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginTop: 6,
        fontSize: 16,
    }
});

export default SignIn;
