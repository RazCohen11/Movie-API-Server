const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');

let isInitialized = false;
const favoritesMap = new Map();

// ensure the data directory and load favorites from JSON file
async function ensureInitialized()  {
    if (isInitialized) return;

    // ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        // load favorites from JSON file to favoritesMap
        const readJSON = await fs.readFile(FAVORITES_FILE, 'utf-8');
        const trimmedJSON = readJSON.trim();
        if (trimmedJSON === '') {
            await fs.writeFile(FAVORITES_FILE, '[]', 'utf-8');
            isInitialized = true;
            return;
        }
        const favoritesArray = JSON.parse(trimmedJSON);
        if (Array.isArray(favoritesArray)) {
            for (const movie of favoritesArray) {
                if (movie && typeof movie.id === 'number') {
                    favoritesMap.set(movie.id, movie);
                }
            }
        }
        else {
            const statusError = new Error('Favorites JSON file is corrupted');
            statusError.status = 500;
            statusError.code = 'FAVORITES_FILE_CORRUPTED';
            throw statusError;
        }
    }
    catch (error) {
        // file does not exist - initialize empty favorites
        if (error && error.code === 'ENOENT') {
            await fs.writeFile(FAVORITES_FILE, '[]', 'utf-8');
        }
        // JSON parse error - corrupted file
        else if (error && error.name === 'SyntaxError') {
            const statusError = new Error('Favorites JSON file is corrupted');
            statusError.status = 500;
            statusError.code = 'FAVORITES_FILE_CORRUPTED';
            throw statusError;
        }
        // other errors
        else {
            const statusError = new Error('Failed to load favorites JSON file');
            statusError.status = 500;
            statusError.code = 'FAVORITES_LOAD_ERROR';
            throw statusError;
        }
    }
    isInitialized = true;
}

// save favoritesMap to JSON file
async function saveFavoritesToJSONFile() {
    const favoritesArray = Array.from(favoritesMap.values());
    const jsonString = JSON.stringify(favoritesArray, null, 2);
    await fs.writeFile(FAVORITES_FILE, jsonString, 'utf-8');
}

// get all favorite movies
async function getFavorites() {
    await ensureInitialized();
    return Array.from(favoritesMap.values());
}

// get favorite movie by ID
async function getFavoriteById(movieId) {
    await ensureInitialized();

    const IDNum = Number(movieId);
    if (!Number.isInteger(IDNum) || IDNum <= 0) {
        const error = new Error('movieId must be a valid integer greater than 0');
        error.status = 400;
        error.code = 'BAD_REQUEST';
        throw error;
    }

    return favoritesMap.get(IDNum) || null;
}

// add a movie to favorites
async function addFavorite(movie) {
    await ensureInitialized();
    if (!movie || typeof movie.id !== 'number') {
        const error = new Error('Invalid movie object');
        error.status = 400;
        error.code = 'BAD_REQUEST';
        throw error;
    }

    favoritesMap.set(movie.id, movie);
    await saveFavoritesToJSONFile();
    return movie;
}

// delete a movie from favorites by ID
async function deleteFavorite(movieId) {
    await ensureInitialized();
    const IDNum = Number(movieId);
    if (!Number.isInteger(IDNum) || IDNum <= 0) {
        const error = new Error('movieId must be a valid integer greater than 0');
        error.status = 400;
        error.code = 'BAD_REQUEST';
        throw error;
    }

    const isExistedFavoriteMovie = favoritesMap.delete(IDNum);
    if (isExistedFavoriteMovie) {
        await saveFavoritesToJSONFile();
    }

    return isExistedFavoriteMovie;
}

// delete all favorite movies
async function deleteAllFavorites() {
    await ensureInitialized();

    const hadFavorites = favoritesMap.size > 0;
    favoritesMap.clear();

    if (hadFavorites) {
        await saveFavoritesToJSONFile();
    }

    return hadFavorites;
}

module.exports = { getFavorites, getFavoriteById, addFavorite, deleteFavorite, deleteAllFavorites };