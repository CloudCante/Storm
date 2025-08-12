#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <vector>
#include <cmath>

// Grid system for canvas
class GridSystem {
private:
    int gridSize;
    double zoom;
    
public:
    GridSystem() : gridSize(0), zoom(1.0) {}

    void setGridSizeFromScreen(int screenWidth, int screenHeight) {
        // Set grid size based on screen dimensions
        gridSize = std::max(screenWidth, screenHeight);
	}
    
    // Calculate snap point for grid
    std::pair<int, int> snapToGrid(double x, double y) {
        int gridX = round(x / gridSize) * gridSize;
        int gridY = round(y / gridSize) * gridSize;
        return {gridX, gridY};
    }
    
    // Set grid size
    void setGridSize(int size) { gridSize = size; }
    
    // Get grid size
    int getGridSize() const { return gridSize; }
    
    // Set zoom level
    void setZoom(double newZoom) { zoom = newZoom; }
    
    // Get zoom level
    double getZoom() const { return zoom; }
};

// Canvas engine that manages the grid
class CanvasEngine {
private:
    GridSystem grid;
    
public:
    CanvasEngine() {}

    void init() {
        grid = GridSystem();
        grid.setGridSize(50);
	}

    void initWithScreenSize(int screenWidth, int screenHeight) {
		grid = GridSystem();
        grid.setGridSizeFromScreen(screenWidth, screenHeight);
	}
    
    // Snap coordinates to grid
    std::pair<int, int> snapToGrid(double x, double y) {
        return grid.snapToGrid(x, y);
    }
    
    // Set grid size
    void setGridSize(int size) {
        grid.setGridSize(size);
    }
    
    // Get grid size
    int getGridSize() const {
        return grid.getGridSize();
    }
    
    // Set zoom level
    void setZoom(double zoom) {
        grid.setZoom(zoom);
    }
    
    // Get zoom level
    double getZoom() const {
        return grid.getZoom();
    }
};

int main() {
    return 0;
}

// Export to JavaScript
EMSCRIPTEN_BINDINGS(canvas_module) {
    emscripten::class_<CanvasEngine>("CanvasEngine")
        .constructor<>()
		.function("init", &CanvasEngine::init)
		.function("initWithScreenSize", &CanvasEngine::initWithScreenSize)
        .function("snapToGrid", &CanvasEngine::snapToGrid)
        .function("setGridSize", &CanvasEngine::setGridSize)
        .function("getGridSize", &CanvasEngine::getGridSize)
        .function("setZoom", &CanvasEngine::setZoom)
        .function("getZoom", &CanvasEngine::getZoom);
}