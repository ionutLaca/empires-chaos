import { defineConfig } from 'vite';

// base './' face ca build-ul să meargă și pe GitHub Pages (https://<user>.github.io/empires-chaos/)
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
