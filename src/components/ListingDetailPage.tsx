import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, MapPin, Package, Star, MessageCircle, Phone, Flag } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const supabase = getSupabaseClient();

export default function ListingDetailPage({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('collection');

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/listings/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!user) {
      toast.error('Please sign in to make a purchase');
      navigate('/auth');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            listing_id: id,
            quantity,
            delivery_method: deliveryMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      toast.success('Order placed successfully!');
      setBuyDialogOpen(false);
      navigate('/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
      console.error('Error creating order:', error);
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Please sign in to report');
      navigate('/auth');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            target_type: 'listing',
            target_id: id,
            reason: 'User reported this listing',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      toast.success('Report submitted. We will review it shortly.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl mb-4">Listing not found</h2>
        <Link to="/">
          <Button>Back to marketplace</Button>
        </Link>
      </div>
    );
  }

  const formatPrice = (cents: number, currency: string) => {
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image gallery */}
          <div>
            <div className="bg-white rounded-lg overflow-hidden mb-4">
              {listing.images?.[0]?.image_url ? (
                <img
                  src={listing.images[0].image_url}
                  alt={listing.title}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {listing.images.slice(1, 5).map((img: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg overflow-hidden aspect-square">
                    <img
                      src={img.image_url}
                      alt={`${listing.title} ${idx + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="bg-white rounded-lg p-6 mb-4">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl">{listing.title}</h1>
                {listing.verified_flag && (
                  <Badge className="shrink-0">✓ Verified</Badge>
                )}
              </div>

              <p className="text-3xl text-orange-600 mb-4">
                {formatPrice(listing.price_cents, listing.currency)}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Condition</p>
                  <p className="capitalize">{listing.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p>{listing.quantity} {listing.quantity === 1 ? 'item' : 'items'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <p>{listing.address_text || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>

              <div className="flex gap-2">
                <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1" size="lg">
                      Buy Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Complete Purchase</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm mb-2 block">Quantity</label>
                        <Select value={quantity.toString()} onValueChange={(val) => setQuantity(parseInt(val))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: Math.min(listing.quantity, 10) }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm mb-2 block">Delivery Method</label>
                        <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="collection">Collection</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span>Subtotal</span>
                          <span>{formatPrice(listing.price_cents * quantity, listing.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total</span>
                          <span>{formatPrice(listing.price_cents * quantity, listing.currency)}</span>
                        </div>
                      </div>
                      <Button onClick={handleBuy} className="w-full">
                        Confirm Order
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="lg" onClick={handleReport}>
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Seller card */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>
                      {listing.seller?.name?.[0]?.toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p>{listing.seller?.name || 'Anonymous'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {listing.seller?.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{listing.seller.rating}</span>
                        </div>
                      )}
                      {listing.seller_profile?.phone_verified && (
                        <Badge variant="outline" className="text-xs">📱 Phone verified</Badge>
                      )}
                      {listing.seller_profile?.bank_verified && (
                        <Badge variant="outline" className="text-xs">🏦 Bank verified</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                  {listing.seller?.phone && (
                    <Button variant="outline" className="flex-1">
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}