// Minimal entrypoint stub so the fixture has a real TypeScript source file
// for rules with `paths: ["**/*.ts"]` to match against.
import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

export default app;
