import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

type SearchInputProps = {
  input: string;
  limit: number;
  onInputChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onRun: () => void;
  isLoading: boolean;
};

const SearchInput = ({
  input,
  limit,
  onInputChange,
  onLimitChange,
  onRun,
  isLoading,
}: SearchInputProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Search News</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="E.g., latest AI news, sports updates, tech trends..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
          className="text-base"
        />

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            Results limit:
          </label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={isLoading}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value={1}>1 result</option>
            <option value={3}>3 results</option>
            <option value={4}>4 results</option>
            <option value={5}>5 results</option>
            <option value={6}>6 results</option>
            <option value={7}>7 results</option>
            <option value={8}>8 results</option>
            <option value={9}>9 results</option>
            <option value={10}>10 results</option>
          </select>
        </div>

        <Button
          onClick={onRun}
          disabled={isLoading || !input.trim()}
          className="w-full"
        >
          {isLoading ? "Running..." : "Run Agents"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SearchInput;
