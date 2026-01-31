const express = require('express');
const { searchMoviesHandler, getMovieDetailsHandler } = require('../controllers/apiMoviesController');
const router = express.Router();

// search movies by text and optional year
router.get('/search', searchMoviesHandler);

// get movie details by ID
router.get('/:movieId', getMovieDetailsHandler);

module.exports = router;