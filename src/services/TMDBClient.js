const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// helper function
// build URL for TMDB API requests
function buildUrl(path, queryParams = {}) {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    const apiKey = process.env.TMDB_API_KEY;

    // check if API key is available
    if (!apiKey) {
        const error = new Error('TMDB_API_KEY is not set in environment variables');
        error.status = 500;
        error.code = 'TMDB_API_KEY_MISSING';
        throw error;
    }

    // add API key to query parameters
    url.searchParams.set('api_key', apiKey);

    // add other query parameters
    for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }

    return url.toString();
}

// perform GET request to TMDB API
async function getFromTMDB(path, queryParams = {}) {
    const url = buildUrl(path, queryParams);
    const response = await fetch(url, {method: 'GET'});

    // validate response
    let data;
    try {
        data = await response.json();
    } catch {
        data = null
    }
    if (!response.ok) {
        let error;
        if (data && (data.status_message || data.message)) {
            error = new Error(data.status_message || data.message);
        }
        else {
            error = new Error(`TMDB API error: ${response.status} ${response.statusText}`);
        }
        error.status = response.status;
        error.code = status_code_mapping(response.status);
        error.details = data;
        throw error;
    }

    return data;
}

// helper function
// map HTTP status codes to error codes
function status_code_mapping(status) {
    if (status === 401) return 'TMDB_UNAUTHORIZED';
    if (status === 404) return 'TMDB_NOT_FOUND';
    if (status === 429) return 'TMDB_RATE_LIMITED';
    if (status >= 500) return 'TMDB_SERVER_ERROR';
    return 'TMDB_API_ERROR';
}

// GET request to TMDB API
// search movies by text and optional year
async function searchMovies(text, year, pageNum = 1) {
    const queryParams = {query: text, year : year, page: pageNum};
    return getFromTMDB('/search/movie', queryParams);
}

// GET request to TMDB API
// get movie details by ID
async function getMovieDetails(movieId) {
    return getFromTMDB(`/movie/${movieId}`);
}

module.exports = { searchMovies, getMovieDetails };