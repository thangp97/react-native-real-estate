import {ActivityIndicator, Button, FlatList, Image, Text, TouchableOpacity, View} from "react-native";
import {Link, router, useLocalSearchParams} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import images from "@/constants/images";
import icons from "@/constants/icons";
import Search from "@/components/Search";
import {Card, FeaturedCard} from "@/components/Cards";
import Filters from "@/components/Filters";
import {useGlobalContext} from "@/lib/global-provider";
import seed from "@/lib/seed";
import {useAppwrite} from "@/lib/useAppwrite";
import {getLastestProperties, getProperties} from "@/lib/appwrite";
import {useEffect} from "react";
import NoResults from "@/components/NoResults";
// FlatList

export default function Index() {
    const {user} = useGlobalContext();
    const params = useLocalSearchParams<{ query?: string; filter?: string;}>();

    const {data: lastestProperties, loading: lastestPropertiesLoading} = useAppwrite({
        fn: getLastestProperties
    });

    const {data: properties, loading, refetch} = useAppwrite({
        fn: getProperties,
        params: {
            filter: params.filter!,
            query: params.query!,
            limit: 6,
        },
        skip: true,
    })

    const handleCardPress = (id: string) => router.push(`/properties/${id}`);

    useEffect(() => {
        refetch({
            filter: params.filter!,
            query: params.query!,
            limit: 6,
        })
    }, [params.filter,params.query])
  return (
    <SafeAreaView className={"bg-white h-full"}>
        <FlatList data={properties}
                  renderItem={({item}) => <Card item={item} onPress={() => handleCardPress(item.$id)} />}
                  keyExtractor={(item) => item.$id}
                  numColumns={2}
                  contentContainerClassName={"pb-32"}
                  columnWrapperClassName={"flex gap-5 px-5"}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
            loading ? (
                <ActivityIndicator size={"large"} className={"text-primary-300 mt-5"} />
            ) : <NoResults />
                  }
                  ListHeaderComponent={<View className={"px-5"}>
                      <View className={"flex flex-row ite justify-between mt-5"}>
                          <View className={"flex flex-row items-center"}>
                              <Image source={{uri: user?.avatar}} className={"size-12 rounded-full"}/>
                              <View className={"flex flex-col items-start ml-2 justify-center"}>
                                  <Text className={"text-xs font-rubik text-black-100"}>
                                      Good Morning
                                  </Text>
                                  <Text className={"text-base font-rubik-medium text-black-300"}>
                                      Thang Pham
                                  </Text>
                              </View>
                          </View>
                          <Image source={icons.bell} className={"size-6"} />
                      </View>
                      <Search />
                      <View className={"my-5"}>
                          <View className={"flex flex-row items-center justify-between"}>
                              <Text className={"text-xl font-rubik-bold text-black-300"}>Featured</Text>
                              <TouchableOpacity>
                                  <Text className={"text-base font-rubik-bold text-primary-300"}>See All</Text>
                              </TouchableOpacity>
                          </View>

                          {lastestPropertiesLoading ?
                              <ActivityIndicator size={"large"} className={"text-primary-300 mt-5"} />
                              : !lastestProperties || lastestProperties.length === 0 ? <NoResults /> : (
                                      <FlatList data={lastestProperties}
                                                renderItem={({item}) => <FeaturedCard item={item} onPress={() => handleCardPress(item.$id)} />}
                                                keyExtractor={(item) => item.$id}
                                                horizontal={true}
                                                bounces={false}
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerClassName={"flex gap-5 mt-5"}
                                      />)}

                      </View>
                      <View className={"my-5"}>
                          <View className={"flex flex-row items-center justify-between"}>
                              <Text className={"text-xl font-rubik-bold text-black-300"}>Available House</Text>
                              <TouchableOpacity>
                                  <Text className={"text-base font-rubik-bold text-primary-300"}>See All</Text>
                              </TouchableOpacity>
                          </View>

                          <Filters />


                      </View>
                  </View>}
        />

    </SafeAreaView>
  );
}
