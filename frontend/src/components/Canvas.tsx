import { useRef, useEffect, useState } from 'react';

interface CanvasProps {
  canvasEngine: any; // Your WASM CanvasEngine
  currentTool: 'draw' | 'notepad';
}

interface NotePad {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
}

export function Canvas({ canvasEngine, currentTool }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [notePads, setNotePads] = useState<NotePad[]>([]);
  const [selectedNotePad, setSelectedNotePad] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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

    // Add global mouse up listener for dragging
    const handleGlobalMouseUp = () => {
      if (isDragging && selectedNotePad && canvasEngine) {
        const currentNotePad = notePads.find(np => np.id === selectedNotePad);
        if (currentNotePad) {
          // Snap the notepad to the grid when released
          const snapped = canvasEngine.snapToGrid(currentNotePad.x + currentNotePad.width/2, currentNotePad.y + currentNotePad.height/2);
          
          setNotePads(prev => 
            prev.map(np => 
              np.id === selectedNotePad 
                ? { ...np, x: snapped.x - currentNotePad.width/2, y: snapped.y - currentNotePad.height/2 }
                : np
            )
          );
        }
      }
      
      setIsDragging(false);
      setSelectedNotePad(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [canvasEngine]); // Remove the problematic dependencies

  // Redraw canvas when notePads or drawingLines change
  useEffect(() => {
    if (canvasRef.current) {
      redrawCanvas();
    }
  }, [notePads, drawingLines]);

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
    // Check if clicking on an existing notepad for dragging FIRST (before tool logic)
    const clickedNotePad = notePads.find(notePad => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return false;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const isClickingOnNotePad = mouseX >= notePad.x && 
             mouseX <= notePad.x + notePad.width &&
             mouseY >= notePad.y && 
             mouseY <= notePad.y + notePad.height;
      
      console.log('Checking notepad:', notePad.id, {
        mouseX, mouseY,
        notePadX: notePad.x,
        notePadY: notePad.y,
        notePadWidth: notePad.width,
        notePadHeight: notePad.height,
        isClickingOnNotePad
      });
      
      return isClickingOnNotePad;
    });

    if (clickedNotePad) {
      console.log('Starting to drag notepad:', clickedNotePad.id);
      // Start dragging this notepad (regardless of current tool)
      setSelectedNotePad(clickedNotePad.id);
      setIsDragging(true);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const offsetX = e.clientX - rect.left - clickedNotePad.x;
        const offsetY = e.clientY - rect.top - clickedNotePad.y;
        setDragOffset({ x: offsetX, y: offsetY });
        console.log('Drag offset set:', { offsetX, offsetY });
      }
      return;
    }

    console.log('No notepad clicked, current tool:', currentTool);

    if (currentTool === 'notepad') {
      // Place a new notepad
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newNotePad: NotePad = {
        id: Date.now().toString(),
        x: x, // Don't center offset - place exactly where clicked
        y: y,
        text: 'Click to edit...',
        width: 100,
        height: 50
      };

      setNotePads(prev => [...prev, newNotePad]);
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
    // Handle notepad dragging (regardless of current tool)
    if (isDragging && selectedNotePad) {
      console.log('Dragging notepad:', selectedNotePad);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      console.log('New position:', { newX, newY });

      setNotePads(prev => 
        prev.map(np => 
          np.id === selectedNotePad 
            ? { ...np, x: newX, y: newY }
            : np
        )
      );
      return;
    }

    if (currentTool === 'notepad') return;

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
    // Handle notepad drag end with grid snapping
    if (isDragging && selectedNotePad && canvasEngine) {
      const notePad = notePads.find(np => np.id === selectedNotePad);
      if (notePad) {
        // Snap the notepad to the grid when released
        const snapped = canvasEngine.snapToGrid(notePad.x + notePad.width/2, notePad.y + notePad.height/2);
        
        setNotePads(prev => 
          prev.map(np => 
            np.id === selectedNotePad 
              ? { ...np, x: snapped.x - notePad.width/2, y: snapped.y - notePad.height/2 }
              : np
          )
        );
      }
    }

    setIsDrawing(false);
    setIsDragging(false);
    setSelectedNotePad(null);
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
          cursor: isDragging ? 'move' : (currentTool === 'notepad' ? 'crosshair' : 'crosshair'),
          backgroundColor: '#1a1a1a',
          display: 'block'
        }}
      />
      
      {/* Interactive notepads */}
      {notePads.map(notePad => (
        <textarea
          key={notePad.id}
          value={notePad.text}
          onChange={(e) => {
            setNotePads(prev => 
              prev.map(np => 
                np.id === notePad.id 
                  ? { ...np, text: e.target.value }
                  : np
              )
            );
          }}
          onMouseDown={(e) => {
            // Start drag immediately but track if it's actually a drag
            setSelectedNotePad(notePad.id);
            setIsDragging(true);
            
            // Get the canvas coordinates for consistent positioning
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              const offsetX = e.clientX - canvasRect.left - notePad.x;
              const offsetY = e.clientY - canvasRect.top - notePad.y;
              setDragOffset({ x: offsetX, y: offsetY });
            }
            
            console.log('Starting to drag notepad:', notePad.id);
          }}
          onMouseMove={(e) => {
            // Handle notepad dragging
            if (isDragging && selectedNotePad === notePad.id) {
              e.preventDefault();
              
              // Use canvas coordinates for consistent positioning
              const canvasRect = canvasRef.current?.getBoundingClientRect();
              if (canvasRect) {
                const newX = e.clientX - canvasRect.left - dragOffset.x;
                const newY = e.clientY - canvasRect.top - dragOffset.y;
                
                // Add bounds checking to prevent going off-screen
                const boundedX = Math.max(0, Math.min(newX, canvasRect.width - notePad.width));
                const boundedY = Math.max(0, Math.min(newY, canvasRect.height - notePad.height));
                
                setNotePads(prev => 
                  prev.map(np => 
                    np.id === notePad.id 
                      ? { ...np, x: boundedX, y: boundedY }
                      : np
                  )
                );
              }
            }
          }}
          onMouseUp={(e) => {
            // Check if we actually moved the notepad (drag vs click)
            if (isDragging && selectedNotePad === notePad.id) {
              const currentNotePad = notePads.find(np => np.id === notePad.id);
              if (currentNotePad) {
                // If the notepad didn't move much, treat it as a click to edit
                const movedDistance = Math.sqrt(
                  Math.pow(currentNotePad.x - (e.clientX - (canvasRef.current?.getBoundingClientRect()?.left || 0) - dragOffset.x), 2) +
                  Math.pow(currentNotePad.y - (e.clientY - (canvasRef.current?.getBoundingClientRect()?.top || 0) - dragOffset.y), 2)
                );
                
                if (movedDistance < 5) {
                  // It was just a click, not a drag - allow text editing
                  setIsDragging(false);
                  setSelectedNotePad(null);
                  return;
                }
              }
            }
            
            // It was a drag, so snap to grid
            e.preventDefault();
          }}
          style={{
            position: 'absolute',
            left: notePad.x,
            top: notePad.y,
            width: notePad.width,
            height: notePad.height,
            backgroundColor: '#ffffcc',
            border: '2px solid #666',
            borderRadius: '4px',
            padding: '5px',
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            resize: 'none',
            zIndex: 10,
            cursor: isDragging && selectedNotePad === notePad.id ? 'move' : 'text'
          }}
        />
      ))}
      
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