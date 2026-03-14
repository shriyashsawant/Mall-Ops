import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import ManagerLayout from '../../components/ManagerLayout';
import { Plus, Trash2, Calendar, Building2, CheckSquare, Clock, FileText, ClipboardList, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_TASKS = [
  "Is the general attendance of technician satisfactory",
  "Is the CM / PM done as per schedule",
  "Are PPEs & Uniform available with Technician",
  "Are Tools available with Technician",
  "Is Thermography of Equipments of store done as per schedule",
  "Are all abnormalities recorded of thermography resolved",
  "Are the service records (FSR) available in store",
  "Are the FM corner all documents available in store",
  "Are the PM calendar activity done in store",
  "Are Lux level of lighting maintained as per business requirement",
  "Are Reflectors of light fixtures clean & properly fixed",
  "Are Work permits available/maintained in the store",
  "Is power factor of store maintained at unity",
  "Are all sensors working properly",
  "Are BOH lights switched off when not necessary",
  "Are temperature settings proper",
  "Is Energy Meter log book maintained at store"
];

const STORE_NAMES = [
  "Reliance Trends", "Reliance Digital", "Smart Bazaar", "Mall Management",
  "Smart Point", "Reliance FootPrint", "Reliance Fresh"
];

const DUE_OPTIONS = [
  { value: "1", label: "1 Day" },
  { value: "7", label: "1 Week" },
  { value: "14", label: "2 Weeks" },
  { value: "30", label: "1 Month" }
];

const Tasks = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stores, setStores] = useState([]);
  const [mallsWithStores, setMallsWithStores] = useState([]);
  const [selectedMallId, setSelectedMallId] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checklists');
  const [seeding, setSeeding] = useState(false);
  
  // Checklist form state
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [checklistForm, setChecklistForm] = useState({
    template_id: '', store_id: '', store_name: '', store_code: '', due_days: '1', supervisor_id: ''
  });
  const [selectedTasks, setSelectedTasks] = useState([]);
  
  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
  const [templateTasks, setTemplateTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  
  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    try {
      const [tasksRes, templatesRes, storesRes, supervisorsRes, mallsRes] = await Promise.all([
        axios.get(`${API}/tasks`, { withCredentials: true }),
        axios.get(`${API}/templates`, { withCredentials: true }),
        axios.get(`${API}/stores`, { withCredentials: true }),
        axios.get(`${API}/supervisors`, { withCredentials: true }),
        axios.get(`${API}/malls/with-stores`, { withCredentials: true })
      ]);
      setTasks(tasksRes.data);
      setTemplates(templatesRes.data);
      setStores(storesRes.data);
      setSupervisors(supervisorsRes.data);
      setMallsWithStores(mallsRes.data.malls || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Seed malls to database
  const handleSeedMalls = async () => {
    setSeeding(true);
    try {
      const response = await axios.post(`${API}/seed/malls`, {}, { withCredentials: true });
      toast.success(`Seeded ${response.data.malls_created} malls`);
      loadData(); // Reload to get the new malls
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to seed malls');
    } finally {
      setSeeding(false);
    }
  };

  // Template handlers
  const handleAddTaskToTemplate = () => {
    if (newTask.trim()) {
      setTemplateTasks([...templateTasks, newTask.trim()]);
      setNewTask('');
    }
  };

  const handleRemoveTaskFromTemplate = (idx) => {
    setTemplateTasks(templateTasks.filter((_, i) => i !== idx));
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name || template.title || '', description: template.description || '' });
    setTemplateTasks(template.tasks && template.tasks.length > 0 ? [...template.tasks] : [...DEFAULT_TASKS]);
    setShowTemplateForm(true);
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name) { toast.error('Template name required'); return; }
    if (templateTasks.length === 0) { toast.error('Add at least one task'); return; }
    
    try {
      await axios.post(`${API}/templates`, {
        name: templateForm.name,
        description: templateForm.description,
        title: templateForm.name,
        priority: 'high',
        photo_required: true,
        tasks: templateTasks
      }, { withCredentials: true });
      
      toast.success('Template updated successfully');
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '' });
      setTemplateTasks([]);
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update template'); }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name) { toast.error('Template name required'); return; }
    if (templateTasks.length === 0) { toast.error('Add at least one task'); return; }
    
    try {
      await axios.post(`${API}/templates`, {
        name: templateForm.name,
        description: templateForm.description,
        title: templateForm.name,
        priority: 'high',
        photo_required: true,
        tasks: templateTasks
      }, { withCredentials: true });
      
      toast.success('Template created successfully');
      setShowTemplateForm(false);
      setTemplateForm({ name: '', description: '' });
      setTemplateTasks([]);
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create template'); }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API}/templates/${templateId}`, { withCredentials: true });
      toast.success('Template deleted');
      loadData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  // Checklist handlers
  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setChecklistForm({ ...checklistForm, template_id: templateId });
    const template = templates.find(t => t.template_id === templateId);
    if (template && template.tasks && template.tasks.length > 0) {
      setSelectedTasks(template.tasks);
    } else {
      setSelectedTasks(DEFAULT_TASKS);
    }
  };

  const handleEditChecklist = (task) => {
    setEditingChecklist(task);
    setChecklistForm({
      template_id: task.store_id || '',
      store_name: task.store_name || '',
      store_code: task.store_code?.toString() || '',
      due_days: '1',
      supervisor_id: ''
    });
    setShowChecklistForm(true);
  };

  const handleUpdateChecklist = async (e) => {
    e.preventDefault();
    if (!checklistForm.store_name) { toast.error('Select store'); return; }
    
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(checklistForm.due_days));
      
      await axios.post(`${API}/tasks`, {
        title: `Checklist - ${checklistForm.store_name}`,
        description: 'Updated checklist',
        deadline: dueDate.toISOString(),
        priority: 'high',
        photo_required: true,
        before_after_photos: false,
        max_photos: 5,
        store_code: parseInt(checklistForm.store_code),
        store_name: checklistForm.store_name,
        city: 'Pune',
        state: 'ROOM 1 (Rest of Maharastra - 1)',
        checklist_date: new Date().toISOString().split('T')[0]
      }, { withCredentials: true });
      
      toast.success('Checklist updated successfully');
      setShowChecklistForm(false);
      setEditingChecklist(null);
      setChecklistForm({ template_id: '', store_name: '', store_code: '', due_days: '1', supervisor_id: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update checklist'); }
  };

  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!checklistForm.template_id) { toast.error('Select a template'); return; }
    if (!checklistForm.store_id) { toast.error('Select a mall and store'); return; }
    
    // Get selected mall info for geofencing
    const selectedMall = mallsWithStores.find(m => m.mall_id === selectedMallId);
    const selectedStore = selectedMall?.stores.find(s => s.store_id === checklistForm.store_id);
    
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(checklistForm.due_days));
      
      await axios.post(`${API}/tasks`, {
        store_id: checklistForm.store_id,
        supervisor_id: checklistForm.supervisor_id || null,
        title: `Checklist - ${selectedStore?.name || checklistForm.store_id}`,
        description: `Checklist with ${selectedTasks.length} tasks`,
        deadline: dueDate.toISOString(),
        priority: 'high',
        photo_required: true,
        before_after_photos: false,
        max_photos: 5,
        store_code: selectedStore?.store_code ? parseInt(selectedStore.store_code) : (checklistForm.store_code ? parseInt(checklistForm.store_code) : null),
        store_name: selectedStore?.name || checklistForm.store_id,
        city: selectedMall?.city || 'Pune',
        state: selectedMall?.state || 'Maharashtra',
        checklist_date: new Date().toISOString().split('T')[0]
      }, { withCredentials: true });
      
      toast.success('Checklist assigned successfully');
      setShowChecklistForm(false);
      setChecklistForm({ template_id: '', store_id: '', store_name: '', store_code: '', due_days: '1', supervisor_id: '' });
      setSelectedTasks([]);
      setSelectedMallId('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create checklist'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this checklist?')) return;
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { withCredentials: true });
      toast.success('Checklist deleted');
      loadData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const cancelForm = () => {
    setShowChecklistForm(false);
    setEditingChecklist(null);
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setChecklistForm({ template_id: '', store_id: '', store_name: '', store_code: '', due_days: '1', supervisor_id: '' });
    setTemplateForm({ name: '', description: '' });
    setTemplateTasks([]);
    setSelectedMallId('');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <ManagerLayout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ManagerLayout>
    );
  }
  
  return (
    <ManagerLayout user={user}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-500 mt-1">Create templates with tasks and assign checklists to supervisors</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button onClick={() => { cancelForm(); setActiveTab('checklists'); }} variant={activeTab === 'checklists' ? 'default' : 'outline'} className={activeTab === 'checklists' ? 'bg-blue-600' : ''}>
            <ClipboardList className="w-4 h-4 mr-2" />Checklists
          </Button>
          <Button onClick={() => { cancelForm(); setActiveTab('templates'); }} variant={activeTab === 'templates' ? 'default' : 'outline'} className={activeTab === 'templates' ? 'bg-blue-600' : ''}>
            <FileText className="w-4 h-4 mr-2" />Templates
          </Button>
        </div>

        {/* CHECKLISTS TAB */}
        {activeTab === 'checklists' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Assigned Checklists</h2>
              <Button onClick={() => setShowChecklistForm(!showChecklistForm)} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />New Checklist
              </Button>
            </div>

            {/* Create/Edit Checklist Form */}
            {showChecklistForm && (
              <Card className="mb-6 p-6 border-amber-200 bg-amber-50">
                <h3 className="text-lg font-semibold mb-4 text-amber-800">
                  {editingChecklist ? 'Edit Checklist' : 'Create New Checklist'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-amber-700">Template *</Label>
                    <select 
                      value={checklistForm.template_id} 
                      onChange={handleTemplateChange}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                    >
                      <option value="">Select template</option>
                      {templates.map(t => (
                        <option key={t.template_id} value={t.template_id}>{String(t.name || t.title || 'Template')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-amber-700">Mall / Location *</Label>
                    <select 
                      value={selectedMallId} 
                      onChange={e => {
                        setSelectedMallId(e.target.value);
                        setChecklistForm({
                          ...checklistForm, 
                          store_id: '',
                          store_name: ''
                        });
                      }}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                    >
                      <option value="">Select Mall / Location</option>
                      {mallsWithStores.map(mall => (
                        <option key={mall.mall_id} value={mall.mall_id}>
                          {mall.name} ({mall.stores?.length || 0} stores)
                        </option>
                      ))}
                    </select>
                    {mallsWithStores.length === 0 && (
                      <button 
                        type="button"
                        onClick={handleSeedMalls}
                        disabled={seeding}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        {seeding ? 'Seeding...' : 'Click here to add malls with coordinates'}
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-amber-700">Store *</Label>
                    <select 
                      value={checklistForm.store_id} 
                      onChange={e => {
                        const selectedStore = selectedMallId ? 
                          mallsWithStores.find(m => m.mall_id === selectedMallId)?.stores.find(s => s.store_id === e.target.value) :
                          null;
                        setChecklistForm({
                          ...checklistForm, 
                          store_id: e.target.value,
                          store_name: selectedStore?.name || e.target.value,
                          store_code: selectedStore?.store_code || ''
                        });
                      }}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                      disabled={!selectedMallId}
                    >
                      <option value="">{selectedMallId ? 'Select store' : 'Select mall first'}</option>
                      {selectedMallId && mallsWithStores.find(m => m.mall_id === selectedMallId)?.stores.map(store => (
                        <option key={store.store_id} value={store.store_id}>
                          {store.name} {store.store_code ? `(${store.store_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-amber-700">Store Code</Label>
                    <Input type="number" value={checklistForm.store_code} onChange={e => setChecklistForm({...checklistForm, store_code: e.target.value})} placeholder="Auto-filled from store" className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-amber-700">Due Within *</Label>
                    <select 
                      value={checklistForm.due_days} 
                      onChange={e => setChecklistForm({...checklistForm, due_days: e.target.value})}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                    >
                      {DUE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-amber-700">Assign To</Label>
                    <select 
                      value={checklistForm.supervisor_id} 
                      onChange={e => setChecklistForm({...checklistForm, supervisor_id: e.target.value})}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                    >
                      <option value="">Select supervisor</option>
                      {supervisors.map(s => <option key={s.user_id} value={s.user_id}>{String(s.name || s.email)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Task Preview */}
                {selectedTasks.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-amber-700 mb-2 block">Tasks in this checklist ({selectedTasks.length})</Label>
                    <div className="bg-white rounded-lg p-3 max-h-48 overflow-y-auto border">
                      {selectedTasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 py-1 text-sm">
                          <span className="w-6 text-gray-400">{idx + 1}.</span>
                          <span className="text-gray-700">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={editingChecklist ? handleUpdateChecklist : handleCreateChecklist} className="bg-amber-600 hover:bg-amber-700">
                    <Save className="w-4 h-4 mr-2" />{editingChecklist ? 'Update Checklist' : 'Create Checklist'}
                  </Button>
                  <Button onClick={cancelForm} variant="outline">Cancel</Button>
                </div>
              </Card>
            )}

            {/* Checklists Grid */}
            {tasks.length === 0 && !showChecklistForm ? (
              <Card className="p-12 text-center">
                <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Checklists Yet</h3>
                <p className="text-gray-500">Create a template first, then assign checklists to supervisors</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map(task => (
                  <Card key={task.task_id} className="p-5 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{task.store_name || 'Checklist'}</h3>
                        {task.store_code && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Code: {task.store_code}</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditChecklist(task)} className="text-blue-400 hover:text-blue-600 p-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTask(task.task_id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Created: {formatDate(task.checklist_date || task.deadline)}</p>
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Due: {formatDate(task.deadline)}</p>
                      <p className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> 17 Tasks</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Checklist Templates</h2>
              <Button onClick={() => setShowTemplateForm(!showTemplateForm)} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />New Template
              </Button>
            </div>

            {/* Create/Edit Template Form */}
            {showTemplateForm && (
              <Card className="mb-6 p-6 border-green-200 bg-green-50">
                <h3 className="text-lg font-semibold mb-4 text-green-800">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-green-700">Template Name *</Label>
                    <Input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="e.g., Daily Safety Check" className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-green-700">Description</Label>
                    <Input value={templateForm.description} onChange={e => setTemplateForm({...templateForm, description: e.target.value})} placeholder="Brief description" className="bg-white" />
                  </div>
                </div>
                
                {/* Add Tasks */}
                <div className="mb-4">
                  <Label className="text-green-700 mb-2 block">Tasks (Edit as needed)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Enter new task" className="bg-white" onKeyPress={e => e.key === 'Enter' && handleAddTaskToTemplate()} />
                    <Button onClick={handleAddTaskToTemplate} variant="outline">Add</Button>
                  </div>
                  
                  {templateTasks.length > 0 && (
                    <div className="bg-white rounded-lg p-3 max-h-64 overflow-y-auto border">
                      {templateTasks.map((task, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-700 flex items-center gap-2">
                            <span className="w-5 text-gray-400">{idx + 1}.</span> {task}
                          </span>
                          <button onClick={() => handleRemoveTaskFromTemplate(idx)} className="text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />{editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                  <Button onClick={cancelForm} variant="outline">Cancel</Button>
                </div>
              </Card>
            )}

            {/* Templates List */}
            {templates.length === 0 && !showTemplateForm ? (
              <Card className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-500 mb-6">Create templates with tasks to use when assigning checklists</p>
                <Button onClick={() => setShowTemplateForm(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />Create First Template
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <Card key={template.template_id} className="p-5 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{String(template.name || template.title)}</h3>
                        {template.description && <p className="text-sm text-gray-500">{template.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditTemplate(template)} className="text-blue-400 hover:text-blue-600 p-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTemplate(template.template_id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-500 mb-2">TASKS ({(template.tasks || DEFAULT_TASKS).length}):</p>
                      {(template.tasks || DEFAULT_TASKS).slice(0, 5).map((task, idx) => (
                        <p key={idx} className="text-xs text-gray-600 py-1">• {task}</p>
                      ))}
                      <p className="text-xs text-gray-400 italic">+{(template.tasks || DEFAULT_TASKS).length - 5} more tasks...</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Tasks;
