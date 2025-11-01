import { BrowserRouter } from 'react-router-dom';
import { AppThemeProvider } from './theme/muiTheme.jsx';
import AppRoutes from './routes.jsx';

const App = () => (
  <BrowserRouter>
    <AppThemeProvider>
      <AppRoutes />
    </AppThemeProvider>
  </BrowserRouter>
);

export default App;

