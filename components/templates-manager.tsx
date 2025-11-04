"use client";

/**
 * Templates Manager Component
 * Interface for browsing and using query templates
 */

import { useState, useEffect } from "react";
import { Code, Search, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QueryTemplate, TemplateCategory } from "@/types/query-templates";
import { fillTemplate, searchTemplates } from "@/lib/template-utils";

interface TemplatesManagerProps {
  connectionString?: string;
}

export function TemplatesManager({ connectionString }: TemplatesManagerProps) {
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "ALL">("ALL");
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [filledQuery, setFilledQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const { filled } = fillTemplate(selectedTemplate.template, templateValues);
      setFilledQuery(filled);
    }
  }, [templateValues, selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to load templates");

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error("Error loading templates:", err);
    }
  };

  const openTemplate = (template: QueryTemplate) => {
    setSelectedTemplate(template);
    const initialValues: Record<string, string> = {};
    template.placeholders.forEach((p) => {
      initialValues[p.name] = p.defaultValue || "";
    });
    setTemplateValues(initialValues);
    setIsDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(filledQuery);
  };

  const filteredTemplates = searchQuery
    ? searchTemplates(templates, searchQuery)
    : selectedCategory === "ALL"
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  const categories: Array<TemplateCategory | "ALL"> = [
    "ALL",
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "JOIN",
    "AGGREGATE",
    "DDL",
    "ANALYTICS",
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openTemplate(template)}
          >
            <div className="flex items-start justify-between mb-2">
              <Code className="h-5 w-5 text-primary" />
              <Badge variant="outline">{template.category}</Badge>
            </div>
            <h3 className="font-semibold mb-1">{template.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {template.usageCount} uses
              </Badge>
              {template.tags?.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedTemplate.description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Parameters</h4>
                {selectedTemplate.placeholders.map((placeholder) => (
                  <div key={placeholder.name} className="space-y-2">
                    <Label>
                      {placeholder.name}
                      {placeholder.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Input
                      value={templateValues[placeholder.name] || ""}
                      onChange={(e) =>
                        setTemplateValues({ ...templateValues, [placeholder.name]: e.target.value })
                      }
                      placeholder={placeholder.defaultValue || placeholder.description}
                    />
                    {placeholder.description && (
                      <p className="text-xs text-muted-foreground">{placeholder.description}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated Query</Label>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={filledQuery}
                  readOnly
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              {selectedTemplate.example && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs font-semibold mb-1">Example:</p>
                  <code className="text-xs">{selectedTemplate.example}</code>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
