const express = require('express');
const multer = require('multer');
const path = require('path');

const db = require('../db');


const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/images/');
  },
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });


const router = express.Router();
// get the home page
router.get('/', async (req, res) => {
  let query = 'SELECT artist_name, rating, name, song.id, publish_year FROM artists INNER JOIN artists_song ON artists.id = artists_song.artists_id INNER JOIN song ON song.id = artists_song.songs_id';
  let parameters = [];
  let artistNameAsc = '';
  let ratingAsc = '';
  let songNameAsc = '';
  let publishYearAsc = '';

  //  filter
  if (req.query.filter) {
    query += ' WHERE LOWER(artist_name) LIKE LOWER($1) OR LOWER(name) LIKE LOWER($2)';
    parameters = [`%${req.query.filter}%`, `%${req.query.filter}%`];

    if (Number.isInteger(parseInt(req.query.filter, 10)) === true) {
      query += ' OR LOWER(rating) = LOWER($3)';
      parameters.push(req.query.filter);
    }
  }


  // sorting
  if (req.query.sort === 'artistName' && req.query.order === 'asc') {
    query += ' ORDER BY artist_name';
  } else if (req.query.sort === 'artistName' && req.query.order === 'desc') {
    query += ' ORDER BY artist_name DESC';
    artistNameAsc = true;
  }
  if (req.query.sort === 'name' && req.query.order === 'asc') {
    query += ' ORDER BY name';
  } else if (req.query.sort === 'name' && req.query.order === 'desc') {
    query += ' ORDER BY name DESC';
    songNameAsc = true;
  }
  if (req.query.sort === 'rating' && req.query.order === 'asc') {
    query += ' ORDER BY rating';
  } else if (req.query.sort === 'rating' && req.query.order === 'desc') {
    query += ' ORDER BY rating DESC';
    ratingAsc = true;
  }
  if (req.query.sort === 'publish_year' && req.query.order === 'asc') {
    query += ' ORDER BY publish_year';
  } else if (req.query.sort === 'publish_year' && req.query.order === 'desc') {
    query += ' ORDER BY publish_year DESC';
    publishYearAsc = true;
  }


  const result = await db.query(query, parameters);

  res.render('index', {
    rows: result.rows,
    fields: result.fields,
    query,
    title: 'Song Collection',
    parameters: JSON.stringify(parameters),
    artistNameAsc,
    ratingAsc,
    songNameAsc,
    publishYearAsc,
  });
});

//  get the create form
router.get('/new', async (req, res) => {
  const selectQuery = 'SELECT id, artist_name FROM artists';
  const result = await db.query(selectQuery);

  res.render('create', { artists: result.rows });
});

//  process the create form

router.post('/new', async (req, res) => {
  const errors = [];

  if (!(req.body.artist_id && req.body.rating && req.body.songName && req.body.release)) {
    errors.push('All fields are required.');
  }

  if (!errors.length) {
    const insertQuery2 = 'INSERT INTO song (name, rating, publish_year) VALUES ($1, $2, $3) RETURNING id';
    const insertQuery3 = 'INSERT INTO artists_song (artists_id, songs_id) VALUES ($1, $2)';

    const parameters2 = [req.body.songName, req.body.rating, req.body.release];

    const result = await db.query(insertQuery2, parameters2);

    const parameters3 = [req.body.artist_id, result.rows[0].id];

    await db.query(insertQuery3, parameters3);


    res.redirect('/');
  } else {
    const selectQuery = 'SELECT id, artist_name FROM artists';
    const result = await db.query(selectQuery);

    res.render('create', { errors, artists: result.rows });
  }
});

//  view the song

router.get('/song/:id', async (req, res) => {
  const selectQuery = 'SELECT artist_name, rating, name, song.id, publish_year, artist_story, file FROM artists INNER JOIN artists_song ON artists.id = artists_song.artists_id INNER JOIN song ON song.id = artists_song.songs_id WHERE song.id = $1';
  const parameter = [req.params.id];
  const result = await db.query(selectQuery, parameter);


  res.render('song', {
    song: result.rows[0],
    selectQuery,
    parameter,
    rows: result.rows,
    fields: result.fields,

  });
});

//  get the update the song
router.get('/song/:id/edit', async (req, res) => {
  const artists = await db.query('SELECT * FROM artists');
  const song = await db.query('SELECT name, rating, publish_year, songs_id, artists_id, song.id FROM song INNER JOIN artists_song ON song.id = artists_song.songs_id WHERE song.id = $1', [req.params.id]);

  for (let i = 0; i < artists.rows.length; i += 1) {
    if (artists.rows[i].id === song.rows[0].artists_id) {
      artists.rows[i].selected = true;
    }
  }

  res.render('update', { artists: artists.rows, song: song.rows[0] });
});

// process the edit form
router.post('/song/:id/edit', async (req, res) => {
  const errors = [];

  if (!(req.body.artist_id && req.body.rating && req.body.songName && req.body.release)) {
    errors.push('All fields are required.');
  }

  if (!errors.length) {
    const result = await db.query('UPDATE song SET name = $1, rating = $2, publish_year = $3 WHERE id = $4',
      [req.body.songName,
        req.body.rating,
        req.body.release,
        req.params.id]);
    const artist = await db.query('UPDATE artists_song SET artists_id = $1 WHERE songs_id = $2', [req.body.artist_id, req.params.id]);
    res.render('update', { result: result.rows[0], artist: artist.rows[0] });


    res.redirect('/');
  } else {
    const selectQuery = 'SELECT artist_name, rating, name, song.id, publish_year FROM artists INNER JOIN artists_song ON artists.id = artists_song.artists_id INNER JOIN song ON song.id = artists_song.songs_id';
    const result = await db.query(selectQuery);

    res.render('update', { errors, artists: result.rows });
  }
});

// get the delete form
router.get('/song/:id/delete', async (req, res) => {
  res.render('delete');
});

// process the delete form
router.post('/song/:id/delete', async (req, res) => {
  const query = 'DELETE FROM artists_song WHERE songs_id = $1';
  const query2 = 'DELETE FROM song WHERE id = $1';
  await db.query(query, [req.params.id]);
  await db.query(query2, [req.params.id]);
  res.redirect('/');
});

// upload photo router
// router.post('/upload', upload.single('file'), (req, res) => {
//   // other code here


//   res.send('Complete!<a class="btn btn-warning" href="/" role="button">Back Home</a>');
// });
router.post('/song/:id/upload', upload.single('file'), async (req, res) => {
  const query = 'UPDATE song SET file = $1 WHERE id = $2';
  await db.query(query, [req.file.originalname, req.params.id]);
  res.redirect('/song/' + req.params.id);
});


// get the add-singer form
router.get('/newsinger', async (req, res) => {
  res.render('newsinger');
});

// process the new singer router
router.post('/newsinger', async (req, res) => {
  const errors = [];

  if (!(req.body.singerName && req.body.singerStory)) {
    errors.push('All fields are required.');
  }

  if (!errors.length) {
    const insertQuery = 'INSERT INTO artists (artist_name, artist_story) VALUES ($1, $2)';


    const parameter = [req.body.singerName, req.body.singerStory];

    await db.query(insertQuery, parameter);


    res.redirect('/singer');
  } else {
    const selectQuery = 'SELECT * FROM artists';
    await db.query(selectQuery);

    res.render('newsinger', { errors });
  }
});

// view the singer page
router.get('/singer', async (req, res) => {
  let query = 'SELECT * FROM artists';
  const parameter = [];
  let artistNameAsc = '';

  if (req.query.sort === 'artistName' && req.query.order === 'asc') {
    query += ' ORDER BY artist_name';
  } else if (req.query.sort === 'artistName' && req.query.order === 'desc') {
    query += ' ORDER BY artist_name DESC';
    artistNameAsc = true;
  }

  const result = await db.query(query, parameter);
  res.render('singer', {
    rows: result.rows,
    fields: result.fields,
    query,
    parameter,
    artistNameAsc,
  });
});

// get the singer update form
router.get('/singer/:id/edit', async (req, res) => {
  const query = 'SELECT * FROM artists WHERE id = $1';
  const parameter = [req.params.id];
  const artists = await db.query(query, parameter);
  res.render('editsinger', { query, parameter, artists: artists.rows[0] });
});

// process the singer update router
router.post('/singer/:id/edit', async (req, res) => {
  const query = 'UPDATE artists SET artist_name = $1, artist_story = $2 WHERE id = $3';
  const parameter = [req.body.singerName, req.body.singerStory, req.params.id];
  await db.query(query, parameter);
  res.redirect('/singer');
});

// get the delete singer form
router.get('/singer/:id/delete', async (req, res) => {
  const result = await db.query('SELECT * FROM artists_song WHERE artists_song.artists_id = $1', [req.params.id]);
  if (result.rows.length > 0) {
    res.render('cant-delete');
  } else if (result.rows.length === 0) {
    res.render('deletesinger');
  }
});

// process the delete singer form
router.post('/singer/:id/delete', async (req, res) => {
  const query = 'DELETE FROM artists WHERE id = $1';

  await db.query(query, [req.params.id]);

  res.redirect('/singer');
});
module.exports = router;
