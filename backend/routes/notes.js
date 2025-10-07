// backend/routes/notes.js
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

const puppeteer = require('puppeteer');
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

router.patch('/:id/archive', requireAuth, archiveNote);
router.patch('/:id/unarchive', requireAuth, unarchiveNote);

router.delete('/archived', requireAuth, deleteAllArchived);

// C3: PDF
router.get('/:id/pdf', requireAuth, async (req, res) => {
  const note = await require('../models/note').findById(req.params.id, req.session.userId);
  if (!note) return res.status(404).send('<h1>Not Found</h1>');

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
    await browser.close();

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('PDF Error:', err.message);
    if (browser) await browser.close().catch(console.error);
    res.status(500).send('<h1>Ошибка при генерации PDF</h1>');
  }
});
router.get('/:id/pdf', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    // 1. Получить заметку
    const note = await require('../models/note').findById(id, userId);
    if (!note) {
      return res.status(404).json({ error: 'Заметка не найдена' });
    }

    // 2. Запустить Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH // для Vercel/Render
    });

    const page = await browser.newPage();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${note.title}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
              background: #fff;
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
            }
            pre {
              background: #f4f4f4;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
              font-family: 'Courier New', monospace;
            }
            code {
              font-family: 'Courier New', monospace;
              background: #eee;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 0.9em;
            }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 20px 0;
              padding: 15px 20px;
              background: #f9f9f9;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <h1>${note.title}</h1>
          <div>${note.html}</div>
          <footer style="margin-top: 40px; color: #777; font-size: 0.9em; text-align: center;">
            Экспортировано из SkillNotes • ${new Date().toLocaleDateString('ru-RU')}
          </footer>
        </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 3. Сгенерировать PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();

    // 4. Отправить PDF пользователю
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="note-${id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ PDF Generation Error:', err.message);
    res.status(500).json({ error: 'Не удалось создать PDF' });
  }
});

module.exports = router;