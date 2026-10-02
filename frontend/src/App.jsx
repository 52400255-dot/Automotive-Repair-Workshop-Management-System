import { AuthProvider } from './context/AuthProvider';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
