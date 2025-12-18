import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import images from '@/constants/images';
import icons from '@/constants/icons';
import { Models } from 'react-native-appwrite';
import { formatStatus, getStatusColor, formatCurrency } from '@/lib/utils';

interface Props {
    item: Models.Document;
    onPress?: () => void;
    onFavoritePress?: () => void;
    isFavorite?: boolean;
}

export const FeaturedCard = ({item: {image, rating, name, address, price, area}, onPress, onFavoritePress, isFavorite}: Props) => {
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
                    <TouchableOpacity onPress={onFavoritePress}>
                        <Image 
                            source={icons.heart} 
                            className={"size-5"} 
                            tintColor={isFavorite ? "#d9534f" : "#ffffff"} 
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export const Card = ({ item, onPress, onFavoritePress, isFavorite }: Props) => {
    const { image, name, address, price, status, area } = item;
    const formattedStatus = status ? formatStatus(status) : '';
    const statusColor = status ? getStatusColor(status) : '#777';
    const pricePerMeter = area > 0 ? (price / area) : 0;

    return (
        <TouchableOpacity onPress={onPress}
                          className={"w-full mt-4 px-3 p-5 rounded-3xl bg-white " +
                              "shadow-xl shadow-black-100/70 relative"}>

            <Image source={{uri: image}} className={"w-full h-72 rounded-2xl"} />
            
            {status && (
                <View 
                    style={{ backgroundColor: statusColor }} 
                    className="absolute top-8 left-8 px-4 py-2 rounded-full z-10"
                >
                    <Text className="text-white text-sm font-rubik-bold">
                        {formattedStatus}
                    </Text>
                </View>
            )}

            <View className={"flex flex-col mt-4"}>
                <Text className={"text-2xl font-rubik-extrabold text-black-300"}
                      numberOfLines={2}>{name}</Text>
                <Text className={"text-xl font-rubik text-black-200 mt-2"} numberOfLines={1}>
                    {address}
                </Text>

                <View className="flex flex-row items-center mt-4">
                    <Text className="text-black-200 font-rubik-bold text-2xl">{area} m²</Text>
                    {pricePerMeter > 0 && (
                        <Text className="text-black-100 font-rubik-medium text-base ml-4 italic">
                            ({formatCurrency(pricePerMeter)}/m²)
                        </Text>
                    )}
                </View>

                <View className={"flex flex-row items-center justify-between mt-4"}>
                    <Text className={"text-3xl font-rubik-extrabold text-primary-300"}>
                        {formatCurrency(price)} VND
                    </Text>
                    <TouchableOpacity onPress={onFavoritePress}>
                         <Image 
                            source={icons.heart} 
                            className={"w-10 h-10 mr-2 size-10"} 
                            tintColor={isFavorite ? "#d9534f" : "#191d31"} 
                         />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    )
}