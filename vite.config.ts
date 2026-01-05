import { resolve } from 'path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const addShebangPlugin = (): Plugin => ({
  name: 'add-shebang',
  generateBundle(_options, bundle) {
    if (bundle['index.js']) {
      const chunk = bundle['index.js']
      if (chunk.type === 'chunk') {
        chunk.code = '#!/usr/bin/env node\n' + chunk.code
      }
    }
  },
})

export default defineConfig({
  plugins: [addShebangPlugin()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: (id) => {
        // Externalize all node_modules and Node.js built-ins
        return (
          !id.startsWith('.') &&
          !id.startsWith('/') &&
          !resolve(__dirname, id).startsWith(__dirname + '/src')
        )
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    target: 'node18',
    minify: false,
    sourcemap: true,
  },
})
