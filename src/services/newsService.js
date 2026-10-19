const NewsAPI = require("newsapi");

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

async function fetchNews(category = "technology") {
  const response = await newsapi.v2.topHeadlines({
    category,
    language: "en",
    country: "us",
  });

  return response.articles;
}

module.exports = { fetchNews };
