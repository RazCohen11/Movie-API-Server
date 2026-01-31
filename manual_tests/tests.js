const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');

if (typeof fetch !== 'function') {
    console.error('FAIL: This script requires Node 18+ (global fetch is missing).');
    process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');

// start the Express server for testing
async function startServer() {
    const createApp = require(path.join(PROJECT_ROOT, 'src', 'app'));
    const app = createApp();
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    return { server, baseUrl };
}

// stop the Express server
async function stopServer(server) {
    await new Promise((resolve) => server.close(resolve));
}

// clear require cache for the project
function clearProjectRequireCache() {
    for (const key of Object.keys(require.cache)) {
        if (key.includes(`${path.sep}src${path.sep}`)) {
            delete require.cache[key];
        }
    }
}

// perform HTTP request and return JSON response
async function httpJson(baseUrl, method, pathname, body) {
    const url = `${baseUrl}${pathname}`;
    const options = { method, headers: {} };
    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
        res = await fetch(url, { ...options, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }

    const contentType = res.headers.get('content-type') || '';
    let parsed = null;
    try {
        parsed = await res.json();
    }
    catch {
        parsed = null;
    }

    return { status: res.status, contentType, body: parsed };
}

// make sure data directory exists
async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

// write to favorites file
async function writeToFavorites(text) {
    await ensureDataDir();
    await fs.writeFile(FAVORITES_FILE, text, 'utf-8');
}

// backup favorites file
async function backupFavoritesFile() {
    await ensureDataDir();
    try {
        const original = await fs.readFile(FAVORITES_FILE, 'utf-8');
        return { existed: true, content: original };
    }
    catch (error) {
        if (error && error.code === 'ENOENT') return { existed: false, content: null };
        throw error;
    }
}

// restore favorites file from backup
async function restoreFavoritesFile(backup) {
    await ensureDataDir();
    if (!backup.existed) {
        try {
            await fs.unlink(FAVORITES_FILE);
        }
        catch (error) {
            if (error && error.code === 'ENOENT') return;
            throw error;
        }
        return;
    }
    await fs.writeFile(FAVORITES_FILE, backup.content, 'utf-8');
}

// run all tests
async function runTests(tests) {
    let passedtests = 0;
    let failedtests = 0;
    for (const test of tests) {
        try {
            await test.function();
            console.log(`PASS: ${test.name}`);
            passedtests += 1;
        }
        catch (error) {
            console.log(`FAIL: ${test.name}`);
            console.log(`${error && error.message ? error.message : String(error)}`);
            failedtests += 1;
        }
    }

    console.log('');
    console.log(`Summary: ${passedtests} passed, ${failedtests} failed, ${passedtests + failedtests} total`);
    if (failedtests > 0) process.exitCode = 1;
}

// build tests
function buildTests() {
    const tests = [];

    async function testSearchWithoutText() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/search');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.ok(res.body && typeof res.body === 'object');
            assert.equal(res.body.error, 'BAD_REQUEST');
            assert.ok(typeof res.body.message === 'string');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testSearchEmptyText() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/search?text=');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testSearchSpacesText() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/search?text=%20%20%20');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testSearchYearNotNumber() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/search?text=spiderman&year=abcd');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testSearchYearTooSmall() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/search?text=spiderman&year=999');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testSearchYearTooLarge() {
        const { server, baseUrl } = await startServer();
        try {
            const nextYear = new Date().getFullYear() + 1;
            const res = await httpJson(baseUrl, 'GET', `/api/movies/search?text=spiderman&year=${nextYear}`);
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testMovieDetailsNotInteger() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/abc');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testMovieDetailsZeroID() {
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/movies/0');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testFavoritesCorruptedFile() {
        await writeToFavorites('{');
        clearProjectRequireCache();
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/favorites');
            assert.equal(res.status, 500);
            assert.match(res.contentType, /application\/json/i);
            assert.ok(res.body && typeof res.body === 'object');
            assert.equal(res.body.error, 'FAVORITES_FILE_CORRUPTED');
        }
        finally {
            await stopServer(server);
        }
        await writeToFavorites('[]');
    }

    async function testFavoritesEmptyFile() {
        await writeToFavorites('[]');
        clearProjectRequireCache();
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'GET', '/api/favorites');
            assert.equal(res.status, 200);
            assert.match(res.contentType, /application\/json/i);
            assert.ok(res.body && typeof res.body === 'object');
            assert.ok(Array.isArray(res.body.results));
            assert.equal(res.body.results.length, 0);
            assert.equal(res.body.countResults, 0);
        }
        finally {
            await stopServer(server);
        }
    }

    async function testFavoritesPostNoBody() {
        await writeToFavorites('[]');
        clearProjectRequireCache();
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'POST', '/api/favorites');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testFavoritesPostMovieIdZero() {
        await writeToFavorites('[]');
        clearProjectRequireCache();
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'POST', '/api/favorites', { movieId: 0 });
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testFavoritesDeleteNonInteger() {
        await writeToFavorites('[]');
        clearProjectRequireCache();
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'DELETE', '/api/favorites/abc');
            assert.equal(res.status, 400);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.error, 'BAD_REQUEST');
        }
        finally {
            await stopServer(server);
        }
    }

    async function testFavoritesDeleteAll() {
        await writeToFavorites('[]');
        clearProjectRequireCache();
        const { server, baseUrl } = await startServer();
        try {
            const res = await httpJson(baseUrl, 'DELETE', '/api/favorites');
            assert.equal(res.status, 200);
            assert.match(res.contentType, /application\/json/i);
            assert.equal(res.body.status, 'ok');
        }
        finally {
            await stopServer(server);
        }
    }

    // Add tests
    tests.push({ name: 'GET /api/movies/search (without text): error code 400', function: testSearchWithoutText });
    tests.push({ name: 'GET /api/movies/search?text= (text is empty): error code 400', function: testSearchEmptyText });
    tests.push({ name: 'GET /api/movies/search?text=   (text is spaces): error code 400', function: testSearchSpacesText });
    tests.push({ name: 'GET /api/movies/search?text=spiderman&year=abcd (year is not a number): error code 400', function: testSearchYearNotNumber });
    tests.push({ name: 'GET /api/movies/search?text=spiderman&year=999 (year is too small): error code 400', function: testSearchYearTooSmall });
    tests.push({ name: 'GET /api/movies/search?text=spiderman&year=nextYear (year is too large): error code 400', function: testSearchYearTooLarge });
    tests.push({ name: 'GET /api/movies/abc (movieId is not an integer): error code 400', function: testMovieDetailsNotInteger });
    tests.push({ name: 'GET /api/movies/0 (movieId is zero): error code 400', function: testMovieDetailsZeroID });
    tests.push({ name: 'GET /api/favorites with Corrupted favorites file: error code 500, FAVORITES_FILE_CORRUPTED', function: testFavoritesCorruptedFile });
    tests.push({ name: 'GET /api/favorites on empty favorites file: return 200, {results:[], countResults:0}', function: testFavoritesEmptyFile });
    tests.push({ name: 'POST /api/favorites without body: error code 400', function: testFavoritesPostNoBody });
    tests.push({ name: 'POST /api/favorites with movieId=0: error code 400', function: testFavoritesPostMovieIdZero });
    tests.push({ name: 'DELETE /api/favorites/abc (movieId is not an integer): error code 400', function: testFavoritesDeleteNonInteger });
    tests.push({ name: 'DELETE /api/favorites (delete all): returns 200, {status:"ok"}', function: testFavoritesDeleteAll });

    return tests;
}

async function main() {
    const favoritesBackup = await backupFavoritesFile();

    try {
        const tests = buildTests();
        await runTests(tests);
    }
    finally {
        await restoreFavoritesFile(favoritesBackup);
    }
}

main().catch((error) => {
    console.error('FAIL: Unhandled error in manual test runner.');
    console.error(error);
    process.exit(1);
});