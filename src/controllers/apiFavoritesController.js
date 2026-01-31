const storeFavorites = require('../services/storeFavorites');
const { getMappedMovieDetailsFromCache } = require('../services/manageMovieDetailsCache');

// handler for getting all favorite movies
async function getFavoritesHandler(req, res) {
    try {
        const all = await storeFavorites.getFavorites();
        return res.status(200).json({ results: all, countResults: all.length });
    } 
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'INTERNAL_ERROR';
        const message = error.message || 'Failed to read favorites';
        return res.status(status).json({ error: code, message: message });
    }
}

// handler for adding a favorite movie
async function addFavoriteHandler(req, res) {
    let movieID = undefined;
    if (req.body) {
        movieID = req.body.movieId;
    }
    const IDNum = Number(movieID);
    if (!Number.isInteger(IDNum) || IDNum <= 0) {
        return res.status(400).json({error: 'BAD_REQUEST', message: 'movieId must be a valid integer greater than 0'});
    }

    try {
        const existingFavoriteMovie = await storeFavorites.getFavoriteById(IDNum);
        if (existingFavoriteMovie) {
            return res.status(409).json({error: 'ALREADY_EXISTS', message: 'Movie is already in favorites', favorite: existingFavoriteMovie});
        }

        const movieDetailsMap = await getMappedMovieDetailsFromCache(IDNum);

        const addedMovie = await storeFavorites.addFavorite(movieDetailsMap);
        return res.status(201).json(addedMovie);
    }
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'INTERNAL_ERROR';
        const message = error.message || 'Failed to add favorite';
        return res.status(status).json({ error: code, message: message });
    }
}

// handler for deleting a favorite movie by ID
async function deleteFavoriteHandler(req, res) {
    const movieId = req.params.movieId;

    try {
        const isExistedFavoriteMovie = await storeFavorites.deleteFavorite(movieId);
        if (!isExistedFavoriteMovie) {
            return res.status(404).json({error: 'NOT_FOUND', message: 'Movie not found in favorites'});
        }
        return res.status(200).json({ status: 'ok' });
    }
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'INTERNAL_ERROR';
        const message = error.message || 'Failed to delete favorite';
        return res.status(status).json({ error: code, message: message });
    }
}

// handler for deleting all favorite movies
async function deleteAllFavoritesHandler(req, res) {
    try {
        await storeFavorites.deleteAllFavorites();
        return res.status(200).json({ status: 'ok' });
    }
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'INTERNAL_ERROR';
        const message = error.message || 'Failed to delete all favorites';
        return res.status(status).json({ error: code, message: message });
    }
}

module.exports = { getFavoritesHandler, addFavoriteHandler, deleteFavoriteHandler, deleteAllFavoritesHandler };