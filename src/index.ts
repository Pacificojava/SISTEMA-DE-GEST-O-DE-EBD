import app, { startServer } from './server';

if (require.main === module) {
  startServer();
}

export default app;
module.exports = app;