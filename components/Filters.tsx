import {Text, ScrollView, TouchableOpacity} from 'react-native'
import React from 'react'
import {categories} from "@/constants/data";
import { useFilterContext } from "@/lib/filter-provider";

const Filters = () => {
    const { filter, setFilter } = useFilterContext();

    const handleCategoryPress = (category: string) => {
        if (filter === category) {
            setFilter('All');
            return;
        }
        setFilter(category);
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
            className={"mt-3 mb-2"}
        >
            {categories.map((item, index) => (
                <TouchableOpacity key={index} onPress={() => handleCategoryPress(item.category)}
                    className={`flex flex-col items-start mr-4 px-4 py-2 rounded-full 
                    ${filter == item.category ? "bg-primary-300" : "bg-primary-100 border border-primary-200"}`}>
                    <Text className={`text-sm ${filter == item.category ? 
                        "text-white font-rubik-bold mt-0.5" : 
                        "text-black-300 font-rubik"}`}>{item.title}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    )
}
export default Filters
