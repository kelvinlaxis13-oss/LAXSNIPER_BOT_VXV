const { defineConfig } = require('@rsbuild/core');
const { pluginReact } = require('@rsbuild/plugin-react');
const path = require('path');

module.exports = defineConfig({
    plugins: [pluginReact()],
    source: {
        entry: {
            index: './src/main.tsx',
        },
        alias: {
            '@/external': path.resolve(__dirname, './src/external'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/constants': path.resolve(__dirname, './src/constants'),
            '@/stores': path.resolve(__dirname, './src/stores'),
        },
    },
    html: {
        template: './index.html',
    },
    server: {
        port: 5005,
    },
});
