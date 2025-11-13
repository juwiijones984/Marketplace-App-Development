import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Users, Package, ShoppingBag, TrendingUp, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const supabase = getSupabaseClient();

export default function AdminDashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Fetch analytics
      const analyticsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/admin/analytics`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData);

      // Fetch verification requests
      const verificationResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/admin/verification-requests`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const verificationData = await verificationResponse.json();
      setVerificationRequests(verificationData.requests || []);

      // Fetch reports
      const reportsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/admin/reports`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const reportsData = await reportsResponse.json();
      setReports(reportsData.reports || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationDecision = async (requestId: string, approved: boolean, comment: string = '') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a3e81266/admin/verification-requests/${requestId}/approve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ approved, comment }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to process verification request');
      }

      toast.success(approved ? 'Request approved' : 'Request rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to process request');
      console.error('Error processing verification:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to marketplace
              </Button>
            </Link>
            <h1 className="text-2xl">Admin Dashboard</h1>
            <div className="w-32">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Users</p>
                    <p className="text-3xl">{analytics.totalUsers}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Listings</p>
                    <p className="text-3xl">{analytics.totalListings}</p>
                  </div>
                  <Package className="w-12 h-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                    <p className="text-3xl">{analytics.totalOrders}</p>
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
                    <p className="text-2xl">ZAR {analytics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Moderation & Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="verifications">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="verifications">
                  Verification Requests
                  {analytics?.pendingVerifications > 0 && (
                    <Badge className="ml-2" variant="destructive">
                      {analytics.pendingVerifications}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports">
                  Reports
                  {analytics?.pendingReports > 0 && (
                    <Badge className="ml-2" variant="destructive">
                      {analytics.pendingReports}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="verifications" className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : verificationRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-500">No pending verification requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {verificationRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="mb-1">Verification Request</h3>
                            <p className="text-sm text-gray-500">Type: {request.type}</p>
                            <p className="text-sm text-gray-500">
                              Submitted: {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            {request.listing_id && (
                              <p className="text-sm text-gray-500">
                                Listing ID: {request.listing_id}
                              </p>
                            )}
                          </div>
                          <Badge variant={
                            request.status === 'pending' ? 'default' :
                            request.status === 'approved' ? 'secondary' : 'destructive'
                          }>
                            {request.status}
                          </Badge>
                        </div>

                        {request.evidence_urls && request.evidence_urls.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm mb-2">Evidence:</p>
                            <div className="flex gap-2">
                              {request.evidence_urls.map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 text-sm underline"
                                >
                                  Evidence {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleVerificationDecision(request.id, true)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVerificationDecision(request.id, false)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {request.admin_comment && (
                          <div className="mt-4 p-3 bg-gray-50 rounded">
                            <p className="text-sm text-gray-500 mb-1">Admin comment:</p>
                            <p className="text-sm">{request.admin_comment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reports" className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-500">No reports to review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                              <h3>Report: {report.target_type}</h3>
                            </div>
                            <p className="text-sm text-gray-500">Target ID: {report.target_id}</p>
                            <p className="text-sm text-gray-500">
                              Reported: {new Date(report.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </div>
                        <div className="bg-gray-50 p-3 rounded mt-3">
                          <p className="text-sm text-gray-700">{report.reason}</p>
                        </div>
                        {report.target_type === 'listing' && (
                          <div className="mt-3">
                            <Link to={`/listing/${report.target_id}`}>
                              <Button size="sm" variant="outline">
                                View Listing
                              </Button>
                            </Link>
                          </div>
                        )}
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