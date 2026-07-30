import Parser from 'rss-parser';

const parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  }
});

// 시스템 분야 카테고리를 Google News RSS Topic 코드 매핑
const GOOGLE_NEWS_TOPICS: Record<string, string> = {
  politics: 'POLITICS',          // 정치
  economy: 'BUSINESS',           // 경제
  society: 'NATION',             // 사회/국내
  tech: 'TECHNOLOGY',            // IT/기술
  world: 'WORLD',                // 세계
  entertainment: 'ENTERTAINMENT',// 연예
  sports: 'SPORTS',              // 스포츠
  culture: 'SCIENCE',            // 생활/문화/과학
  opinion: 'MAIN',               // 오피니언 (메인 헤드라인)
};

export async function fetchRandomNews(existingUrls: string[] = [], locale: string = 'ko', category: string = 'all') {
  try {
    let rssUrl = '';
    const topicCode = GOOGLE_NEWS_TOPICS[category] || 'MAIN';

    if (locale === 'ko') {
      if (topicCode === 'MAIN') {
        rssUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
      } else {
        rssUrl = `https://news.google.com/rss/headlines/section/topic/${topicCode}?hl=ko&gl=KR&ceid=KR:ko`;
      }
    } else {
      const enDomains = [
        { gl: 'US', ceid: 'US:en' },
        { gl: 'GB', ceid: 'GB:en' },
        { gl: 'CA', ceid: 'CA:en' },
        { gl: 'AU', ceid: 'AU:en' }
      ];
      const selected = enDomains[Math.floor(Math.random() * enDomains.length)];

      if (topicCode === 'MAIN') {
        rssUrl = `https://news.google.com/rss?hl=en-${selected.gl}&gl=${selected.gl}&ceid=${selected.ceid}`;
      } else {
        rssUrl = `https://news.google.com/rss/headlines/section/topic/${topicCode}?hl=en-${selected.gl}&gl=${selected.gl}&ceid=${selected.ceid}`;
      }
    }

    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (err) {
      console.warn(`[NewsFetcher] ${category} (${topicCode}) 전용 RSS 수집 실패, 기본 메인 RSS로 우회합니다.`);
      const fallbackUrl = locale === 'ko' 
        ? 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'
        : 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
      feed = await parser.parseURL(fallbackUrl);
    }
    
    if (!feed.items || feed.items.length === 0) {
      throw new Error('No news items found');
    }

    // 이미 사용된 URL 제외
    const freshItems = feed.items.filter(item => item.link && !existingUrls.includes(item.link));

    if (freshItems.length === 0) {
      throw new Error('No fresh news items found (all duplicates).');
    }

    // 상위 15개 최신 기사 중 무작위 1개 추출
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
