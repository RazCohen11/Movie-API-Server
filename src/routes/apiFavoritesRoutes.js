const express = require('express');
const { getFavoritesHandler, addFavoriteHandler, deleteFavoriteHandler, deleteAllFavoritesHandler } = require('../controllers/apiFavoritesController');

const router = express.Router();

// get all favorite movies
router.get('/', getFavoritesHandler);

// add a movie to favorites
router.post('/', addFavoriteHandler);

// delete all favorite movies
router.delete('/', deleteAllFavoritesHandler);

// delete a movie from favorites by ID
router.delete('/:movieId', deleteFavoriteHandler);

module.exports = router;