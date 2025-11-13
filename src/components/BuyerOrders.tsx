import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Star, LogOut } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const supabase = getSupabaseClient();

export default function BuyerOrders({ user }: { user: any }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/buyer/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
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
          body: JSON.stringify({ status: 'delivered' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      toast.success('Order confirmed as delivered');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
      console.error('Error updating order:', error);
    }
  };

  const handleSubmitReview = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_id: selectedOrder.id,
            rating,
            text: reviewText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      toast.success('Review submitted!');
      setReviewDialogOpen(false);
      setReviewText('');
      setRating(5);
    } catch (error) {
      toast.error('Failed to submit review');
      console.error('Error submitting review:', error);
    }
  };

  const formatPrice = (cents: number, currency: string = 'ZAR') => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to marketplace
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">You haven't placed any orders yet</p>
                <Link to="/">
                  <Button>Start Shopping</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                        {order.listing?.images?.[0]?.image_url ? (
                          <img
                            src={order.listing.images[0].image_url}
                            alt={order.listing?.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1">{order.listing?.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          Seller: {order.seller?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          Ordered: {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-4">
                          <p className="text-orange-600">
                            {formatPrice(order.total_cents)}
                          </p>
                          <Badge>{order.status}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'shipped' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmDelivery(order.id)}
                        >
                          Confirm Delivery
                        </Button>
                      )}
                      {order.status === 'delivered' && (
                        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Leave Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Your Purchase</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm mb-2 block">Rating</label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setRating(star)}
                                      className="focus:outline-none"
                                    >
                                      <Star
                                        className={`w-8 h-8 ${
                                          star <= rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm mb-2 block">Review</label>
                                <Textarea
                                  placeholder="Share your experience..."
                                  rows={4}
                                  value={reviewText}
                                  onChange={(e) => setReviewText(e.target.value)}
                                />
                              </div>
                              <Button onClick={handleSubmitReview} className="w-full">
                                Submit Review
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Link to={`/listing/${order.listing_id}`}>
                        <Button size="sm" variant="outline">
                          View Item
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}