const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT);

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
