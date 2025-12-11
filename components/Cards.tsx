import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import images from '@/constants/images';
import icons from '@/constants/icons';
import { Models } from 'react-native-appwrite';
import { formatStatus, getStatusColor } from '@/lib/utils';

interface Props {
    item: Models.Document;
    onPress?: () => void;
}

export const FeaturedCard = ({item: {image, rating, name, address, price}, onPress}: Props) => {
    return (
        <TouchableOpacity onPress={onPress} className={"flex flex-col" +
            "items-start w-60 h-80 relative"}>
            <Image source={{uri: image}} className={"size-full rounded-2xl"} />
            <Image source={images.cardGradient} className={"size-full rounded-2xl " +
                "absolute bottom-0"} />

            <View className={"flex flex-col items-start absolute bottom-5 inset-x-5"}>
                <Text className={"text-xl font-rubik-extrabold text-white"}
                      numberOfLines={1}>{name}</Text>
                <Text className={"text-base font-rubik text-white"}>
                    {address}
                </Text>

                <View className={"flex flex-row items-center justify-between w-full"}>
                    <Text className={"text-xl font-rubik-extrabold text-white"}>
                        {price.toLocaleString('vi-VN')} VND
                    </Text>
                    <Image source={icons.heart} className={"size-5"} />
                </View>
            </View>
        </TouchableOpacity>
    )
}

export const Card = ({ item, onPress }: Props) => {
    const { image, name, address, price, status } = item;
    const formattedStatus = status ? formatStatus(status) : '';
    const statusColor = status ? getStatusColor(status) : '#777';

    return (
        <TouchableOpacity onPress={onPress}
                          className={"flex-1 w-full mt-4 px-3 py-4 rounded-lg bg-white " +
                              "shadow-lg shadow-black-100/70 relative"}>

            <Image source={{uri: image}} className={"w-full h-40 rounded-lg"} />
            
            {status && (
                <View 
                    style={{ backgroundColor: statusColor }} 
                    className="absolute top-6 left-6 px-3 py-1 rounded-full z-10"
                >
                    <Text className="text-white text-xs font-rubik-bold">
                        {formattedStatus}
                    </Text>
                </View>
            )}

            <View className={"flex flex-col mt-2"}>
                <Text className={"text-base font-rubik-bold text-black-300"}
                      numberOfLines={1}>{name}</Text>
                <Text className={"text-xs font-rubik text-black-200"}>
                    {address}
                </Text>

                <View className={"flex flex-row items-center justify-between mt-2"}>
                    <Text className={"text-base font-rubik-bold text-primary-300"}>
                        {price.toLocaleString('vi-VN')} VND
                    </Text>
                    <Image source={icons.heart} className={"w-5 h-5 mr-2 size-5"} tintColor={"#191d31"} />
                </View>
            </View>
        </TouchableOpacity>
    )
}