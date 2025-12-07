import {View, Image, TextInput} from 'react-native'
import React from 'react'
import icons from "@/constants/icons";
import {useDebouncedCallback} from "use-debounce";
import { useFilterContext } from "@/lib/filter-provider";

const Search = () => {
    const { query, setQuery } = useFilterContext();

    const debouncedSearch = useDebouncedCallback((text: string) => {
        setQuery(text);
    }, 500);

    const handleSearch = (text: string)=> {
        setQuery(text); // Cập nhật UI ngay lập tức
        // debouncedSearch(text); // Nếu muốn debounce việc gọi API (nhưng ở đây context update sẽ trigger API call bên Explore)
    }

    return (
        <View className={"flex flex-row items-center justify-between w-full px-4 " +
            "rounded-lg bg-accent-100 border border-primary-100 mt-5 py-2"}>
            <View className={"flex-1 flex flex-row items-center justify-start z-50"}>
                <Image source={icons.search} className={"size-5"} />
                <TextInput
                    value={query}
                    onChangeText={handleSearch}
                    placeholder={"Tìm kiếm nhà"}
                    placeholderTextColor="#888"
                    className={"text-sm font-rubik text-black-300 ml-2 flex-1"}
                />
            </View>
        </View>
    )
}
export default Search
