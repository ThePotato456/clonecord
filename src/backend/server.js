require('dotenv').config();

const { createApp } = require('./app');

const { server } = createApp();
const PORT = Number(process.env.PORT || 4000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
