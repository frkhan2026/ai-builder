const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_DATABASE_ID;

const STATUS_TO_COL = {
  'Suggested':   'suggested',
  'To Build':    'tobuild',
  'In Progress': 'inprogress',
  'Done':        'done',
};

const COL_TO_STATUS = {
  suggested:  'Suggested',
  tobuild:    'To Build',
  inprogress: 'In Progress',
  done:       'Done',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const response = await notion.databases.query({ database_id: DB_ID });
      const cards = response.results.map(page => {
        const p = page.properties;
        return {
          id:       page.id,
          name:     p.Name?.title?.[0]?.plain_text        || '(untitled)',
          desc:     p.Description?.rich_text?.[0]?.plain_text || '',
          priority: (p.Priority?.select?.name || 'Medium').toLowerCase(),
          col:      STATUS_TO_COL[p.Status?.select?.name] || 'tobuild',
        };
      });
      return res.status(200).json(cards);
    } catch (err) {
      console.error('GET error', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, col } = req.body;
      const status = COL_TO_STATUS[col];
      if (!id || !status) return res.status(400).json({ error: 'id and col required' });
      await notion.pages.update({
        page_id: id,
        properties: { Status: { select: { name: status } } },
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('PATCH error', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
