import { GoogleGenAI } from "@google/genai";
import * as parser from './parser.js';
import dotenv from 'dotenv';
dotenv.config();

const APIKEY = process.env.geminikey


const ai = new GoogleGenAI({ apiKey: APIKEY });


export async function generate(content) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: content,
  });
  return response.text;
}

export async function getSummary(scraped, batchSize) {
  var summaries = [];

  const articles = scraped.articles;
  const articleContents = articles.map(article => article.content);
  for (let i = 0; i < articleContents.length; i += batchSize) {
    const batched = articleContents.slice(i, i + batchSize);
    console.log(`[i] Processing ${i + 1}/${articleContents.length} batch...`);

    const prompt = `You are a summarization assistant. Summarize each article below in 2-3 sentences. Format the output as plain text paragraphs, ensuring there is a single clear separation between each summary but no extra line breaks within each summary itself.
    Here are the articles:
    ${batched}`;

    let summary = '';
    let attempt = 1;

    while (true) {
      try {
        summary = await generate(prompt);
        break; // success — exit loop
      } catch (err) {
        console.warn(`[ERROR] Attempt ${attempt} failed. Retrying in 1.5s...`);
        attempt++;
        await new Promise(res => setTimeout(res, 1500));
      }
    }
    summaries.push(summary);
  }
  summaries = summaries.map(summary => summary.split('\n').filter(line => line.trim() !== '')).flat();
  return summaries;
}

// const scraped = await parser.getNews('https://feeds.feedburner.com/TheHackersNews');
// console.log(await getSummary(scraped, 2));