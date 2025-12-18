import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import images from '@/constants/images';
import icons from '@/constants/icons';
import { Models } from 'react-native-appwrite';
import { formatStatus, getStatusColor, formatCurrency } from '@/lib/utils';

interface Props {
    item: Models.Document;
    onPress?: () => void;
}

export const FeaturedCard = ({item: {image, rating, name, address, price, area}, onPress}: Props) => {
    const pricePerMeter = area > 0 ? (price / area) : 0;

    return (
        <TouchableOpacity onPress={onPress} className={"flex flex-col " +
            "items-start w-60 h-80 relative"}>
            <Image source={{uri: image}} className={"size-full rounded-2xl"} />
            <Image source={images.cardGradient} className={"size-full rounded-2xl " +
                "absolute bottom-0"} />

            <View className={"flex flex-col items-start absolute bottom-5 inset-x-5"}>
                <Text className={"text-xl font-rubik-extrabold text-white"}
                      numberOfLines={1}>{name}</Text>
                <Text className={"text-base font-rubik text-white"} numberOfLines={1}>
                    {address}
                </Text>

                <View className="flex flex-row items-center justify-between w-full mt-1">
                    <View className="flex flex-row items-center">
                        <Text className="text-white font-rubik-medium text-sm">{area} m²</Text>
                        {pricePerMeter > 0 && (
                            <Text className="text-white/80 font-rubik text-xs ml-2">
                                • {formatCurrency(pricePerMeter)}/m²
                            </Text>
                        )}
                    </View>
                </View>

                <View className={"flex flex-row items-center justify-between w-full mt-1"}>
                    <Text className={"text-xl font-rubik-extrabold text-white"}>
                        {formatCurrency(price)} VND
                    </Text>
                    <Image source={icons.heart} className={"size-5"} />
                </View>
            </View>
        </TouchableOpacity>
    )
}

export const Card = ({ item, onPress }: Props) => {
    const { image, name, address, price, status, area } = item;
    const formattedStatus = status ? formatStatus(status) : '';
    const statusColor = status ? getStatusColor(status) : '#777';
    const pricePerMeter = area > 0 ? (price / area) : 0;

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
                <Text className={"text-xs font-rubik text-black-200"} numberOfLines={1}>
                    {address}
                </Text>

                <View className="flex flex-row items-center mt-1">
                    <Text className="text-black-200 font-rubik-medium text-xs">{area} m²</Text>
                    {pricePerMeter > 0 && (
                        <Text className="text-black-100 font-rubik text-[10px] ml-2 italic">
                            ({formatCurrency(pricePerMeter)}/m²)
                        </Text>
                    )}
                </View>

                <View className={"flex flex-row items-center justify-between mt-1"}>
                    <Text className={"text-base font-rubik-bold text-primary-300"}>
                        {formatCurrency(price)} VND
                    </Text>
                    <Image source={icons.heart} className={"w-5 h-5 mr-2 size-5"} tintColor={"#191d31"} />
                </View>
            </View>
        </TouchableOpacity>
    )
}