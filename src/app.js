const express = require('express');

function createApp() {
    const app = express();
    app.use(express.json());

    // Routes for movies
    const apiMoviesRoutes = require('./routes/apiMoviesRoutes');
    app.use('/api/movies', apiMoviesRoutes);

    // Routes for favorites
    const apiFavoritesRoutes = require('./routes/apiFavoritesRoutes');
    app.use('/api/favorites', apiFavoritesRoutes);

    return app;
}

module.exports = createApp;