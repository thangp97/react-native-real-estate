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
    variant?: 'default' | 'small';
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
                        {formatCurrency(price)}
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

export const Card = ({ item, onPress, onFavoritePress, isFavorite, variant = 'default' }: Props) => {
    const { image, name, address, price, status, area } = item;
    const formattedStatus = status ? formatStatus(status) : '';
    const statusColor = status ? getStatusColor(status) : '#777';
    const pricePerMeter = area > 0 ? (price / area) : 0;

    const isSmall = variant === 'small';

    return (
        <TouchableOpacity onPress={onPress}
                          className={`w-full mt-4 rounded-3xl bg-white shadow-xl shadow-black-100/70 relative ${isSmall ? 'p-3' : 'px-3 p-5'}`}>

            <Image source={{uri: image}} className={`w-full rounded-2xl ${isSmall ? 'h-40' : 'h-72'}`} />
            
            {status && (
                <View 
                    style={{ backgroundColor: statusColor }} 
                    className={`absolute rounded-full z-10 ${isSmall ? 'top-5 left-5 px-2 py-1' : 'top-8 left-8 px-4 py-2'}`}
                >
                    <Text className={`text-white font-rubik-bold ${isSmall ? 'text-[10px]' : 'text-sm'}`}>
                        {formattedStatus}
                    </Text>
                </View>
            )}

            <View className={`flex flex-col ${isSmall ? 'mt-2' : 'mt-4'}`}>
                <Text className={`font-rubik-extrabold text-black-300 ${isSmall ? 'text-base' : 'text-2xl'}`}
                      numberOfLines={1}>{name}</Text>
                <Text className={`font-rubik text-black-200 ${isSmall ? 'text-xs mt-1' : 'text-xl mt-2'}`} numberOfLines={1}>
                    {address}
                </Text>

                <View className={`flex flex-row items-center ${isSmall ? 'mt-2' : 'mt-4'}`}>
                    <Text className={`text-black-200 font-rubik-bold ${isSmall ? 'text-sm' : 'text-2xl'}`}>{area} m²</Text>
                    {pricePerMeter > 0 && (
                        <Text className={`text-black-100 font-rubik-medium italic ${isSmall ? 'text-[10px] ml-2' : 'text-base ml-4'}`}>
                            ({formatCurrency(pricePerMeter)}/m²)
                        </Text>
                    )}
                </View>

                <View className={`flex flex-row items-center justify-between ${isSmall ? 'mt-2' : 'mt-4'}`}>
                    <Text className={`font-rubik-extrabold text-primary-300 ${isSmall ? 'text-lg' : 'text-3xl'}`}>
                        {formatCurrency(price)}
                    </Text>
                    <TouchableOpacity onPress={onFavoritePress}>
                         <Image 
                            source={icons.heart} 
                            className={`${isSmall ? 'size-5' : 'w-10 h-10 mr-2 size-10'}`} 
                            tintColor={isFavorite ? "#d9534f" : "#191d31"} 
                         />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    )
}