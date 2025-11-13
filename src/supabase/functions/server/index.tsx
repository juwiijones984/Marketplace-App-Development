import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============= Helper Functions =============

function generateId() {
  return crypto.randomUUID();
}

async function getUserFromToken(token: string | null) {
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============= Auth Endpoints =============

app.post('/make-server-a3e81266/auth/signup', async (c) => {
  try {
    const { email, password, name, phone, role } = await c.req.json();
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, phone, role: role || 'buyer' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Create user profile in KV store
    const userId = data.user.id;
    const userProfile = {
      id: userId,
      name,
      email,
      phone,
      phone_verified: false,
      role: role || 'buyer',
      created_at: new Date().toISOString(),
      rating: 0,
      profile_pic: null,
    };

    await kv.set(`users:${userId}`, userProfile);

    // If seller, create seller profile
    if (role === 'seller') {
      const sellerProfile = {
        user_id: userId,
        business_name: name,
        description: '',
        location_lat: null,
        location_lng: null,
        address_text: '',
        bank_verified: false,
        phone_verified: false,
        id_verified: false,
      };
      await kv.set(`sellers:${userId}`, sellerProfile);
    }

    return c.json({ user: userProfile });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

app.get('/make-server-a3e81266/users/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('id');
    
    // Users can only fetch their own profile unless they're admin
    if (user.id !== userId) {
      const requestingUserProfile = await kv.get(`users:${user.id}`);
      if (!requestingUserProfile || requestingUserProfile.role !== 'admin') {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    const userProfile = await kv.get(`users:${userId}`);
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: userProfile });
  } catch (error) {
    console.log('Error fetching user profile:', error);
    return c.json({ error: 'Failed to fetch user profile' }, 500);
  }
});

// ============= Listings Endpoints =============

app.get('/make-server-a3e81266/listings', async (c) => {
  try {
    const category = c.req.query('category');
    const q = c.req.query('q');
    const minPrice = c.req.query('minPrice');
    const maxPrice = c.req.query('maxPrice');
    const condition = c.req.query('condition');
    const status = c.req.query('status') || 'published';
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get all published listings
    let listings = await kv.getByPrefix('listings:');
    
    // Filter
    listings = listings.filter((l: any) => {
      if (status && l.status !== status) return false;
      if (category && l.category !== category) return false;
      if (condition && l.condition !== condition) return false;
      if (minPrice && l.price_cents < parseInt(minPrice) * 100) return false;
      if (maxPrice && l.price_cents > parseInt(maxPrice) * 100) return false;
      if (q && !l.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });

    // Sort by created_at desc
    listings.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Paginate
    const paginatedListings = listings.slice(offset, offset + limit);

    // Get seller info for each listing
    const enrichedListings = await Promise.all(
      paginatedListings.map(async (listing: any) => {
        const seller = await kv.get(`users:${listing.seller_id}`);
        const sellerProfile = await kv.get(`sellers:${listing.seller_id}`);
        const images = await kv.getByPrefix(`listing-images:${listing.id}:`);
        
        return {
          ...listing,
          seller: seller || {},
          seller_profile: sellerProfile || {},
          images: images || [],
        };
      })
    );

    return c.json({ 
      listings: enrichedListings,
      total: listings.length,
      offset,
      limit,
    });
  } catch (error) {
    console.log('Error fetching listings:', error);
    return c.json({ error: 'Failed to fetch listings' }, 500);
  }
});

app.get('/make-server-a3e81266/listings/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const listing = await kv.get(`listings:${id}`);

    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }

    const seller = await kv.get(`users:${listing.seller_id}`);
    const sellerProfile = await kv.get(`sellers:${listing.seller_id}`);
    const images = await kv.getByPrefix(`listing-images:${id}:`);

    return c.json({
      ...listing,
      seller: seller || {},
      seller_profile: sellerProfile || {},
      images: images || [],
    });
  } catch (error) {
    console.log('Error fetching listing:', error);
    return c.json({ error: 'Failed to fetch listing' }, 500);
  }
});

app.post('/make-server-a3e81266/listings', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { title, category, price, description, condition, quantity, location_lat, location_lng, address_text, images } = await c.req.json();

    const listingId = generateId();
    const listing = {
      id: listingId,
      seller_id: user.id,
      title,
      category,
      price_cents: Math.round(price * 100),
      currency: 'ZAR',
      description,
      condition: condition || 'new',
      quantity: quantity || 1,
      status: 'published',
      created_at: new Date().toISOString(),
      verified_flag: false,
      location_lat,
      location_lng,
      address_text,
    };

    await kv.set(`listings:${listingId}`, listing);
    await kv.set(`listings:by-seller:${user.id}:${listingId}`, listingId);

    // Save images
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const imageId = generateId();
        await kv.set(`listing-images:${listingId}:${imageId}`, {
          id: imageId,
          listing_id: listingId,
          image_url: images[i],
          is_primary: i === 0,
        });
      }
    }

    return c.json(listing);
  } catch (error) {
    console.log('Error creating listing:', error);
    return c.json({ error: 'Failed to create listing' }, 500);
  }
});

app.put('/make-server-a3e81266/listings/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const listing = await kv.get(`listings:${id}`);

    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }

    if (listing.seller_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updates = await c.req.json();
    const updatedListing = { ...listing, ...updates };

    if (updates.price) {
      updatedListing.price_cents = Math.round(updates.price * 100);
    }

    await kv.set(`listings:${id}`, updatedListing);

    return c.json(updatedListing);
  } catch (error) {
    console.log('Error updating listing:', error);
    return c.json({ error: 'Failed to update listing' }, 500);
  }
});

app.delete('/make-server-a3e81266/listings/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const listing = await kv.get(`listings:${id}`);

    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }

    if (listing.seller_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Delete listing and images
    await kv.del(`listings:${id}`);
    await kv.del(`listings:by-seller:${user.id}:${id}`);
    
    const images = await kv.getByPrefix(`listing-images:${id}:`);
    for (const img of images) {
      await kv.del(`listing-images:${id}:${img.id}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting listing:', error);
    return c.json({ error: 'Failed to delete listing' }, 500);
  }
});

app.get('/make-server-a3e81266/seller/listings', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const listingRefs = await kv.getByPrefix(`listings:by-seller:${user.id}:`);
    const listings = await Promise.all(
      listingRefs.map(async (ref: string) => {
        const listing = await kv.get(`listings:${ref}`);
        const images = await kv.getByPrefix(`listing-images:${ref}:`);
        return { ...listing, images };
      })
    );

    return c.json({ listings: listings.filter(Boolean) });
  } catch (error) {
    console.log('Error fetching seller listings:', error);
    return c.json({ error: 'Failed to fetch seller listings' }, 500);
  }
});

// ============= Orders Endpoints =============

app.post('/make-server-a3e81266/orders', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { listing_id, quantity, delivery_method } = await c.req.json();

    const listing = await kv.get(`listings:${listing_id}`);
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }

    if (listing.quantity < quantity) {
      return c.json({ error: 'Insufficient quantity' }, 400);
    }

    const orderId = generateId();
    const order = {
      id: orderId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      listing_id,
      quantity,
      total_cents: listing.price_cents * quantity,
      status: 'pending',
      delivery_method: delivery_method || 'collection',
      created_at: new Date().toISOString(),
    };

    await kv.set(`orders:${orderId}`, order);
    await kv.set(`orders:by-buyer:${user.id}:${orderId}`, orderId);
    await kv.set(`orders:by-seller:${listing.seller_id}:${orderId}`, orderId);

    // Update listing quantity
    listing.quantity -= quantity;
    if (listing.quantity === 0) {
      listing.status = 'sold';
    }
    await kv.set(`listings:${listing_id}`, listing);

    return c.json(order);
  } catch (error) {
    console.log('Error creating order:', error);
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

app.get('/make-server-a3e81266/orders/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const order = await kv.get(`orders:${id}`);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const listing = await kv.get(`listings:${order.listing_id}`);
    const buyer = await kv.get(`users:${order.buyer_id}`);
    const seller = await kv.get(`users:${order.seller_id}`);

    return c.json({
      ...order,
      listing,
      buyer,
      seller,
    });
  } catch (error) {
    console.log('Error fetching order:', error);
    return c.json({ error: 'Failed to fetch order' }, 500);
  }
});

app.get('/make-server-a3e81266/buyer/orders', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orderRefs = await kv.getByPrefix(`orders:by-buyer:${user.id}:`);
    const orders = await Promise.all(
      orderRefs.map(async (ref: string) => {
        const order = await kv.get(`orders:${ref}`);
        const listing = await kv.get(`listings:${order.listing_id}`);
        const seller = await kv.get(`users:${order.seller_id}`);
        return { ...order, listing, seller };
      })
    );

    return c.json({ orders: orders.filter(Boolean) });
  } catch (error) {
    console.log('Error fetching buyer orders:', error);
    return c.json({ error: 'Failed to fetch buyer orders' }, 500);
  }
});

app.get('/make-server-a3e81266/seller/orders', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orderRefs = await kv.getByPrefix(`orders:by-seller:${user.id}:`);
    const orders = await Promise.all(
      orderRefs.map(async (ref: string) => {
        const order = await kv.get(`orders:${ref}`);
        const listing = await kv.get(`listings:${order.listing_id}`);
        const buyer = await kv.get(`users:${order.buyer_id}`);
        return { ...order, listing, buyer };
      })
    );

    return c.json({ orders: orders.filter(Boolean) });
  } catch (error) {
    console.log('Error fetching seller orders:', error);
    return c.json({ error: 'Failed to fetch seller orders' }, 500);
  }
});

app.put('/make-server-a3e81266/orders/:id/status', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { status } = await c.req.json();

    const order = await kv.get(`orders:${id}`);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    order.status = status;
    order.updated_at = new Date().toISOString();

    await kv.set(`orders:${id}`, order);

    return c.json(order);
  } catch (error) {
    console.log('Error updating order status:', error);
    return c.json({ error: 'Failed to update order status' }, 500);
  }
});

// ============= Verification Endpoints =============

app.post('/make-server-a3e81266/verification-requests', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { listing_id, type, evidence_urls } = await c.req.json();

    const requestId = generateId();
    const request = {
      id: requestId,
      listing_id,
      seller_id: user.id,
      type: type || 'item-verification',
      status: 'pending',
      evidence_urls: evidence_urls || [],
      created_at: new Date().toISOString(),
      admin_comment: null,
    };

    await kv.set(`verification-requests:${requestId}`, request);
    await kv.set(`verification-requests:by-listing:${listing_id}:${requestId}`, requestId);

    return c.json(request);
  } catch (error) {
    console.log('Error creating verification request:', error);
    return c.json({ error: 'Failed to create verification request' }, 500);
  }
});

app.get('/make-server-a3e81266/admin/verification-requests', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }

    const requests = await kv.getByPrefix('verification-requests:');
    const filtered = requests.filter((r: any) => !r.id?.includes(':'));

    return c.json({ requests: filtered });
  } catch (error) {
    console.log('Error fetching verification requests:', error);
    return c.json({ error: 'Failed to fetch verification requests' }, 500);
  }
});

app.put('/make-server-a3e81266/admin/verification-requests/:id/approve', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }

    const id = c.req.param('id');
    const { approved, comment } = await c.req.json();

    const request = await kv.get(`verification-requests:${id}`);
    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    request.status = approved ? 'approved' : 'rejected';
    request.admin_comment = comment;
    request.reviewed_at = new Date().toISOString();

    await kv.set(`verification-requests:${id}`, request);

    // If approved, update listing verification flag
    if (approved && request.listing_id) {
      const listing = await kv.get(`listings:${request.listing_id}`);
      if (listing) {
        listing.verified_flag = true;
        await kv.set(`listings:${request.listing_id}`, listing);
      }

      // Update seller verification
      const seller = await kv.get(`sellers:${request.seller_id}`);
      if (seller && request.type === 'phone-verification') {
        seller.phone_verified = true;
        await kv.set(`sellers:${request.seller_id}`, seller);
      }
      if (seller && request.type === 'bank-verification') {
        seller.bank_verified = true;
        await kv.set(`sellers:${request.seller_id}`, seller);
      }
      if (seller && request.type === 'id-verification') {
        seller.id_verified = true;
        await kv.set(`sellers:${request.seller_id}`, seller);
      }
    }

    return c.json(request);
  } catch (error) {
    console.log('Error approving verification request:', error);
    return c.json({ error: 'Failed to approve verification request' }, 500);
  }
});

// ============= Reviews Endpoints =============

app.post('/make-server-a3e81266/reviews', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { order_id, rating, text } = await c.req.json();

    const order = await kv.get(`orders:${order_id}`);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    if (order.buyer_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const reviewId = generateId();
    const review = {
      id: reviewId,
      order_id,
      reviewer_id: user.id,
      reviewee_id: order.seller_id,
      rating: Math.max(1, Math.min(5, rating)),
      text,
      created_at: new Date().toISOString(),
    };

    await kv.set(`reviews:${reviewId}`, review);
    await kv.set(`reviews:by-seller:${order.seller_id}:${reviewId}`, reviewId);

    // Update seller rating
    const sellerReviews = await kv.getByPrefix(`reviews:by-seller:${order.seller_id}:`);
    const reviews = await Promise.all(sellerReviews.map((ref: string) => kv.get(`reviews:${ref}`)));
    const validReviews = reviews.filter(Boolean);
    const avgRating = validReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / validReviews.length;

    const seller = await kv.get(`users:${order.seller_id}`);
    if (seller) {
      seller.rating = Math.round(avgRating * 10) / 10;
      await kv.set(`users:${order.seller_id}`, seller);
    }

    return c.json(review);
  } catch (error) {
    console.log('Error creating review:', error);
    return c.json({ error: 'Failed to create review' }, 500);
  }
});

app.get('/make-server-a3e81266/reviews/seller/:sellerId', async (c) => {
  try {
    const sellerId = c.req.param('sellerId');
    const reviewRefs = await kv.getByPrefix(`reviews:by-seller:${sellerId}:`);
    const reviews = await Promise.all(
      reviewRefs.map(async (ref: string) => {
        const review = await kv.get(`reviews:${ref}`);
        const reviewer = await kv.get(`users:${review.reviewer_id}`);
        return { ...review, reviewer };
      })
    );

    return c.json({ reviews: reviews.filter(Boolean) });
  } catch (error) {
    console.log('Error fetching reviews:', error);
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
});

// ============= Reports Endpoints =============

app.post('/make-server-a3e81266/reports', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { target_type, target_id, reason } = await c.req.json();

    const reportId = generateId();
    const report = {
      id: reportId,
      reporter_id: user.id,
      target_type,
      target_id,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await kv.set(`reports:${reportId}`, report);

    return c.json(report);
  } catch (error) {
    console.log('Error creating report:', error);
    return c.json({ error: 'Failed to create report' }, 500);
  }
});

app.get('/make-server-a3e81266/admin/reports', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }

    const reports = await kv.getByPrefix('reports:');

    return c.json({ reports });
  } catch (error) {
    console.log('Error fetching reports:', error);
    return c.json({ error: 'Failed to fetch reports' }, 500);
  }
});

// ============= Seller Profile Endpoints =============

app.get('/make-server-a3e81266/seller/profile', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const seller = await kv.get(`sellers:${user.id}`);
    const userProfile = await kv.get(`users:${user.id}`);

    return c.json({ 
      seller: seller || null,
      user: userProfile || null,
    });
  } catch (error) {
    console.log('Error fetching seller profile:', error);
    return c.json({ error: 'Failed to fetch seller profile' }, 500);
  }
});

app.put('/make-server-a3e81266/seller/profile', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const updates = await c.req.json();
    let seller = await kv.get(`sellers:${user.id}`);

    if (!seller) {
      // Create seller profile if it doesn't exist
      seller = {
        user_id: user.id,
        business_name: '',
        description: '',
        location_lat: null,
        location_lng: null,
        address_text: '',
        bank_verified: false,
        phone_verified: false,
        id_verified: false,
      };
    }

    const updatedSeller = { ...seller, ...updates };
    await kv.set(`sellers:${user.id}`, updatedSeller);

    return c.json(updatedSeller);
  } catch (error) {
    console.log('Error updating seller profile:', error);
    return c.json({ error: 'Failed to update seller profile' }, 500);
  }
});

// ============= Categories =============

app.get('/make-server-a3e81266/categories', async (c) => {
  try {
    const categories = [
      { id: 'electronics', name: 'Electronics', icon: '📱' },
      { id: 'fashion', name: 'Fashion & Clothing', icon: '👕' },
      { id: 'home', name: 'Home & Garden', icon: '🏠' },
      { id: 'vehicles', name: 'Vehicles', icon: '🚗' },
      { id: 'property', name: 'Property', icon: '🏢' },
      { id: 'services', name: 'Services', icon: '🔧' },
      { id: 'food', name: 'Food & Beverages', icon: '🍔' },
      { id: 'sports', name: 'Sports & Outdoors', icon: '⚽' },
      { id: 'books', name: 'Books & Media', icon: '📚' },
      { id: 'beauty', name: 'Beauty & Health', icon: '💄' },
      { id: 'toys', name: 'Toys & Games', icon: '🎮' },
      { id: 'other', name: 'Other', icon: '📦' },
    ];

    return c.json({ categories });
  } catch (error) {
    console.log('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// ============= Analytics (Admin) =============

app.get('/make-server-a3e81266/admin/analytics', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }

    const users = await kv.getByPrefix('users:');
    const listings = await kv.getByPrefix('listings:');
    const orders = await kv.getByPrefix('orders:');
    const reports = await kv.getByPrefix('reports:');
    const verificationRequests = await kv.getByPrefix('verification-requests:');

    // Filter out index entries
    const actualListings = listings.filter((l: any) => l.id && !l.id.includes(':'));
    const actualOrders = orders.filter((o: any) => o.id && !o.id.includes(':'));
    const actualReports = reports.filter((r: any) => r.id && !r.id.includes(':'));
    const actualVerifications = verificationRequests.filter((v: any) => v.id && !v.id.includes(':'));

    const totalRevenue = actualOrders
      .filter((o: any) => o.status === 'delivered' || o.status === 'paid')
      .reduce((sum: number, o: any) => sum + o.total_cents, 0);

    return c.json({
      totalUsers: users.length,
      totalListings: actualListings.length,
      totalOrders: actualOrders.length,
      totalRevenue: totalRevenue / 100,
      pendingReports: actualReports.filter((r: any) => r.status === 'pending').length,
      pendingVerifications: actualVerifications.filter((v: any) => v.status === 'pending').length,
    });
  } catch (error) {
    console.log('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

Deno.serve(app.fetch);