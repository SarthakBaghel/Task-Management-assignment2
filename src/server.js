const app = require('./app');
const env = require('./config/env');
const { connectDatabases } = require('./config/db');

connectDatabases()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
