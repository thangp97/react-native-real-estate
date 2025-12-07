import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
    minPrice: string;
    setMinPrice: (value: string) => void;
    maxPrice: string;
    setMaxPrice: (value: string) => void;
    bedrooms: string;
    setBedrooms: (value: string) => void;
    area: string;
    setArea: (value: string) => void;
    region: string;
    setRegion: (value: string) => void;
    filter: string; // Loại nhà (House, Condo...)
    setFilter: (value: string) => void;
    query: string;
    setQuery: (value: string) => void;
    resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [area, setArea] = useState('');
    const [region, setRegion] = useState('All');
    const [filter, setFilter] = useState('All');
    const [query, setQuery] = useState('');

    const resetFilters = () => {
        setMinPrice('');
        setMaxPrice('');
        setBedrooms('');
        setArea('');
        setRegion('All');
        setFilter('All');
        setQuery('');
    };

    return (
        <FilterContext.Provider value={{
            minPrice, setMinPrice,
            maxPrice, setMaxPrice,
            bedrooms, setBedrooms,
            area, setArea,
            region, setRegion,
            filter, setFilter,
            query, setQuery,
            resetFilters
        }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilterContext = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilterContext must be used within a FilterProvider');
    }
    return context;
};
