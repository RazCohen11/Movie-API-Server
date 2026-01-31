require('dotenv').config();
const createApp = require('./app');
const PORT = Number(process.env.PORT) || 3000;

// Create the Express app
const app = createApp();

// Start the server and listen for requests
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});