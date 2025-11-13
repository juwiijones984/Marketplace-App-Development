import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from './utils/supabase/client';
import HomePage from './components/HomePage';
import ListingDetailPage from './components/ListingDetailPage';
import SellerDashboard from './components/SellerDashboard';
import CreateListing from './components/CreateListing';
import AuthPage from './components/AuthPage';
import BuyerOrders from './components/BuyerOrders';
import AdminDashboard from './components/AdminDashboard';
import { Toaster } from './components/ui/sonner';

const supabase = getSupabaseClient();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/auth" element={<AuthPage setUser={setUser} />} />
          <Route path="/listing/:id" element={<ListingDetailPage user={user} />} />
          <Route 
            path="/seller/dashboard" 
            element={user ? <SellerDashboard user={user} /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/seller/create" 
            element={user ? <CreateListing user={user} /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/orders" 
            element={user ? <BuyerOrders user={user} /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/admin" 
            element={user ? <AdminDashboard user={user} /> : <Navigate to="/auth" />} 
          />
          {/* Catch-all route for unmatched paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </>
  );
}