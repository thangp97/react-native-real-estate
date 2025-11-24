import {View, Text, ScrollView, Image, TouchableOpacity, ImageSourcePropType, Alert} from 'react-native'
import React, {useState} from 'react'
import {SafeAreaView} from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import icons from "@/constants/icons";
import {useGlobalContext} from "@/lib/global-provider";
import {signOut as logout, updateUserProfile, uploadFile} from "@/lib/appwrite";
import {settings} from "@/constants/data";

interface SettingItemProps {
    icon: ImageSourcePropType;
    title: string;
    onPress?: () => void;
    textStyle?: string;
    showArrow?: boolean;
}

const SettingsItem = ({icon, title, onPress, textStyle, showArrow = true}:
                      SettingItemProps) => (
    <TouchableOpacity onPress={onPress} className={"flex flex-row items-center justify-between py-3"}>
        <View className={"flex flex-row items-center gap-3"}>
            <Image source={icon} className={"size-6"}/>
            <Text className={`text-lg font-rubik-medium text-black-300 ${textStyle}`}>{title}</Text>
        </View>

        {showArrow && <Image source={icons.rightArrow} className={"size-5"}/>}
    </TouchableOpacity>
)

const Profile = () => {
    const {user, refetch} = useGlobalContext();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogout = async () => {
        await logout();
        // Sau khi logout, global provider sẽ tự động redirect về sign-in
        // không cần alert ở đây nữa để trải nghiệm mượt hơn
        refetch();
    }

    const handleAvatarChange = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Lỗi', 'Chúng tôi cần quyền truy cập thư viện ảnh để bạn có thể thay đổi ảnh đại diện.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setIsSubmitting(true);
            try {
                const fileUrl = await uploadFile(result.assets[0]);
                if (!fileUrl) throw new Error("Không thể tải ảnh lên.");

                await updateUserProfile(user!.$id, { avatar: fileUrl.href });

                Alert.alert("Thành công", "Ảnh đại diện đã được cập nhật.");
                await refetch(); // Tải lại dữ liệu người dùng để cập nhật UI

            } catch (error: any) {
                console.error("Lỗi cập nhật ảnh đại diện:", error);
                Alert.alert("Lỗi", `Đã có lỗi xảy ra: ${error.message}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };


    return (
        <SafeAreaView className={"h-full bg-white"}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName={"pb-32 px-7"}
            >
                <View className={"flex flex-row items-center justify-between mt-5"}>
                    <Text className={"text-xl font-rubik-bold"}>Hồ sơ</Text>
                    <Image source={icons.bell} className={"size-5"} />
                </View>

                <View className={"flex-row justify-center flex mt-5"}>
                    <View className={"flex flex-col items-center relative mt-5"}>
                        <Image source={{uri: user?.avatar}} className={"size-44 relative rounded-full"} />
                        <TouchableOpacity className={"absolute bottom-11 right-2"} onPress={handleAvatarChange} disabled={isSubmitting}>
                            <Image source={icons.edit} className={"size-9"} />
                        </TouchableOpacity>

                        <Text className={"text-2xl font-rubik-bold mt-2"}>{user?.name}</Text>
                    </View>
                </View>

                <View className={"flex flex-col mt-10"}>
                    <SettingsItem icon={icons.calendar} title={"Lịch hẹn của tôi"}
                    />
                    <SettingsItem icon={icons.wallet} title={"Thanh toán"}
                    />
                </View>

                <View className={"flex flex-col mt-5 border-t pt-5 border-primary-200"}>
                    {settings.slice(2).map((item, index) => (
                        <SettingsItem key={index} {...item}
                        />
                    ))}
                </View>
                <View className={"flex flex-col mt-5 border-t pt-5 border-primary-200"}>
                    <SettingsItem icon={icons.logout} title={"Đăng xuất"}
                                  textStyle={"text-danger"} showArrow={false} onPress={handleLogout}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
export default Profile
