const PREFIX = '/notes';

const req = (url, options = {}) => {
  const { body } = options;
  return fetch((PREFIX + url).replace(/\/\/$/, ""), {
    ...options,
    body: body ? JSON.stringify(body) : null,
    headers: {
      ...options.headers,
      ...(body ? { 'Content-Type': 'application/json' } : null),
    },
  }).then((res) =>
    res.ok
      ? res.json()
      : res.text().then((message) => {
          throw new Error(message);
        })
  );
};

export const getNotes = ({ age, search, page = 1 }) => {
  const params = new URLSearchParams({ age, search, page });
  return req(`?${params}`);
};

export const createNote = (title, text) => {
  return req('/', {
    method: 'POST',
    body: { title, text }
  });
};

export const getNote = (id) => {
  return req(`/${id}`);
};

export const archiveNote = (id) => {
  return req(`/${id}/archive`, { method: 'PATCH' }); // ✅ PATCH
};

export const unarchiveNote = (id) => {
  return req(`/${id}/unarchive`, { method: 'PATCH' }); // ✅ PATCH
};

export const editNote = (id, title, text) => {
  return req(`/${id}`, {
    method: 'PUT',
    body: { title, text }
  });
};

export const deleteNote = (id) => {
  return req(`/${id}`, { method: 'DELETE' });
};

export const deleteAllArchived = () => {
  return req('/archived', { method: 'DELETE' });
};

export const notePdfUrl = (id) => {
  return `${PREFIX}/${id}/pdf`;
};