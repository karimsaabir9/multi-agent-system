import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Article = {
  title: string;
  link: string;
  summary: string;
  source?: string;
  imageUrl?: string;
};

type ArticlesCardProps = {
  articles: Article[];
};

const ArticleCard = ({ articles }: ArticlesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Articles ({articles.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-auto">
          {articles.map((article, i) => (
            <div key={i} className="border p-3 rounded flex gap-3">
              {article.imageUrl && (
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-20 h-20 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{article.title}</h4>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {article.summary}
                </p>
                {article.source && (
                  <span className="text-xs text-gray-500 mt-1 inline-block">
                    {article.source}
                  </span>
                )}
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Read more →
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleCard;
