import 'dotenv/config';
import http from 'node:http';
import cron from 'node-cron';
import { MagicBricksCrawler } from './crawlers/magicbricks.crawler.js';
import { Acres99Crawler } from './crawlers/99acres.crawler.js';
import { HousingCrawler } from './crawlers/housing.crawler.js';
import { IngestionService } from './services/ingestion.service.js';

const ingestion = new IngestionService();
const crawlers = [new MagicBricksCrawler(), new Acres99Crawler(), new HousingCrawler()];
let lastRun: Record<string, unknown> = { status: 'IDLE' };

async function runCrawl(source: 'magicbricks' | 'all' = 'all') {
  const startedAt = new Date().toISOString();
  let found = 0;
  let imported = 0;
  let skipped = 0;
  const cities = (process.env.CITIES ?? 'Mumbai').split(',').map((c) => c.trim()).filter(Boolean);
  const enabled = source === 'magicbricks' ? crawlers.filter((c) => c.sourceName === 'MAGICBRICKS') : crawlers;
  lastRun = { status: 'RUNNING', startedAt };
  for (const city of cities) {
    for (const crawler of enabled) {
      const listings = await crawler.crawlCity(city);
      found += listings.length;
      for (const l of listings) {
        const ok = await ingestion.ingestListing(l);
        if (ok) imported += 1;
        else skipped += 1;
      }
    }
  }
  lastRun = {
    status: 'COMPLETED',
    startedAt,
    completedAt: new Date().toISOString(),
    listingsFound: found,
    listingsImported: imported,
    listingsSkipped: skipped,
  };
}

cron.schedule('0 2 * * *', () => {
  void runCrawl('all');
}, { timezone: 'Asia/Kolkata' });

const port = Number(process.env.CRAWLER_PORT ?? '8099');
http
  .createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/trigger') {
      void runCrawl('all');
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: true }));
      return;
    }
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(lastRun));
      return;
    }
    res.writeHead(404).end();
  })
  .listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Crawler service listening on :${port}`);
  });

