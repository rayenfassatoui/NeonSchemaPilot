"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type CopySqlButtonProps = {
  content: string;
};

export function CopySqlButton({ content }: CopySqlButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy SQL preview", error);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="inline-flex items-center gap-2">
      {copied ? "Copied" : "Copy SQL"}
    </Button>
  );
}
