const { fetchNews } = require("../services/newsService");

let getNews = async (req, res) => {
    try {
        const category = req.query.category || "technology";
        const articles = await fetchNews(category);

        return res.status(200).json({ news: articles });
    } catch (error) {
        console.error("News API error:", error.message);

        return res.status(502).json({
            message: "Unable to fetch news at the moment",
        });
    }
};


module.exports = { getNews };