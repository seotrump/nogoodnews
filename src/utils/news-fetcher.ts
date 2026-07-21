import Parser from 'rss-parser';

const parser = new Parser();

export async function fetchRandomNews(existingUrls: string[] = [], locale: string = 'ko') {
  try {
    let rssFeeds = [];
    if (locale === 'ko') {
      rssFeeds = [
        'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'
      ];
    } else {
      rssFeeds = [
        'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', // US
        'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en', // UK
        'https://news.google.com/rss?hl=en-CA&gl=CA&ceid=CA:en', // Canada
        'https://news.google.com/rss?hl=en-AU&gl=AU&ceid=AU:en', // Australia
        'https://news.google.com/rss?hl=en-PH&gl=PH&ceid=PH:en'  // Philippines
      ];
    }
    const randomFeed = rssFeeds[Math.floor(Math.random() * rssFeeds.length)];

    const feed = await parser.parseURL(randomFeed);
    
    if (!feed.items || feed.items.length === 0) {
      throw new Error('No news items found');
    }

    // Filter out items whose link is already in existingUrls
    const freshItems = feed.items.filter(item => item.link && !existingUrls.includes(item.link));

    if (freshItems.length === 0) {
      throw new Error('No fresh news items found (all duplicates).');
    }

    // Pick a random recent news item from the top 15 fresh items
    const topItems = freshItems.slice(0, 15);
    const randomItem = topItems[Math.floor(Math.random() * topItems.length)];

    return {
      title: randomItem.title || '',
      link: randomItem.link || '',
      contentSnippet: randomItem.contentSnippet || randomItem.content || ''
    };
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return null;
  }
}
