/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all files that contain Nativewind classes.
    content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            fontFamily: {
                rubik: ["Rubik-Regular", "sans-serif"],
                "rubik-bold": ["Rubik-Bold", "san-serif"],
                "rubik-extrabold": ["Rubik-ExtraBold", "san-serif"],
                "rubik-light": ["Rubik-Light", "san-serif"],
                "rubik-medium": ["Rubik-Medium", "san-serif"],
                "rubik-semibold": ["Rubik-SemiBold", "san-serif"],
            },
            colors: {
                "primary": {
                    100: '#0061FF0A',
                    200: '#0061FF1A',
                    300: '#0061FF',

                },
                accent: {
                    100: '#FBFBFD',
                },
                black: {
                    DEFAULT: '#000000',
                    100: '#8C8E98',
                    200: '#666876',
                    300: '#191d31',
                },
                danger: '#F75555',
            }
        },
    },
    plugins: [],
}