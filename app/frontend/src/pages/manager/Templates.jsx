import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import ManagerLayout from '../../components/ManagerLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Plus, Trash2, CheckSquare, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const API = `${BACKEND_URL}/api`;

const Templates = ({ user }) => {
  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  
  useEffect(() => {
    fetchChecklistItems();
  }, []);
  
  const fetchChecklistItems = async () => {
    try {
      const response = await axios.get(`${API}/templates`, { withCredentials: true });
      setChecklistItems(response.data);
    } catch (error) {
      console.error('Failed to fetch checklist items:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    try {
      await axios.post(`${API}/templates`, {
        name: newItem.trim(),
        title: newItem.trim(),
        description: `Checklist: ${newItem.trim()}`,
        priority: 'high',
        photo_required: true
      }, { withCredentials: true });
      
      toast.success('Checklist item added');
      setIsDialogOpen(false);
      setNewItem('');
      fetchChecklistItems();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };
  
  const handleDeleteItem = async (templateId) => {
    if (!window.confirm('Delete this checklist item?')) return;
    
    try {
      await axios.delete(`${API}/templates/${templateId}`, { withCredentials: true });
      toast.success('Item deleted');
      fetchChecklistItems();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };
  
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const items = [...checklistItems];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    setChecklistItems(items);
  };
  
  const handleMoveDown = (index) => {
    if (index === checklistItems.length - 1) return;
    const items = [...checklistItems];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    setChecklistItems(items);
  };

  if (loading) {
    return (
      <ManagerLayout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ManagerLayout>
    );
  }
  
  return (
    <ManagerLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900">Checklist Template</h1>
            <p className="text-slate-600 font-body">Manage the 17-point daily checklist for supervisors</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 font-body">
                <Plus className="w-4 h-4 mr-2" />Add Checklist Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Add Checklist Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <Label className="font-body">Activity/Question</Label>
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="e.g., Is the store clean?"
                    className="font-body"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 font-body">Add Item</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-heading font-semibold">Daily Checklist Items ({checklistItems.length})</h2>
          </div>
          
          <div className="space-y-2">
            {checklistItems.map((item, index) => (
              <div 
                key={item.template_id} 
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === checklistItems.length - 1}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                
                <span className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-700 rounded-full text-sm font-bold font-body">
                  {index + 1}
                </span>
                
                <span className="flex-1 font-body text-slate-700">{item.title || item.name}</span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(item.template_id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {checklistItems.length === 0 && (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-body">No checklist items yet</p>
              <Button onClick={() => setIsDialogOpen(true)} className="mt-4 bg-blue-600 font-body">
                <Plus className="w-4 h-4 mr-2" />Add First Item
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-heading font-semibold text-blue-900 mb-2">💡 Info</h3>
          <p className="text-sm text-blue-800 font-body">
            This is the standard checklist that all supervisors must complete daily. 
            You can add, remove, or reorder items. The 17 default items are automatically loaded on first run.
          </p>
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default Templates;


