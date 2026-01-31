## Environment Variables
To run the project, create a `.env` file in the project root with:

```env
TMDB_API_KEY=YOUR_TMDB_API_KEY
PORT=3000
```

## High-level Flow
1. Express server starts (`src/server.js`) and loads env vars from `.env`.
2. Incoming requests go through routes (`src/routes/...`).
3. Routes call controllers (`src/controllers/...`) which:
   * Validate input
   * Call services (`src/services/...`)
   * Return a JSON response (success or error)
4. Services:
   * `TMDBClient.js`: calls TMDB API
   * `manageMovieDetailsCache.js`: caches movie details
   * `storeFavorites.js`: manages favorites at `data/favorites.json`

## Movies Search: GET /api/movies/search
Search TMDB movies and return up to 50 results.

### Query params
- text (required): search text
- year (optional): filter by year

### Success (200)
Returns:
- results: array (max 50)
- countResults: number

Each result is mapped to:
- id (number)
- title (string)
- release_date (string or empty)

### Validation errors (400)
- Missing text
- text is empty / whitespace
- year is not a number
- year is out of range

### TMDB errors
Depending on what TMDB returns, the API responds with status and code, for example:
- 401: TMDB_UNAUTHORIZED
- 404: TMDB_NOT_FOUND
- 429: TMDB_RATE_LIMITED
- 5xx: TMDB_SERVER_ERROR
- any other: TMDB_API_ERROR

### Max 50 results logic (not dependent on page size)
The search endpoint keeps requesting TMDB pages until:
- collected 50 results, or
- reached total_pages, or
- TMDB returns an empty results array

Then it returns `moviesCollected.slice(0, 50)`.

## Movie Details: GET /api/movies/:movieId
Fetch details for a specific TMDB movie ID, mapped to 4 fields:
- name (string)
- year (number or null)
- genre (array of strings)
- imagePath (string or null)

### Validation errors (400)
- movieId is not a positive integer

### Not found (404)
- If TMDB says the movie doesn’t exist

## Favorites:
### Get favorite list: GET /api/favorites
Returns:
{
  "results": [],
  "countResults": 3
}

### Add a movie to the favorite list: POST /api/favorites
Adds a movie by ID.
Body:
{ "movieId": 550 }

### Delete a movie from the favorite list: DELETE /api/favorites/:movieId
Removes a favorite movie by ID.

### Delete all favorite movies: DELETE /api/favorites
Clears favorites list.

## Edge cases desicions:
### adding/deleting to/from favorite list:
   - add existing favorite to favorite list: 409 Conflict
   - delete non existing favorite from the favorite list: 404 Not Found
   - delete all favorites from an empty favorite list: 200 ok
   
### favorites.json:
   - if the file does not exist: initialize as `[]` and continue
   - if the file exists but is empty or with whitespace: write `[]` and continue
   - if the file exists but contains invalid JSON / partial JSON: 500 FAVORITES_FILE_CORRUPTED

## Design Decisions
### Why a cache with TTL?
I used an in-memory cache with a TTL to balance performance and memory usage. Without TTL, the cache could grow indefinitely and keep stale data forever. With TTL, entries that weren’t requested for a while are considered less relevant and are evicted, so the cache stays bounded and the data eventually refreshes. If the data is needed again after it expires, the server simply fetches it again from TMDB.

Note: if the only goal is to minimize TMDB API calls (and we don't care about memory usage at all), the TTL can be removed or disabled so cached entries are kept indefinitely and repeated requests do not trigger additional TMDB calls.

### Why store favorites in a Map and rewrite JSON
I wanted favorites to persist across server restarts, so I needed durable storage (a JSON file) and not only an in-memory structure. Initially, I considered updating the JSON file incrementally on each add/remove, but that approach is error-prone (it requires careful handling to avoid producing invalid or partially-written JSON). Instead, I keep favorites in memory as a `Map(id: movie)` for fast operations, and on every change I serialize the full collection and rewrite `data/favorites.json`. This keeps persistence simple and consistent, and for the assignment scale rewriting a small file is practical and reliable.

Note: For a larger-scale system, I would solve persistence with a proper database. However, we discussed that I should not use a DB for this assignment.

### Why added deleteAllFavorites?
The assignment required supporting delete functionality. Deleting a single favorite by ID is the main use case, but in practice it’s also useful to completely reset the favorites list (especially for testing). For that reason, I added an optional convenience endpoint that clears all favorites in one call.