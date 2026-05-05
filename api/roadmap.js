const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_DATABASE_ID;

const statusToCol = {
  'Suggested':   'suggested',
  'To Build':    'tobuild',
  'In Progress': 'inprogress',
  'Done':        'done'
};

const colToStatus = {
  'suggested':  'Suggested',
  'tobuild':    'To Build',
  'inprogress': 'In Progress',
  'done':       'Done'
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const response = await notion.databases.query({ database_id: DB_ID });
      const cards = response.results.map(page => {
        const props    = page.properties;
        const name     = props.Name?.title?.[0]?.plain_text || '';
        const desc     = props.Description?.rich_text?.[0]?.plain_text || '';
        const priority = (props.Priority?.select?.name || 'Medium').toLowerCase();
        const status   = props.Status?.select?.name || 'Suggested';
        const col      = statusToCol[status] || 'suggested';
        return { id: page.id, name, desc, priority, col };
      });
      return res.status(200).json(cards);
    }

    if (req.method === 'PATCH') {
      const { id, col } = req.body;
      const status = colToStatus[col];
      if (!id || !status) return res.status(400).json({ error: 'id and col required' });
      await notion.pages.update({
        page_id: id,
        properties: { Status: { select: { name: status } } }
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
