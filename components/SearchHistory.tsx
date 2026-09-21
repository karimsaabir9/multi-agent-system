import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type HistoryItem = {
  runId: string;
  input: string;
  status: "running" | "success" | "failed";
  createdAt: string;
};

type SearchHistoryProps = {
  items: HistoryItem[];
  selectedRunId?: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
};

const statusStyles: Record<HistoryItem["status"], string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  running: "bg-blue-100 text-blue-700",
};

const SearchHistory = ({ items, selectedRunId, onSelect, onDelete }: SearchHistoryProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Search History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-72 overflow-auto">
          {items.map((item) => (
            <div
              key={item.runId}
              className={`w-full flex items-center justify-between border rounded p-3 hover:bg-gray-50 transition-colors ${
                selectedRunId === item.runId ? "border-blue-400 bg-blue-50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item.runId)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium truncate">{item.input}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
              <span
                className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-3 ${statusStyles[item.status]}`}
              >
                {item.status}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this search from history?")) {
                    onDelete(item.runId);
                  }
                }}
                aria-label="Delete"
                className="ml-2 text-gray-400 hover:text-red-600 flex-shrink-0 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchHistory;
