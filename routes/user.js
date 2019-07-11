const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('register', { title: 'Express' });
});

router.post('/register', async (req, res) => {
  const errors = [];

  if (req.body.password !== req.body.passwordConf) {
    errors.push('The provided passwords do not match.');
  }

  if (!(req.body.email && req.body.username && req.body.password && req.body.passwordConf)) {
    errors.push('All fields are required.');
  }

  const selectQuery = 'SELECT * FROM users WHERE username = $1';
  const selectResult = await db.query(selectQuery, [req.body.username]);
  console.log(selectResult);

  if (selectResult.rows.length > 0) {
    errors.push('That username is already taken.');
  }

  if (!errors.length) {
    const insertQuery = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)';
    const password = await bcrypt.hash(req.body.password, 10);
    await db.query(insertQuery, [req.body.username, req.body.email, password]);

    res.redirect('login');
  } else {
    res.render('register', { errors });
  }
});

router.get('/login', (req, res) => {
  res.render('login', { title: 'Express' });
});

router.post('/login', async (req, res) => {
  const errors = [];

  const selectQuery = 'SELECT * FROM users WHERE username = $1';
  const selectResult = await db.query(selectQuery, [req.body.username]);

  if (selectResult.rows.length === 1) {
    const auth = await bcrypt.compare(req.body.password, selectResult.rows[0].password);

    if (auth) {
      [req.session.user] = selectResult.rows;
      console.log(req.session.user);
      res.redirect('/');
    } else {
      errors.push('Incorrect username/password');
      res.render('login', { errors });
    }
  } else {
    errors.push('Incorrect username/password');
    res.render('login', { errors });
  }
});

router.get('/change-password', (req, res) => {
  res.render('change');
});

router.post('/change-password', async (req, res) => {
  const errors = [];

  if (req.body.password !== req.body.passwordConf) {
    errors.push('password must match');
  }

  if (errors.length) {
    res.render('change', { errors });
  } else {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    await db.query(query, [hashedPassword, req.session.user.id]);
    res.redirect('/users/logout');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
