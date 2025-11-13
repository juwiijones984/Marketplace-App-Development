import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Package, ShoppingBag, TrendingUp, Edit, Trash2, LogOut } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const supabase = getSupabaseClient();

export default function SellerDashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.log('No auth token available');
        toast.error('Authentication required');
        navigate('/auth');
        return;
      }

      // Fetch user profile to check role
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/users/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error checking access - HTTP status:', response.status);
        console.error('Error response:', errorText);
        toast.error('Failed to verify access');
        navigate('/');
        return;
      }

      const data = await response.json();
      
      if (!data.user) {
        console.error('User data missing in response');
        toast.error('Failed to load user profile');
        navigate('/');
        return;
      }

      setUserProfile(data.user);

      // Check if user is a seller
      if (data.user.role !== 'seller' && data.user.role !== 'admin') {
        toast.error('Access denied. Only sellers can view this page.');
        navigate('/');
        return;
      }

      // If authorized, fetch data
      fetchData();
    } catch (error) {
      console.error('Error checking access:', error);
      toast.error('Access denied');
      navigate('/');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Fetch listings
      const listingsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/seller/listings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const listingsData = await listingsResponse.json();
      setListings(listingsData.listings || []);

      // Fetch orders
      const ordersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/seller/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const ordersData = await ordersResponse.json();
      setOrders(ordersData.orders || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/listings/${listingId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete listing');
      }

      toast.success('Listing deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete listing');
      console.error('Error deleting listing:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      toast.success('Order updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update order');
      console.error('Error updating order:', error);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  const totalRevenue = orders
    .filter(o => o.status === 'delivered' || o.status === 'paid')
    .reduce((sum, o) => sum + o.total_cents, 0);

  const activeListings = listings.filter(l => l.status === 'published').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl">Seller Dashboard</h1>
            <div className="flex gap-2">
              <Link to="/">
                <Button variant="outline">Marketplace</Button>
              </Link>
              <Link to="/seller/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Listing
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Listings</p>
                  <p className="text-3xl">{activeListings}</p>
                </div>
                <Package className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending Orders</p>
                  <p className="text-3xl">{pendingOrders}</p>
                </div>
                <ShoppingBag className="w-12 h-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                  <p className="text-3xl">ZAR {(totalRevenue / 100).toFixed(2)}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Business</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="listings">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="listings">My Listings</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="listings" className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">You haven't created any listings yet</p>
                    <Link to="/seller/create">
                      <Button>Create Your First Listing</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listings.map((listing) => (
                      <div key={listing.id} className="border rounded-lg p-4 flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                          {listing.images?.[0]?.image_url ? (
                            <img
                              src={listing.images[0].image_url}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1">{listing.title}</h3>
                          <p className="text-orange-600 mb-2">
                            {formatPrice(listing.price_cents, listing.currency)}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant={listing.status === 'published' ? 'default' : 'secondary'}>
                              {listing.status}
                            </Badge>
                            <Badge variant="outline">
                              {listing.quantity} available
                            </Badge>
                            {listing.verified_flag && (
                              <Badge>✓ Verified</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/listing/${listing.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteListing(listing.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="orders" className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="mb-1">{order.listing?.title}</h3>
                            <p className="text-sm text-gray-500">
                              Order from {order.buyer?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-orange-600 mb-2">
                              {formatPrice(order.total_cents, 'ZAR')}
                            </p>
                            <Badge>{order.status}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, 'paid')}
                              >
                                Mark as Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                              >
                                Mark as Shipped
                              </Button>
                            </>
                          )}
                          {order.status === 'shipped' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            >
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}