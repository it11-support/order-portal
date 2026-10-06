import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const figmaAssetResolver = () => {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib/index.ts'),
      '@hooks': path.resolve(__dirname, './src/app/hooks/index.ts'),
      '@components': path.resolve(__dirname, './src/app/components/index.ts'),
      '@contexts': path.resolve(__dirname, './src/app/contexts/index.ts'),
      '@layouts': path.resolve(__dirname, './src/app/layouts/index.ts'),
      '@pages': path.resolve(__dirname, './src/app/pages/index.ts'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
