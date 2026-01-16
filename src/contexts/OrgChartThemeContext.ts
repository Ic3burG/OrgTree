import { createContext } from 'react';

// Theme context for providing current theme to all nodes
export const OrgChartThemeContext = createContext<string>('slate');
