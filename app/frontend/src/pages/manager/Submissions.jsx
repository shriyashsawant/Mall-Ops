import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import ManagerLayout from '../../components/ManagerLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { CheckCircle, XCircle, Clock, Camera, MapPin, Flag, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Submissions = ({ user }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  
  useEffect(() => {
    fetchSubmissions();
  }, []);
  
  const fetchSubmissions = async () => {
    try {
      const response = await axios.get(`${API}/submissions/pending`, {
        withCredentials: true
      });
      setSubmissions(response.data);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReview = async (submissionId, status) => {
    try {
      await axios.put(`${API}/submissions/${submissionId}/review`, {
        status,
        manager_remarks: reviewRemarks
      }, {
        withCredentials: true
      });
      
      toast.success(`Submission ${status}`);
      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      setReviewRemarks('');
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to review submission:', error);
      toast.error('Failed to review submission');
    }
  };
  
  const openReviewDialog = (submission) => {
    setSelectedSubmission(submission);
    setReviewDialogOpen(true);
  };
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  if (loading) {
    return (
      <ManagerLayout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      </ManagerLayout>
    );
  }
  
  return (
    <ManagerLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1" data-testid="submissions-title">
            Pending Submissions
          </h1>
          <p className="text-slate-600">Review and approve task completions</p>
        </div>
        
        {/* Submissions List */}
        {submissions.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No pending submissions</h3>
            <p className="text-slate-600">All tasks have been reviewed</p>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="submissions-list">
            {submissions.map((sub) => (
              <Card key={sub.submission_id} className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900" data-testid={`submission-task-${sub.submission_id}`}>
                          {sub.task_info?.title || 'Task'}
                        </h3>
                        {sub.task_info?.priority && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getPriorityColor(sub.task_info.priority)}`}>
                            <Flag className="w-3 h-3 inline mr-1" />
                            {sub.task_info.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {sub.supervisor_info?.name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.submitted_at).toLocaleString()}
                        </span>
                        {sub.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {sub.location.lat.toFixed(4)}, {sub.location.lng.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-orange-100 text-orange-700 rounded-full shrink-0">
                      {sub.status || 'Pending'}
                    </span>
                  </div>
                  
                  {/* Before/After Photos */}
                  {sub.before_photos && sub.before_photos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        BEFORE Photos ({sub.before_photos.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {sub.before_photos.map((photo, idx) => (
                          <img
                            key={`before-${idx}`}
                            src={`data:image/jpeg;base64,${photo}`}
                            alt={`Before ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* After Photos */}
                  {sub.photos && sub.photos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        AFTER Photos ({sub.photos.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {sub.photos.map((photo, idx) => (
                          <img
                            key={`after-${idx}`}
                            src={`data:image/jpeg;base64,${photo}`}
                            alt={`After ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-green-200 shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Remarks */}
                  {sub.remarks && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-1">Supervisor Remarks:</p>
                      <p className="text-sm text-slate-700">{sub.remarks}</p>
                    </div>
                  )}
                  
                  {/* AI Analysis */}
                  {sub.ai_photo_analysis && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs font-medium text-blue-600 mb-1">AI Analysis:</p>
                      <p className="text-xs text-blue-800">{sub.ai_photo_analysis}</p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => openReviewDialog(sub)}
                      data-testid={`review-submission-${sub.submission_id}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => openReviewDialog(sub)}
                      data-testid={`reject-submission-${sub.submission_id}`}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Review Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="remarks">Manager Remarks</Label>
                <Textarea
                  id="remarks"
                  data-testid="review-remarks-input"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Add feedback (required for rejections)..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleReview(selectedSubmission?.submission_id, 'approved')}
                  data-testid="approve-btn"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleReview(selectedSubmission?.submission_id, 'rejected')}
                  data-testid="reject-btn"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ManagerLayout>
  );
};

export default Submissions;
