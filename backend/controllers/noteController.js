// backend/controllers/noteController.js
const { client } = require('../../database');
const markdown = require('markdown-it')();

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addHighlights(title, search) {
  if (!search || !title) return title;
  const escaped = escapeRegExp(search);
  const regex = new RegExp(`(${escaped})`, 'gi');
  return title.replace(regex, '<mark>$1</mark>');
}

exports.getNotes = async (req, res) => {
  const { age = '1week', search = '', page = 1 } = req.query;
  const userId = req.session.userId;

  let archived = false;
  let period = null;

  switch (age) {
    case 'archive':
      archived = true;
      break;
    case '1month':
      period = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      period = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'alltime':
      period = null;
      break;
    default:
      period = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // неделя
  }

  const pageNum = parseInt(page) || 1;
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  let query = `
    SELECT *,
           COUNT(*) OVER() AS total_count
    FROM notes
    WHERE user_id = $1 AND is_archived = $2
  `;
  const params = [userId, archived];

  if (period) {
    query += ` AND created_at >= $${params.length + 1}`;
    params.push(period);
  }

  if (search.trim()) {
    query += ` AND title ILIKE $${params.length + 1}`;
    params.push(`%${search.trim()}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  try {
    const result = await client.query(query, params);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.json({ data: [], hasMore: false });
    }

    const totalCount = parseInt(rows[0].total_count, 10);
    const hasMore = offset + limit < totalCount;

    const notes = rows.map(n => ({
      _id: n.id,
      title: n.title,
      text: n.content,
      html: markdown.render(n.content),
      created: n.created_at,
      isArchived: n.is_archived,
      highlights: addHighlights(n.title, search)
    }));

    res.json({ data: notes, hasMore });
  } catch (err) {
    console.error('❌ DB Query Error:', err.message);
    res.status(500).json({ error: 'Не удалось получить заметки' });
  }
};

exports.createNote = async (req, res) => {
  const { title = '', text = '' } = req.body;
  try {
    const result = await client.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING id, title, content, created_at',
      [req.session.userId, title, text]
    );
    const note = result.rows[0];
    res.json({
      _id: note.id,
      title: note.title,
      text: note.content
    });
  } catch (err) {
    console.error('❌ Create Note Error:', err.message);
    res.status(500).json({ error: 'Не удалось создать заметку' });
  }
};

exports.getNote = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [id, req.session.userId]
    );
    const n = result.rows[0];
    if (!n) return res.status(404).json({ error: 'Заметка не найдена' });

    res.json({
      _id: n.id,
      title: n.title,
      text: n.content,
      html: markdown.render(n.content),
      created: n.created_at,
      isArchived: n.is_archived
    });
  } catch (err) {
    console.error('❌ Get Note Error:', err.message);
    res.status(500).json({ error: 'Ошибка при получении заметки' });
  }
};

exports.editNote = async (req, res) => {
  const { id } = req.params;
  const { title, text } = req.body;
  try {
    const result = await client.query(
      'UPDATE notes SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, title, content',
      [title, text, id, req.session.userId]
    );
    const note = result.rows[0];
    res.json({
      _id: note.id,
      title: note.title,
      text: note.content
    });
  } catch (err) {
    console.error('❌ Edit Note Error:', err.message);
    res.status(500).json({ error: 'Не удалось обновить заметку' });
  }
};

exports.archiveNote = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(
      'UPDATE notes SET is_archived = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.session.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Заметка не найдена' });
    res.json({ _id: result.rows[0].id });
  } catch (err) {
    console.error('❌ Archive Error:', err.message);
    res.status(500).json({ error: 'Не удалось заархивировать заметку' });
  }
};

exports.unarchiveNote = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(
      'UPDATE notes SET is_archived = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.session.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Заметка не найдена' });
    res.json({ _id: result.rows[0].id });
  } catch (err) {
    console.error('❌ Unarchive Error:', err.message);
    res.status(500).json({ error: 'Не удалось разархивировать заметку' });
  }
};

exports.deleteAllArchived = async (req, res) => {
  try {
    await client.query(
      'DELETE FROM notes WHERE user_id = $1 AND is_archived = true',
      [req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Delete Archived Error:', err.message);
    res.status(500).json({ error: 'Не удалось удалить архив' });
  }
};