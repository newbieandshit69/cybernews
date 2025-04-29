import express from 'express';
import { getSummary } from './ai.js';
import * as parser from './parser.js';

const app = express();
const PORT = 9000;
app.set('view engine', 'ejs');

// Array to store news articles
let newsCache = [];

// List of RSS feed URLs
const rssUrls = [
  'https://krebsonsecurity.com/feed/',
  'https://feeds.feedburner.com/TheHackersNews'
];

// Function to get all news articles
async function fetchAllNews() {
  let allNews = [];
  for (let i = 0; i < rssUrls.length; i++) {
    let url = rssUrls[i];
    try {
      // Get articles from RSS feed
      let scrapedData = await parser.getNews(url);
      console.log('Got ' + scrapedData.articles.length + ' articles from ' + url);
      
      // Summarize the articles
      let summaries = await getSummary({ articles: scrapedData.articles }, 2);
      
      // Loop through articles and make news objects
      for (let j = 0; j < scrapedData.articles.length; j++) {
        let article = scrapedData.articles[j];
        allNews.push({
          title: article.title,
          link: article.link,
          src: scrapedData.src,
          date: article.date,
          content: summaries[j] || '[Missing summary]'
        });
      }
    } catch (error) {
      console.log('Error with ' + url + ': ' + error.message);
    }
  }
  console.log('Total news articles: ' + allNews.length);
  return allNews;
}

// Function to refresh news, only get new articles
async function refreshNews() {
  let newNewsArticles = [];
  let cachedLinks = [];
  
  // Make list of links we already have
  for (let i = 0; i <
newsCache.length; i++) {
    cachedLinks.push(newsCache[i].link);
  }
  
  // Loop through RSS feeds
  for (let i = 0; i < rssUrls.length; i++) {
    let url = rssUrls[i];
    try {
      // Get articles from RSS feed
      let scrapedData = await parser.getNews(url);
      let newArticles = [];
      
      // Find new articles (not in cache)
      for (let j = 0; j < scrapedData.articles.length; j++) {
        let article = scrapedData.articles[j];
        if (!cachedLinks.includes(article.link)) {
          newArticles.push(article);
        }
      }
      
      console.log('Found ' + newArticles.length + ' new articles from ' + url);
      
      // Summarize new articles if any
      if (newArticles.length > 0) {
        let summaries = await getSummary({ articles: newArticles }, 2);
        for (let j = 0; j < newArticles.length; j++) {
          let article = newArticles[j];
          newNewsArticles.push({
            title: article.title,
            link: article.link,
            src: scrapedData.src,
            date: article.date,
            content: summaries[j] || '[Missing summary]'
          });
        }
      }
    } catch (error) {
      console.log('Error refreshing ' + url + ': ' + error.message);
    }
  }
  
  // Add new articles to cache
  newsCache = newsCache.concat(newNewsArticles);
  console.log('Cache now has ' + newsCache.length + ' articles');
}

// Route for the main page
app.get('/', (req, res) => {
  // Render page with no news (frontend will fetch it)
  res.render('index', { news: null });
});

// Route to get news data
app.get('/api/news', async (req, res) => {
  // If cache is empty, fetch news
  if (newsCache.length === 0) {
    newsCache = await fetchAllNews();
    if (newsCache.length === 0) {
      console.log('No news fetched!');
      res.status(500).json({ error: 'No news fetched' });
      return;
    }
  }
  // Send cached news
  res.json(newsCache);
});

// Route to refresh news
app.get('/refresh', async (req, res) => {
  await refreshNews();
  res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});