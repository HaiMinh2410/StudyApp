import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    root: '.',
    plugins: [
        tailwindcss(),
    ],
    build: {
        outDir: 'dist',
    },
    server: {
        port: 3000,
        open: true,
    },
});
