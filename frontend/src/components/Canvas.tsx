import { useRef, useEffect, useState } from 'react';

interface CanvasProps {
  canvasEngine: any; // Your WASM CanvasEngine
  currentTool: 'draw' | 'notepad';
}

// Type for notepads returned from C++ engine
interface NotePad {
  id: number;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
}

// NotePad interface will be defined in C++ and exposed via WASM
// interface NotePad {
//   id: string;
//   x: number;
//   y: number;
//   text: string;
//   width: number;
//   height: number;
// }

export function Canvas({ canvasEngine, currentTool }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  // These will be managed by C++ engine instead
  // const [notePads, setNotePads] = useState<NotePad[]>([]);
  // const [selectedNotePad, setSelectedNotePad] = useState<string | null>(null);
  // const [isDragging, setIsDragging] = useState(false);
  // const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawingLines, setDrawingLines] = useState<Array<{fromX: number, fromY: number, toX: number, toY: number}>>([]);

  // Function to resize canvas to fill container
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get the container dimensions
    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    
    // Set canvas size to fill the container
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Redraw everything after resize
    redrawCanvas();
  };

  // Function to redraw the entire canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw all stored drawing lines
    drawingLines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.fromX, line.fromY);
      ctx.lineTo(line.toX, line.toY);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw notepads from C++ engine
    if (canvasEngine) {
      const notePads = canvasEngine.getNotePads();
      console.log('getNotePads returned:', notePads, 'type:', typeof notePads);
      
      // Handle Emscripten vector object
      if (notePads && typeof notePads === 'object') {
        // Get vector size
        let size = 0;
        if (typeof notePads.size === 'function') {
          size = notePads.size();
        } else if (notePads.size !== undefined) {
          size = notePads.size;
        } else {
          size = notePads.length || 0;
        }
        
        if (size > 0) {
          for (let i = 0; i < size; i++) {
            let notePad = null;
            try {
              if (typeof notePads.get === 'function') {
                notePad = notePads.get(i);
              } else if (notePads[i] !== undefined) {
                notePad = notePads[i];
              }
              
              if (notePad) {
                // Draw notepad background
                ctx.fillStyle = '#ffffcc';
                ctx.fillRect(notePad.x, notePad.y, notePad.width, notePad.height);
                
                // Draw notepad border
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.strokeRect(notePad.x, notePad.y, notePad.width, notePad.height);
                
                // Draw notepad text
                ctx.fillStyle = '#000';
                ctx.font = '12px Arial';
                ctx.fillText(notePad.text, notePad.x + 5, notePad.y + 20);
              }
            } catch (error) {
              console.error('Error accessing notepad at index', i, ':', error);
            }
          }
        }
      }
    }
  };

  // Function to draw on the canvas without clearing it
  const drawOnCanvas = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasEngine) return;

    // Test different grid sizes - let's try 25 pixels
    canvasEngine.setGridSize(25);
    console.log('Grid size set to:', canvasEngine.getGridSize());

    // Initial resize
    resizeCanvas();

    // Add resize listener
    window.addEventListener('resize', resizeCanvas);

    // Global mouse up listener will be handled by C++ engine
    // TODO: Implement notepad drag handling in C++

    // TODO: Add global mouse up listener for C++ notepad handling

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      // TODO: Remove global mouse up listener when implemented
    };
  }, [canvasEngine]); // Remove the problematic dependencies

  // Redraw canvas when drawingLines change
  useEffect(() => {
    if (canvasRef.current) {
      redrawCanvas();
    }
  }, [drawingLines]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!canvasEngine) return;

    const gridSize = canvasEngine.getGridSize();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentTool === 'notepad') {
      const canvas = canvasRef.current;
      if (!canvas || !canvasEngine) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // First, check if we're clicking on an existing notepad
      const notePads = canvasEngine.getNotePads();
      let clickedOnNotepad = false;
      
      if (notePads && typeof notePads === 'object' && notePads.size) {
        const size = notePads.size();
        for (let i = 0; i < size; i++) {
          try {
            const notePad = notePads.get(i);
            if (notePad && mouseX >= notePad.x && mouseX <= notePad.x + notePad.width &&
                mouseY >= notePad.y && mouseY <= notePad.y + notePad.height) {
              // Clicked on existing notepad - start dragging
              console.log('Clicked on existing notepad, starting drag');
              canvasEngine.startDragNotePad(notePad.id, mouseX, mouseY);
              clickedOnNotepad = true;
              break;
            }
          } catch (error) {
            console.error('Error checking notepad collision:', error);
          }
        }
      }

      // Only create new notepad if we didn't click on an existing one
      if (!clickedOnNotepad) {
        console.log('Creating new notepad at:', mouseX, mouseY);
        const notePadId = canvasEngine.createNotePad(mouseX, mouseY, "Click to edit...");
        console.log('Created notepad with ID:', notePadId);
      }
      
      // Force a redraw
      redrawCanvas();
      return;
    }

    // Original drawing logic
    if (!canvasEngine) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Snap to grid using your WASM engine!
    const snapped = canvasEngine.snapToGrid(x, y);
    console.log('Snapped to grid:', snapped);

    setIsDrawing(true);
    setLastPos({ x: snapped.x, y: snapped.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle notepad dragging via C++ engine
    if (canvasEngine && currentTool === 'notepad') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Only update drag position if we're already dragging
      // Don't start new drags on mouse move - only on mouse down
      canvasEngine.updateDragNotePad(mouseX, mouseY);
      
      // Redraw to show updated positions
      redrawCanvas();
      return;
    }

    if (!isDrawing || !canvasEngine) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Snap to grid while drawing
    const snapped = canvasEngine.snapToGrid(x, y);
    
    // Store the new line
    const newLine = { fromX: lastPos.x, fromY: lastPos.y, toX: snapped.x, toY: snapped.y };
    setDrawingLines(prev => [...prev, newLine]);

    // Redraw the canvas to show the new line
    redrawCanvas();

    setLastPos({ x: snapped.x, y: snapped.y });
  };

  const handleMouseUp = () => {
    // End notepad dragging via C++ engine
    if (canvasEngine && currentTool === 'notepad') {
      canvasEngine.endDragNotePad();
      redrawCanvas(); // Redraw to show final snapped position
    }
    
    setIsDrawing(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #666',
          cursor: currentTool === 'notepad' ? 'crosshair' : 'crosshair',
          backgroundColor: '#1a1a1a',
          display: 'block'
        }}
      />
      
      {/* Notepads will be rendered by C++ engine */}
      {/* TODO: Implement notepad rendering from C++ data */}
      
      {/* Tool indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 20
      }}>
        Current Tool: {currentTool === 'draw' ? 'Draw' : 'Notepad'}
      </div>
    </div>
  );
}