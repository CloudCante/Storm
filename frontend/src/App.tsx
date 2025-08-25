import { MantineProvider, AppShell, Group, Button, Stack, Text } from "@mantine/core";
import { Canvas } from './components/Canvas';
import { useState, useEffect } from 'react';
import { TOOL_REGISTRY, type ToolId } from './config/tools';

function App() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [canvasEngine, setCanvasEngine] = useState<any>(null);
  const [currentTool, setCurrentTool] = useState<ToolId>('select');

  useEffect(() => {
    // Get the global CanvasEngine from WASM
    const CanvasEngine = (window as any).CanvasEngine;
    if (CanvasEngine) {
      const engine = new CanvasEngine();
      engine.init();
      setCanvasEngine(engine);
      console.log('WASM Canvas Engine Loaded');
    }
  }, []);

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  const handleToolChange = (tool: ToolId) => {
    setCurrentTool(tool);
    console.log('Tool changed to:', tool);
  };

  return (
    <MantineProvider defaultColorScheme={colorScheme}>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'sm' }}
        padding="md"
      >
        <AppShell.Header>
          <Group justify="space-between" h="100%" px="md">
            <Text size="xl" fw={700}>Storm</Text>
            <Button
              variant="subtle"
              onClick={toggleColorScheme}
              leftSection={colorScheme === 'dark' ? '☀️' : '🌙'}
            >
              {colorScheme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack gap="md">
            <Text size="lg" fw={600} mb="md">Tools</Text>

            {Object.values(TOOL_REGISTRY).map(tool => (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? 'filled' : 'subtle'}
                leftSection={tool.icon}
                onClick={() => handleToolChange(tool.id)}
              >
                {tool.name}
              </Button>
            ))}
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
          {canvasEngine ? (
            <Canvas
              canvasEngine={canvasEngine}
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f8f9fa',
              border: '2px dashed #666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text size="lg" c="dimmed">Loading Canvas Engine...</Text>
            </div>
          )}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;