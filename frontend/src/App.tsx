import { MantineProvider, AppShell, Group, Button, Stack, Text } from "@mantine/core";
import { IconPalette, IconBrush, IconEraser, IconSettings, IconSun, IconMoon, IconNote } from '@tabler/icons-react';
import { Canvas } from './components/Canvas';
import { useState, useEffect } from 'react';

function App() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [canvasEngine, setCanvasEngine] = useState<any>(null);
  const [currentTool, setCurrentTool] = useState<'draw' | 'notepad'>('draw');

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

  const handleToolChange = (tool: 'draw' | 'notepad') => {
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
              leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            >
              {colorScheme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack gap="md">
            <Text size="lg" fw={600} mb="md">Tools</Text>

            <Button 
              variant={currentTool === 'draw' ? 'filled' : 'subtle'} 
              leftSection={<IconBrush size={16} />}
              onClick={() => handleToolChange('draw')}
            >
              Draw
            </Button>

            <Button 
              variant={currentTool === 'notepad' ? 'filled' : 'subtle'} 
              leftSection={<IconNote size={16} />}
              onClick={() => handleToolChange('notepad')}
            >
              Note Pad
            </Button>

            <Button variant="subtle" leftSection={<IconPalette size={16} />}>
              Color Picker
            </Button>

            <Button variant="subtle" leftSection={<IconEraser size={16} />}>
              Eraser
            </Button>

            <Button variant="subtle" leftSection={<IconSettings size={16} />}>
              Settings
            </Button>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
          {canvasEngine ? (
            <Canvas canvasEngine={canvasEngine} currentTool={currentTool} />
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