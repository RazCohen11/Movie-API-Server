const { getMovieDetails } = require('./TMDBClient');

const MOVIE_DETAILS_CACHE = new Map();
const MOVIE_DETAILS_CACHE_TTL_MS = 60 * 60 * 1000;

// get movie details from cache if available and not expired
function getMovieDetailsCache(movieID) {
    const entry = MOVIE_DETAILS_CACHE.get(movieID);
    if (!entry) return null;
    if (Date.now() > entry.expiryTime) {
        MOVIE_DETAILS_CACHE.delete(movieID);
        return null;
    }
    return entry.value;
}

// set movie details in cache with expiry time
function setMovieDetailsCache(movieID, value) {
    MOVIE_DETAILS_CACHE.set(movieID, {
        value: value,
        expiryTime: Date.now() + MOVIE_DETAILS_CACHE_TTL_MS
    });
}

// map TMDB movie details to wanted format
function mapTMDBMovieDetails(data) {
    // validate ID
    let ID = null;
    if (typeof data.id === 'number') {
        ID = data.id;
    }

    // validate name
    let name = '';
    if (typeof data.title === 'string') {
        name = data.title;
    }
    
    // validate year
    let year = null;
    if (typeof data.release_date === 'string' && data.release_date.length >= 4) {
        year = Number(data.release_date.substring(0, 4));
    }

    // validate genre
    let genres = [];
    if (Array.isArray(data.genres)) {
        genres = data.genres.map(g => (g && typeof g.name === 'string' ? g.name.trim() : '')).filter(name => name !== '');
    }

    // validate imagePath
    let imagePath = null;
    if (typeof data.poster_path === 'string') {
        imagePath = data.poster_path;
    }

    return {
        id: ID,
        name: name,
        year: year,
        genre: genres,
        imagePath: imagePath
    }
}

// get mapped movie details from cache or TMDB API
async function getMappedMovieDetailsFromCache(movieID) {
    const IDNum = Number(movieID);
    if (!Number.isInteger(IDNum) || IDNum <= 0) {
        const error = new Error('movieId must be a positive integer');
        error.status = 400;
        error.code = 'BAD_REQUEST';
        throw error;
    }

    // if movie details exist in cache, return it
    const cached = getMovieDetailsCache(IDNum);
    if (cached) {
        return cached;
    }

    // if movie details not in cache, get from TMDB API
    const data = await getMovieDetails(String(IDNum));

    if (!data || typeof data !== 'object') {
        const error = new Error('Invalid response from TMDB API');
        error.status = 502;
        error.code = 'TMDB_SERVER_ERROR';
        throw error;
    }

    const mapped = mapTMDBMovieDetails(data);

    if (mapped.id === null) {
        const error = new Error('Invalid movie id in TMDB response');
        error.status = 502;
        error.code = 'TMDB_SERVER_ERROR';
        throw error;
    }

    // store movie details in cache
    setMovieDetailsCache(IDNum, mapped);
    return mapped;
}

module.exports = { getMappedMovieDetailsFromCache };