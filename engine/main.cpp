#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <vector>
#include <cmath>

// Define GridPoint FIRST, before any classes that use it
struct GridPoint {
    int x, y;
    GridPoint() : x(0), y(0) {}
    GridPoint(int x, int y) : x(x), y(y) {}
};

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
    GridPoint snapToGrid(double x, double y) {
        int gridX = round(x / gridSize) * gridSize;
        int gridY = round(y / gridSize) * gridSize;
        return GridPoint(gridX, gridY);
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

struct NotePad {
    int id;
    double x, y;
    std::string text;
    double width, height;

    // Default constructor required for Emscripten binding
    NotePad() : id(0), x(0), y(0), text(""), width(100), height(50) {}
    
    NotePad(int id, double x, double y, const std::string& text, double w = 100, double h = 50)
        :id(id), x(x), y(y), text(text), width(w), height(h) {}
};

// Canvas engine that manages the grid
class CanvasEngine {
private:
    GridSystem grid;
    std::vector<NotePad> notePads;
    int selectedNotePadId;
    bool isDragging;
    std::pair<double, double> dragOffset;
    
public:
    CanvasEngine() : selectedNotePadId(-1), isDragging(false), dragOffset({0, 0}) {}

    void init() {
        grid = GridSystem();
        grid.setGridSize(50);
    }

    void initWithScreenSize(int screenWidth, int screenHeight) {
        grid = GridSystem();
        grid.setGridSizeFromScreen(screenWidth, screenHeight);
    }
    
    // Snap coordinates to grid
    GridPoint snapToGrid(double x, double y) {
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

    int createNotePad(double x, double y, const std::string& text);
    void startDragNotePad(int notePadId, double mouseX, double mouseY);
    void updateDragNotePad(double mouseX, double mouseY);
    void endDragNotePad();
    std::vector<NotePad> getNotePads() const;
};

// Implementation of CanvasEngine methods
int CanvasEngine::createNotePad(double x, double y, const std::string& text) {
    // Generate a unique ID (simple increment for now)
    int newId = notePads.size() + 1;
    
    // Create the notepad
    NotePad newNotePad(newId, x, y, text);
    
    // Add it to our vector
    notePads.push_back(newNotePad);
    
    return newId;
}

void CanvasEngine::startDragNotePad(int notePadId, double mouseX, double mouseY) {
    // Find the notepad
    for (auto& notePad : notePads) {
        if (notePad.id == notePadId) {
            // Calculate offset from mouse to notepad corner
            dragOffset.first = mouseX - notePad.x;
            dragOffset.second = mouseY - notePad.y;
            
            selectedNotePadId = notePadId;
            isDragging = true;
            break;
        }
    }
}

void CanvasEngine::updateDragNotePad(double mouseX, double mouseY) {
    if (!isDragging || selectedNotePadId == -1) return;
    
    // Find and update the selected notepad position
    for (auto& notePad : notePads) {
        if (notePad.id == selectedNotePadId) {
            notePad.x = mouseX - dragOffset.first;
            notePad.y = mouseY - dragOffset.second;
            break;
        }
    }
}

void CanvasEngine::endDragNotePad() {
    if (isDragging && selectedNotePadId != -1) {
        // Snap the notepad to grid when released
        for (auto& notePad : notePads) {
            if (notePad.id == selectedNotePadId) {
                auto snapped = grid.snapToGrid(notePad.x + notePad.width/2, notePad.y + notePad.height/2);
                notePad.x = snapped.x - notePad.width/2;
                notePad.y = snapped.y - notePad.height/2;
                break;
            }
        }
    }
    
    // Reset drag state
    isDragging = false;
    selectedNotePadId = -1;
}

std::vector<NotePad> CanvasEngine::getNotePads() const {
    return notePads;
}

int main() {
    return 0;
}

// Export to JavaScript
EMSCRIPTEN_BINDINGS(canvas_module) {
    // Bind the NotePad struct so JavaScript can access its properties
    emscripten::value_object<NotePad>("NotePad")
        .field("id", &NotePad::id)
        .field("x", &NotePad::x)
        .field("y", &NotePad::y)
        .field("text", &NotePad::text)
        .field("width", &NotePad::width)
        .field("height", &NotePad::height);

    // Create a simple struct for grid coordinates instead of std::pair
    emscripten::value_object<GridPoint>("GridPoint")
        .field("x", &GridPoint::x)
        .field("y", &GridPoint::y);

    // Bind the CanvasEngine class
    emscripten::class_<CanvasEngine>("CanvasEngine")
        .constructor<>()
        .function("init", &CanvasEngine::init)
        .function("initWithScreenSize", &CanvasEngine::initWithScreenSize)
        .function("snapToGrid", &CanvasEngine::snapToGrid)
        .function("setGridSize", &CanvasEngine::setGridSize)
        .function("getGridSize", &CanvasEngine::getGridSize)
        .function("setZoom", &CanvasEngine::setZoom)
        .function("getZoom", &CanvasEngine::getZoom)
        // New notepad functions
        .function("createNotePad", &CanvasEngine::createNotePad)
        .function("startDragNotePad", &CanvasEngine::startDragNotePad)
        .function("updateDragNotePad", &CanvasEngine::updateDragNotePad)
        .function("endDragNotePad", &CanvasEngine::endDragNotePad)
        .function("getNotePads", &CanvasEngine::getNotePads);

    // Register std::vector<NotePad> for JavaScript
    emscripten::register_vector<NotePad>("NotePadVector");
}


//C:\projects\Storm\engine>emcc main.cpp -o canvas.js --bind -s WASM=1 -s ALLOW_MEMORY_GROWTH=1    Binding commands