import { useRef, useEffect, useState } from 'react';
import { canvasConfig } from '../config/canvas';
import { TOOL_REGISTRY, type ToolId } from '../config/tools';

interface CanvasProps {
  canvasEngine: any; // Your WASM CanvasEngine
  currentTool: ToolId;
  setCurrentTool: (tool: ToolId) => void;
}

export function Canvas({ canvasEngine, currentTool, setCurrentTool }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    ctx.fillStyle = canvasConfig.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw notepads from C++ engine
    if (canvasEngine) {
      const notePads = canvasEngine.getNotePads();

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

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasEngine]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!canvasEngine) return;

    const gridSize = canvasEngine.getGridSize();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Draw dots at grid intersections
    for (let x = 0; x <= width; x += gridSize) {
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
      }
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

        // Auto switch to select tool
        setCurrentTool('select');
      }

      // Force a redraw
      redrawCanvas();
      return;
    }

    // Selection mode logic - DRAG EXISTING NOTEPADS
    if (currentTool === 'select') {
      const canvas = canvasRef.current;
      if (!canvas || !canvasEngine) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if clicking on existing notepad to start dragging
      const notePads = canvasEngine.getNotePads();
      if (notePads && typeof notePads === 'object' && notePads.size) {
        const size = notePads.size();
        for (let i = 0; i < size; i++) {
          try {
            const notePad = notePads.get(i);
            if (notePad && mouseX >= notePad.x && mouseX <= notePad.x + notePad.width &&
              mouseY >= notePad.y && mouseY <= notePad.y + notePad.height) {
              // Clicked on existing notepad - start dragging
              console.log('Selection mode: Starting drag on notepad', notePad.id);
              canvasEngine.startDragNotePad(notePad.id, mouseX, mouseY);
              return;
            }
          } catch (error) {
            console.error('Error checking notepad collision:', error);
          }
        }
      }
      console.log('Selection mode: No notepad clicked');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle notepad dragging via C++ engine (both tools)
    if (canvasEngine && (currentTool === 'notepad' || currentTool === 'select')) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Update drag position if we're already dragging
      canvasEngine.updateDragNotePad(mouseX, mouseY);

      // Redraw to show updated positions
      redrawCanvas();
      return;
    }
  };

  const handleMouseUp = () => {
    // End notepad dragging via C++ engine (both tools)
    if (canvasEngine && (currentTool === 'notepad' || currentTool === 'select')) {
      canvasEngine.endDragNotePad();
      redrawCanvas(); // Redraw to show final snapped position
    }
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
          cursor: TOOL_REGISTRY[currentTool]?.cursor || 'default',
          backgroundColor: canvasConfig.background,
          display: 'block'
        }}
      />

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
        Current Tool: {TOOL_REGISTRY[currentTool]?.name || 'Unknown'}
      </div>
    </div>
  );
}