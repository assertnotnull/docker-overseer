import adapter from '@sveltejs/adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

const port = Number(process.env.PORT) || 5110;

export default defineConfig(({ mode }) => {
	loadEnv(mode, process.cwd(), '');
	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter()
			})
		],
		server: {
			host: '127.0.0.1',
			port
		},
		preview: {
			host: '127.0.0.1',
			port
		}
	};
});
