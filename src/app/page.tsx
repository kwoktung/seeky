"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle2, XCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface DomainResult {
  domain: string;
  available: boolean | null;
  checking: boolean;
  error?: string;
}

export default function Home() {
  const [description, setDescription] = useState("");
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);

  // Reset excluded domains and results when description changes
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (value !== description) {
      setExcludedDomains([]);
      setResults([]);
    }
  };

  const handleSearch = async () => {
    if (!description.trim()) return;

    setLoading(true);

    try {
      // Step 1: Get AI-generated domain suggestions
      const suggestResponse = await fetch("/api/domain-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          limit,
          exclude: excludedDomains,
        }),
      });

      const suggestData = (await suggestResponse.json()) as {
        success: boolean;
        error?: string;
        data?: { suggestions: { domain: string }[] };
      };

      if (!suggestData.success) {
        throw new Error(suggestData.error || "Failed to generate suggestions");
      }

      const suggestions = suggestData.data?.suggestions || [];

      // Initialize results with checking state
      const initialResults: DomainResult[] = suggestions.map(
        (s: { domain: string }) => ({
          domain: s.domain,
          available: null,
          checking: true,
        }),
      );
      setResults((prev) => [...prev, ...initialResults]);

      // Add new domains to excluded list
      const newDomains = suggestions.map((s: { domain: string }) => s.domain);
      setExcludedDomains((prev) => [...prev, ...newDomains]);

      setLoading(false);

      // Step 2: Batch check domain availability via WHOIS
      const domains = suggestions.map((s: { domain: string }) => s.domain);

      const bulkResponse = await fetch("/api/domain-lookup/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domains,
        }),
      });

      const bulkData = (await bulkResponse.json()) as {
        success: boolean;
        results?: Array<{
          domain: string;
          success: boolean;
          data?: unknown;
          error?: string;
        }>;
      };

      if (!bulkData.success || !bulkData.results) {
        throw new Error("Failed to check domain availability");
      }

      // Update results with availability information
      setResults((prev) =>
        prev.map((result) => {
          const whoisResult = bulkData.results?.find(
            (r) => r.domain === result.domain,
          );
          if (whoisResult) {
            return {
              ...result,
              checking: false,
              available: !whoisResult.success, // If WHOIS returns data, domain is taken
              error: whoisResult.error,
            };
          }
          return result;
        }),
      );
    } catch (error) {
      console.error("Search failed:", error);
      setLoading(false);
      alert(
        error instanceof Error ? error.message : "Failed to search domains",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <Globe className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
              Domain Finder
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            AI-powered domain name suggestions with instant availability checks
          </p>
        </div>

        {/* Search Form */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Find Your Perfect Domain</CardTitle>
            <CardDescription>
              Describe your project or business idea, and we&apos;ll suggest
              available domain names
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">What&apos;s your idea?</Label>
              <Textarea
                id="description"
                placeholder="e.g., a social network for developers, an AI-powered fitness app..."
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                disabled={loading}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Number of suggestions (1-20)</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="20"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !description.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Suggestions...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Domains
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Domain Suggestions</CardTitle>
              <CardDescription>
                {results.filter((r) => r.available === true).length} available •{" "}
                {results.filter((r) => r.available === false).length} taken •{" "}
                {results.filter((r) => r.checking).length} checking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {result.checking ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                      ) : result.available === true ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : result.available === false ? (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="font-mono font-medium text-sm sm:text-base break-all">
                        {result.domain}
                      </span>
                    </div>
                    <div className="ml-2">
                      {result.checking ? (
                        <Badge variant="secondary">Checking...</Badge>
                      ) : result.available === true ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          Available
                        </Badge>
                      ) : result.available === false ? (
                        <Badge variant="destructive">Taken</Badge>
                      ) : (
                        <Badge variant="outline">Error</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={handleSearch}
                  disabled={loading || !description.trim()}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading More...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Load More Suggestions
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 pb-8">
          <p>Powered by Anthropic AI & WHOIS</p>
        </div>
      </div>
    </div>
  );
}
