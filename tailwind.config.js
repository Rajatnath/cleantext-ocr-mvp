/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Satoshi', 'Inter', 'sans-serif'],
                serif: ['Newsreader', 'serif'],
            },
            boxShadow: {
                'subtle': '0 1px 0 rgba(0,0,0,0.08)',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
