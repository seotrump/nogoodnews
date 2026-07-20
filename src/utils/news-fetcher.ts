import Parser from 'rss-parser';

const parser = new Parser();

export async function fetchRandomNews(existingUrls: string[] = []) {
  try {
    // Google News Korea RSS
    const feed = await parser.parseURL('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko');
    
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
