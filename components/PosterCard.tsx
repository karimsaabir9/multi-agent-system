"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Poster = {
  url: string;
  prompt: string;
};

type PostersCardProps = {
  posters: Poster[];
  title?: string;
};

const PosterCard = ({ posters, title }: PostersCardProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!posters || posters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Poster</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No poster generated yet</p>
        </CardContent>
      </Card>
    );
  }

  // Show only the first poster (should only be 1)
  const poster = posters[0];
  const isLongPrompt = poster.prompt.length > 150;
  const displayPrompt = expanded
    ? poster.prompt
    : poster.prompt.substring(0, 150);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Poster</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded border">
            <img
              src={poster.url}
              alt="Generated poster"
              className="w-full block"
            />
            {title && (
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                <h3 className="text-white text-2xl font-bold uppercase tracking-wide drop-shadow-md break-words">
                  {title}
                </h3>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Prompt:</strong>
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {displayPrompt}
              {isLongPrompt && !expanded && "..."}
            </p>
            {isLongPrompt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs"
              >
                {expanded ? "See Less" : "See More"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PosterCard;
