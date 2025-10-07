const express = require('express');
const {
  getNotes,
  createNote,
  getNote,
  editNote,
  archiveNote,
  unarchiveNote,
  deleteAllArchived
} = require('../controllers/noteController');

const puppeteer = require('puppeteer-core');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/', requireAuth, getNotes);
router.post('/', requireAuth, createNote);
router.get('/:id', requireAuth, getNote);
router.put('/:id', requireAuth, editNote);

// Изменено с POST на PATCH
router.patch('/:id/archive', requireAuth, archiveNote);
router.patch('/:id/unarchive', requireAuth, unarchiveNote);

router.delete('/archived', requireAuth, deleteAllArchived);

// C3: PDF
router.get('/:id/pdf', requireAuth, async (req, res) => {
  const note = await require('../models/note').findById(req.params.id, req.session.userId);
  if (!note) return res.status(404).json({ error: 'Not found' });

  let browser;
  try {
    const executablePath = process.env.NODE_ENV === 'production'
      ? '/usr/bin/chromium-browser'
      : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/chromium-browser';

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(`
      <h1>${note.title}</h1>
      <div>${note.html}</div>
      <style>body { font-family: sans-serif; padding: 20px; }</style>
    `);
    const pdf = await page.pdf({ format: 'A4' });

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('PDF Error:', err.message);
    res.status(500).json({ error: 'Не удалось создать PDF' });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

module.exports = router;