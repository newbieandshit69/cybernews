import express from 'express';
import { generate } from './ai.js';
import * as parser from './parser.js';

const app = express();
const PORT = 9000;

app.set('view engine', 'ejs');

const rssUrls = [
  'https://krebsonsecurity.com/feed/',
  'https://feeds.feedburner.com/TheHackersNews'
];

const promptPrefix = `You are a summarization assistant. Summarize two news articles briefly in 3-5 sentences each, labeled "Article 1:" and "Article 2:". Use simple language, no extra commentary. Articles:\n`;

let summaries = [], total = 0, processed = 0, initialized = false;

const prepareSummaries = async () => {
  try {
    let articles = [];
    for (const url of rssUrls) {
      const { src, articles: fetched } = await parser.getNews(url);
      articles.push(...fetched.map(a => ({
        ...a,
        source: src,
        date: new Date(a.date || a.pubDate || 0)
      })));
    }

    articles.sort((a, b) => b.date - a.date);
    total = articles.length;
    initialized = true;

    for (let i = 0; i < articles.length; i += 2) {
      const pair = articles.slice(i, i + 2);
      const prompt = pair.reduce((txt, a, idx) => txt + `Article ${idx + 1}:\n${a.content}\n\n`, promptPrefix);
      const result = await generate(prompt);
      const parts = result.replace(/\*\*/g, '').split(/Article\s*\d:/i).map(s => s.trim()).filter(Boolean);

      pair.forEach((a, j) => {
        summaries.push({
          source: a.source,
          title: a.title,
          date: a.date,
          content: parts[j] || '[No summary available]'
        });
        processed++;
        console.log(`✅ ${processed}/${total}`);
      });
    }
    console.log('All articles summarized.');
  } catch (err) {
    console.error('Failed to summarize:', err);
    initialized = true;
  }
};

prepareSummaries();

app.get('/progress', (req, res) => res.json({ total, processed }));

app.get('/', (req, res) => {
  if (!initialized || processed < total) {
    res.render('loading', { total, done: processed });
  } else {
    res.render('index', { summaries });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));