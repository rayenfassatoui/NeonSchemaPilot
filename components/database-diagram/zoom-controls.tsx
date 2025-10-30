import { Button } from "@/components/ui/button";

type ZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div 
      className="pointer-events-auto absolute right-4 top-4 z-50 flex gap-2 rounded-full bg-background/90 p-1 shadow-lg shadow-black/10 backdrop-blur"
      onPointerDown={(e) => {
        e.stopPropagation();
        console.log('ZoomControls container clicked');
      }}
    >
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-8 w-8" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Zoom out clicked');
          onZoomOut();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        aria-label="Zoom out"
      >
        −
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-8 w-8" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Reset clicked');
          onReset();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        aria-label="Reset view"
      >
        ○
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-8 w-8" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Zoom in clicked');
          onZoomIn();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        aria-label="Zoom in"
      >
        +
      </Button>
    </div>
  );
}
