import express from 'express';
import { getSummary } from './ai.js';
import * as parser from './parser.js';

const app = express();
const PORT = 9000;
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));


// Store news and feeds
let newsCache = [];
let rssUrls = [];

// Check RSS URL
async function isValidRssUrl(url) {
  try {
    let data = await parser.getNews(url);
    let isGood = data.articles && data.articles.length > 0;
    console.log(isGood ? 'Good feed: ' + url : 'No articles in ' + url);
    return isGood;
  } catch (error) {
    console.log('Bad feed ' + url + ': ' + error.message);
    return false;
  }
}

// Fetch all news
async function fetchAllNews() {
  let allNews = [];
  if (rssUrls.length == 0) {
    console.log('No feeds!');
    return allNews;
  }
  for (let i = 0; i < rssUrls.length; i++) {
    let url = rssUrls[i];
    try {
      let data = await parser.getNews(url);
      console.log('Got ' + data.articles.length + ' articles from ' + url);
      let summaries = await getSummary({ articles: data.articles }, 2);
      for (let j = 0; j < data.articles.length; j++) {
        allNews.push({
          title: data.articles[j].title,
          link: data.articles[j].link,
          src: data.src,
          date: data.articles[j].date,
          content: summaries[j] || '[No summary]'
        });
      }
    } catch (error) {
      console.log('Error with ' + url + ': ' + error.message);
    }
  }
  console.log('Total news: ' + allNews.length);
  return allNews;
}

// Refresh new news
async function refreshNews() {
  let newNews = [];
  let cachedLinks = [];
  for (let i = 0; i < newsCache.length; i++) {
    cachedLinks.push(newsCache[i].link);
  }
  for (let i = 0; i < rssUrls.length; i++) {
    let url = rssUrls[i];
    try {
      let data = await parser.getNews(url);
      let newArticles = [];
      for (let j = 0; j < data.articles.length; j++) {
        if (!cachedLinks.includes(data.articles[j].link)) {
          newArticles.push(data.articles[j]);
        }
      }
      console.log('New articles from ' + url + ': ' + newArticles.length);
      if (newArticles.length > 0) {
        let summaries = await getSummary({ articles: newArticles }, 2);
        for (let j = 0; j < newArticles.length; j++) {
          newNews.push({
            title: newArticles[j].title,
            link: newArticles[j].link,
            src: data.src,
            date: newArticles[j].date,
            content: summaries[j] || '[No summary]'
          });
        }
      }
    } catch (error) {
      console.log('Refresh error with ' + url + ': ' + error.message);
    }
  }
  newsCache = newsCache.concat(newNews);
  console.log('Cache size: ' + newsCache.length);
}

// Main page
app.get('/', (req, res) => {
  res.render('index', { news: null, rssUrls: rssUrls });
});

// News API
app.get('/api/news', async (req, res) => {
  if (newsCache.length == 0) {
    newsCache = await fetchAllNews();
    if (newsCache.length == 0 && rssUrls.length > 0) {
      console.log('No news!');
      res.status(500).send({ error: 'No news' });
      return;
    }
  }
  res.send(newsCache);
});

// Refresh news
app.get('/refresh', async (req, res) => {
  console.log('Refresh clicked!');
  await refreshNews();
  res.redirect('/');
});

// Add RSS feeds
app.post('/add-rss', async (req, res) => {
  let urlList = req.body.rssUrls;
  if (!urlList) {
    console.log('No URLs entered');
    res.redirect('/');
    return;
  }
  let urls = urlList.split('\n');
  for (let i = 0; i < urls.length; i++) {
    let url = urls[i].trim();
    if (url && (await isValidRssUrl(url)) && !rssUrls.includes(url)) {
      rssUrls.push(url);
      console.log('Added feed: ' + url);
    } else {
      console.log('Skipped invalid/dupe feed: ' + url);
    }
  }
  if (rssUrls.length > 0) {
    await refreshNews();
  }
  res.redirect('/');
});

// Delete RSS feed
app.post('/delete-rss', async (req, res) => {
  let urlToDelete = req.body.url;
  let index = rssUrls.indexOf(urlToDelete);
  if (index != -1) {
    rssUrls.splice(index, 1);
    console.log('Deleted feed: ' + urlToDelete);
    newsCache = []; // Clear cache
    newsCache = await fetchAllNews(); // Refetch from remaining feeds
  }
  res.redirect('/');
});


app.listen(PORT, () => {
  console.log('Server at http://localhost:' + PORT);
});