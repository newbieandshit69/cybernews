import Parser from 'rss-parser';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';



// Site differcences so far: paragraph class (some have some don't)

export async function getNews(rssUrl, pClass) {
    const p = new Parser();
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 Chrome/123');

    const feed = await p.parseURL(rssUrl);

    // const todayItems = getTodayItems(feed.items, "pubDate");
    const todayItems = getItemsOfXDays(feed.items, "pubDate", 1);
    // item fields
    const sourceTitle = feed.title;



    const articles = [];

    for (let i = 0; i < todayItems.length; i++) {
        await page.goto(todayItems[i].guid);
        const content = await getParagraph(page, pClass);
        articles.push({
            title: todayItems[i].title,
            link: todayItems[i].link,
            date: todayItems[i].pubDate,
            content: content
        });
    }

    await browser.close();

    return {
        src: sourceTitle,
        articles: articles
    };
}

// console.log(await getNews('https://feeds.feedburner.com/TheHackersNews'));

// FUNCTIONS ========================

export function isToday(rssDate) {
    if (!rssDate) return false;

    const now = new Date();
    const date = new Date(rssDate);

    return now.getFullYear() === date.getFullYear() &&
           now.getMonth() === date.getMonth() &&
           now.getDate() === date.getDate();
}

export function isLastXDays(rssDate, days) {
    if (!rssDate) return false;

    const now = new Date();
    const pastDate = new Date(rssDate);

    const diffTime = now - pastDate; // milliseconds
    const diffDays = diffTime / (1000 * 60 * 60 * 24); // days

    return diffDays <= days;
}


export function getItemsOfXDays(items, dateTag, date){
    return items.filter(item => isLastXDays(item[dateTag], date));
}

export function getTodayItems(items, dateTag) {
    return items.filter(item => isToday(item[dateTag]));
}

export async function getParagraph(page, pClass) {
    const html = await page.content();
    const $ = cheerio.load(html);

    const selector = pClass ? `p.${pClass}` : 'p';

    return $(selector)
        .map((i, el) => $(el).text().trim())
        .get()
        .join(' ');
}

