
import { defineConfig } from 'vite'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

const rootDir = import.meta.dirname

const figmaAssetResolver = () => {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(rootDir, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      open: false,
    }),
  ],

  build: {
    sourcemap: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@lib': path.resolve(rootDir, './src/lib'),
      '@hooks': path.resolve(rootDir, './src/app/hooks'),
      '@components': path.resolve(rootDir, './src/app/components'),
      '@contexts': path.resolve(rootDir, './src/app/contexts'),
      '@layouts': path.resolve(rootDir, './src/app/layouts'),
      '@pages': path.resolve(rootDir, './src/app/pages'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})
