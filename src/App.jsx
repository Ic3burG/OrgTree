import { ReactFlowProvider } from 'reactflow';
import OrgMap from './components/OrgMap';

/**
 * App - Root component
 * Renders the organization map with React Flow provider
 */
function App() {
  return (
    <ReactFlowProvider>
      <OrgMap />
    </ReactFlowProvider>
  );
}

export default App;
