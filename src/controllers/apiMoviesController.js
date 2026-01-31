const {searchMovies} = require('../services/TMDBClient.js');
const {getMappedMovieDetailsFromCache} = require('../services/manageMovieDetailsCache');

// validate year
// year must be an integer between 1000 and current year
function isValidYear(year) {
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum)) return false;
    const currentYear = new Date().getFullYear();
    if (yearNum < 1000 || yearNum > currentYear) {
        return false;
    }
    else {
        return true;
    }
}

// validate ID
// ID must be an integer greater than 0
function isValidID(ID) {
    const IDNum = Number(ID);
    if (!Number.isInteger(IDNum) || IDNum <= 0) return false;
    return true;
}

// handler for searching movies
async function searchMoviesHandler(req, res) {
    const requestText = req.query.text;
    const requestYear = req.query.year;

    // validate text and year
    let text = '';
    let year = undefined;
    if (typeof requestText === 'string') {
        text = requestText.trim();
    }
    if (typeof requestYear === 'string') {
        year = requestYear.trim();
    }
    if (!text) {
        return res.status(400).json({error: 'BAD_REQUEST', message: 'Missing or empty "text" query parameter'});
    }
    if (year !== undefined && year !== '' && !isValidYear(year)) {
        return res.status(400).json({error: 'BAD_REQUEST', message: 'year must be a valid integer between 1000 and ' + new Date().getFullYear()});
    }

    try {
        const moviesCollected = [];
        let pageNum = 1;

        // get movies until we have 50 or no more results
        while (moviesCollected.length < 50) {
            const data = await searchMovies(text, year, pageNum);
            if (!data || !Array.isArray(data.results)) {
                return res.status(502).json({error: 'TMDB_SERVER_ERROR', message: 'Invalid response from TMDB API'});
            }
            moviesCollected.push(...data.results);
            if (data.results.length === 0) break;
            const totalPages = Number(data.total_pages);
            if (!Number.isFinite(totalPages) || totalPages <= 0) break;
            if (pageNum >= totalPages) break;
            pageNum++;
        }

        const moviesCollectedMap = moviesCollected.slice(0, 50).map(movie => ({
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
        }));
        return res.status(200).json({results: moviesCollectedMap, countResults: moviesCollectedMap.length});
    }
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'TMDB_API_ERROR';
        const message = error.message || 'An error occurred while fetching data from TMDB API';
        return res.status(status).json({error: code, message: message});
    }
}

// handler for getting movie details by ID
async function getMovieDetailsHandler(req, res) {
    const requestID = req.params.movieId;

    // validate movieId
    let ID = undefined;
    if (typeof requestID === 'string') {
        ID = requestID.trim();
    }

    if (!ID) {
        return res.status(400).json({error: 'BAD_REQUEST', message: 'Missing or empty "movieId" path parameter'});
    }

    if (!isValidID(ID)) {
        return res.status(400).json({error: 'BAD_REQUEST', message: 'movieId must be a valid integer greater than 0'});
    }

    try {
        const movieDetailsMap = await getMappedMovieDetailsFromCache(ID);
        return res.status(200).json(movieDetailsMap);
    }
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'TMDB_API_ERROR';
        const message = error.message || 'An error occurred while fetching data from TMDB API';
        return res.status(status).json({error: code, message: message});
    }
}

module.exports = { searchMoviesHandler, getMovieDetailsHandler };