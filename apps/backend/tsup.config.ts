import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'workers/dtw-export/index': 'src/workers/dtw-export/index.ts',
  },

  format: ['esm'],
  target: 'node22',
  platform: 'node',

  outDir: 'dist',
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,

  // Jangan bundle dependency CommonJS
  skipNodeModulesBundle: true,

  // Pastikan dotenv tetap dijalankan sebagai package eksternal
  external: ['dotenv', 'dotenv/config', '@prisma/client', '@repo/shared'],
})
