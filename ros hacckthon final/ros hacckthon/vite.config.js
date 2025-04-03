export default {
  server: {
    open: '/index.html'
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: '/index.html',
        dashboard: '/dashboard.html'
      }
    }
  }
} 