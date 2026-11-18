'use strict';
const express = require('express');
const metaAds = require('../services/metaAds');

const router = express.Router();

/** Stan kampanii Meta. `?odswiez=1` pomija 10-minutową pamięć podręczną. */
router.get('/', async (req, res) => {
  try {
    res.json(await metaAds.pobierz({ odswiez: req.query.odswiez === '1' }));
  } catch (err) {
    res.status(502).json({ error: `Nie udało się pobrać danych z Meta: ${err.message}` });
  }
});

module.exports = router;
