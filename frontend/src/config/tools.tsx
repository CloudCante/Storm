import { IconPointer, IconNote } from '@tabler/icons-react';

export interface ToolDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  cursor: string;
  behavior: 'create' | 'select' | 'manipulate';
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  select: {
    id: 'select',
    name: 'Select',
    icon: <IconPointer size={16} />,
    cursor: 'default',
    behavior: 'select'
  },
  notepad: {
    id: 'notepad',
    name: 'Note Pad',
    icon: <IconNote size={16} />,
    cursor: 'crosshair',
    behavior: 'create'
  }
};

export type ToolId = keyof typeof TOOL_REGISTRY;