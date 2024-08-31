import { defineConfig } from 'vite'

export default defineConfig({
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
			// 代理 websockets 或 socket.io 写法：ws://localhost:5173/socket.io -> ws://localhost:5174/socket.io
			'/socket.io': {
				target: 'ws://localhost:5174',
				ws: true,
			},
		},
	},
})
