// Fetch trending AI projects from GitHub & Hacker News

const GITHUB_API = 'https://api.github.com/search/repositories';
const HN_API = 'https://hacker-news.firebaseio.com/v0';

export async function fetchTrendingProjects(excludeIds = []) {
  const results = [];

  // Try GitHub first
  try {
    const query = 'topic:artificial-intelligence+topic:machine-learning+topic:deep-learning+topic:llm+topic:generative-ai';
    const url = `${GITHUB_API}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (resp.ok) {
      const data = await resp.json();
      for (const item of data.items || []) {
        const id = `gh-${item.id}`;
        if (excludeIds.includes(id)) continue;
        results.push({
          id,
          name: item.full_name,
          description: item.description || 'An amazing AI project',
          url: item.html_url,
          stars: item.stargazers_count,
          language: item.language || 'Unknown',
          topics: item.topics || [],
        });
      }
    }
  } catch (e) {
    console.warn('GitHub API fetch failed:', e.message);
  }

  // Supplement with HN if not enough
  if (results.length < 10) {
    try {
      const searchUrl = `${HN_API}/search?query=AI&tags=story&hitsPerPage=15`;
      const resp = await fetch(`https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage=15`);
      if (resp.ok) {
        const data = await resp.json();
        for (const hit of data.hits || []) {
          const id = `hn-${hit.objectID}`;
          if (excludeIds.includes(id)) continue;
          if (hit.url) {
            results.push({
              id,
              name: hit.title.length > 60 ? hit.title.slice(0, 57) + '...' : hit.title,
              description: `HN Points: ${hit.points || 0} | Comments: ${hit.num_comments || 0}`,
              url: hit.url,
              stars: hit.points || 0,
              language: 'News',
              topics: [],
            });
          }
        }
      }
    } catch (e) {
      console.warn('HN API fetch failed:', e.message);
    }
  }

  return results;
}
