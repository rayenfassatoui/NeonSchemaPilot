import { Button } from "@/components/ui/button";

type ZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-20 flex gap-2 rounded-full bg-background/90 p-1 shadow-lg shadow-black/10 backdrop-blur">
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onZoomOut} aria-label="Zoom out">
        −
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onReset} aria-label="Reset view">
        ○
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onZoomIn} aria-label="Zoom in">
        +
      </Button>
    </div>
  );
}
