const { getConnection } = require('./db.js');

async function getLatestAnimals() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT animalID, name, species, breed, age, TO_CHAR(createdAt, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as createdAt
       FROM Animal
       ORDER BY createdAt DESC
       FETCH FIRST 10 ROWS ONLY`
    );
    const columns = result.metaData.map(col => col.name.toUpperCase());
    return (result.rows || []).map(row => {
      const obj = {};
      row.forEach((val, idx) => {
        obj[columns[idx]] = val;
      });
      return obj;
    });
  } finally {
    await connection.close();
  }
}

function formatPubDate(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) return dateVal.toUTCString();
  const d = new Date(dateVal);
  if (!isNaN(d)) return d.toUTCString();
  return '';
}

async function rssHandler(req, res) {
  const animals = await getLatestAnimals();
  res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
  res.end(`<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Adopții animale de companie</title>
  <link>http://localhost:3000/</link>
  <description>Ultimele anunțuri de adopție animale</description>
  ${animals.map(animal => `
    <item>
      <title>${animal.NAME} (${animal.SPECIES})</title>
      <link>http://localhost:3000/frontend/Animal/Animal.html?id=${animal.ANIMALID}</link>
      <description><![CDATA[
        Rasă: ${animal.BREED || 'N/A'}<br/>
        Vârstă: ${animal.AGE || 'N/A'}<br/>
      ]]></description>
      <pubDate>${formatPubDate(animal.CREATEDAT)}</pubDate>
    </item>
  `).join('')}
</channel>
</rss>`);
}

module.exports = { rssHandler };