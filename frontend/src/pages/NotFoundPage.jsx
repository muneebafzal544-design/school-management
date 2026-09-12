import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-black text-slate-200 dark:text-slate-800 select-none">404</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mt-2">Page not found</h1>
        <p className="text-sm text-slate-400 dark:text-slate-600 mt-2 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    </div>
  );
}
