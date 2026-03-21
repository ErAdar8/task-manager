'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  Clock,
  Circle,
  Brain,
  Code2,
  FileText,
  Lightbulb,
  Plus,
  X,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { Project, Task, Issue } from '@/lib/types';

interface TaskDetailClientProps {
  project: Project;
  task: Task;
}

type TabType = 'understanding' | 'architecture' | 'notes' | 'learnings' | 'work' | 'issues';

export function TaskDetailClient({ project, task: initialTask }: TaskDetailClientProps) {
  const [task, setTask] = useState(initialTask);
  const [activeTab, setActiveTab] = useState<TabType>('understanding');
  const [isSaving, setIsSaving] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState(task.task_notes || '');
  
  // Work process state
  const [workProcess, setWorkProcess] = useState(task.work_process || '');
  
  // Learnings state
  const [learnings, setLearnings] = useState<string[]>(task.learnings || []);
  const [newLearning, setNewLearning] = useState('');
  const [showAddLearning, setShowAddLearning] = useState(false);
  
  // Issues state
  const [issues, setIssues] = useState<Issue[]>(task.issues || []);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [newIssueWrong, setNewIssueWrong] = useState('');
  const [newIssueSolved, setNewIssueSolved] = useState('');

  // Sync state when task changes
  useEffect(() => {
    setNotes(task.task_notes || '');
    setWorkProcess(task.work_process || '');
    setLearnings(task.learnings || []);
    setIssues(task.issues || []);
  }, [task.task_notes, task.work_process, task.learnings, task.issues]);

  // Auto-save notes
  const saveNotes = useCallback(async (content: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_notes: content }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  }, [project.id, task.id]);

  // Auto-save work process
  const saveWorkProcess = useCallback(async (content: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_process: content }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
      }
    } catch (error) {
      console.error('Failed to save work process:', error);
    } finally {
      setIsSaving(false);
    }
  }, [project.id, task.id]);

  // Debounced auto-save for notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== task.task_notes) {
        saveNotes(notes);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [notes, task.task_notes, saveNotes]);

  // Debounced auto-save for work process
  useEffect(() => {
    const timer = setTimeout(() => {
      if (workProcess !== task.work_process) {
        saveWorkProcess(workProcess);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [workProcess, task.work_process, saveWorkProcess]);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'draft': return 'bg-zinc-600';
      case 'analyzing': return 'bg-amber-500';
      case 'ready': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-zinc-600';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'ready':
        return <Circle className="w-4 h-4" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'analyzing': return 'Analyzing...';
      case 'ready': return 'Ready to Implement';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Learning handlers
  const handleAddLearning = async () => {
    if (!newLearning.trim()) return;
    
    const updatedLearnings = [...learnings, newLearning.trim()];
    setLearnings(updatedLearnings);
    setNewLearning('');
    setShowAddLearning(false);

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnings: updatedLearnings }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
        
        // Also add to project's learnings
        const projectLearnings = project.learnings || [];
        await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learnings: [...projectLearnings, newLearning.trim()] }),
        });
      }
    } catch (error) {
      console.error('Failed to add learning:', error);
    }
  };

  const handleRemoveLearning = async (index: number) => {
    const updatedLearnings = learnings.filter((_, i) => i !== index);
    setLearnings(updatedLearnings);

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnings: updatedLearnings }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
      }
    } catch (error) {
      console.error('Failed to remove learning:', error);
    }
  };

  // Issue handlers
  const handleAddIssue = async () => {
    if (!newIssueWrong.trim() || !newIssueSolved.trim()) return;
    
    const newIssue: Issue = {
      id: `issue_${Date.now()}`,
      what_went_wrong: newIssueWrong.trim(),
      how_solved: newIssueSolved.trim(),
      created_at: new Date().toISOString(),
    };
    
    const updatedIssues = [...issues, newIssue];
    setIssues(updatedIssues);
    setNewIssueWrong('');
    setNewIssueSolved('');
    setShowAddIssue(false);

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues: updatedIssues }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
      }
    } catch (error) {
      console.error('Failed to add issue:', error);
    }
  };

  const handleRemoveIssue = async (index: number) => {
    const updatedIssues = issues.filter((_, i) => i !== index);
    setIssues(updatedIssues);

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues: updatedIssues }),
      });
      
      if (res.ok) {
        const { task: updated } = await res.json();
        setTask(updated);
      }
    } catch (error) {
      console.error('Failed to remove issue:', error);
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'low': return 'text-emerald-500';
      case 'medium': return 'text-amber-500';
      case 'high': return 'text-orange-500';
      case 'very_high': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'understanding', label: 'Understanding', icon: <Brain className="w-4 h-4" /> },
    { id: 'architecture', label: 'Architecture', icon: <Code2 className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'learnings', label: 'Learnings', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'work', label: 'Work Process', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'issues', label: 'Issues', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'understanding':
        return (
          <div className="space-y-6">
            {task.understanding ? (
              <>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">High-Level Goal</h4>
                  <p className="text-foreground">{task.understanding.high_level_goal}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Why This Matters</h4>
                  <p className="text-foreground">{task.understanding.why_this_matters}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Major Steps</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {task.understanding.major_steps.map((step, index) => (
                      <li key={index} className="text-foreground">{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Complexity:</span>
                  <span className={`text-sm font-medium ${getComplexityColor(task.understanding.estimated_complexity)}`}>
                    {task.understanding.estimated_complexity}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No understanding data available. Run analysis first.</p>
            )}
          </div>
        );

      case 'architecture':
        return (
          <div className="space-y-6">
            {task.architecture ? (
              <>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Implementation Breakdown</h4>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">{task.architecture.detailed_breakdown}</p>
                  </div>
                </div>
                
                {task.architecture.file_modifications && task.architecture.file_modifications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Files to Modify</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {task.architecture.file_modifications.map((file, index) => (
                        <li key={index} className="text-foreground font-mono text-sm">{file}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {task.architecture.testing_steps && task.architecture.testing_steps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Testing Steps</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {task.architecture.testing_steps.map((step, index) => (
                        <li key={index} className="text-foreground">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {task.architecture.edge_cases && task.architecture.edge_cases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Edge Cases</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {task.architecture.edge_cases.map((edgeCase, index) => (
                        <li key={index} className="text-foreground">{edgeCase}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {task.architecture.estimated_time && (
                  <div className="flex items-center gap-2 pt-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Estimated time: <span className="text-foreground font-medium">{task.architecture.estimated_time}</span>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No architecture data available. Run analysis first.</p>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add implementation notes, decisions, or observations as you work on this task..."
              rows={15}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-sm min-h-[400px]"
            />
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              {!isSaving && notes !== task.task_notes && <Save className="w-3 h-3" />}
              <span>{isSaving ? 'Saving...' : 'Auto-saving enabled'}</span>
            </div>
          </div>
        );

      case 'learnings':
        return (
          <div className="space-y-4">
            {learnings.length === 0 && !showAddLearning ? (
              <p className="text-muted-foreground">
                No learnings recorded yet. Add insights as you work through this task.
              </p>
            ) : (
              learnings.map((learning, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-2 p-3 bg-background rounded-lg group"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-foreground text-sm flex-1">{learning}</p>
                  <button
                    onClick={() => handleRemoveLearning(index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))
            )}
            
            {showAddLearning ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newLearning}
                  onChange={(e) => setNewLearning(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLearning()}
                  placeholder="What did you learn?"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLearning}
                    disabled={!newLearning.trim()}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLearning(false);
                      setNewLearning('');
                    }}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddLearning(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add learning
              </button>
            )}
          </div>
        );

      case 'work':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Document your workflow step-by-step. How did you approach this task?
            </p>
            <div className="relative">
              <textarea
                value={workProcess}
                onChange={(e) => setWorkProcess(e.target.value)}
                placeholder="1. First, I analyzed the requirements...
2. Then, I checked the existing codebase for...
3. Next, I implemented..."
                rows={15}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-sm min-h-[400px]"
              />
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                {!isSaving && workProcess !== task.work_process && <Save className="w-3 h-3" />}
                <span>{isSaving ? 'Saving...' : 'Auto-saving enabled'}</span>
              </div>
            </div>
          </div>
        );

      case 'issues':
        return (
          <div className="space-y-4">
            {issues.length === 0 && !showAddIssue ? (
              <p className="text-muted-foreground">
                No issues recorded. Document problems you encounter during development.
              </p>
            ) : (
              issues.map((issue, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-background rounded-lg group border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div>
                        <span className="text-xs font-medium text-red-400 uppercase">What went wrong</span>
                        <p className="text-foreground text-sm mt-1">{issue.what_went_wrong}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-emerald-400 uppercase">How it was solved</span>
                        <p className="text-foreground text-sm mt-1">{issue.how_solved}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveIssue(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {showAddIssue ? (
              <div className="space-y-3 p-4 bg-background rounded-lg border border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">What went wrong?</label>
                  <textarea
                    value={newIssueWrong}
                    onChange={(e) => setNewIssueWrong(e.target.value)}
                    placeholder="Describe the problem..."
                    rows={2}
                    className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">How was it solved?</label>
                  <textarea
                    value={newIssueSolved}
                    onChange={(e) => setNewIssueSolved(e.target.value)}
                    placeholder="Describe the solution..."
                    rows={2}
                    className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddIssue}
                    disabled={!newIssueWrong.trim() || !newIssueSolved.trim()}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm"
                  >
                    Add Issue
                  </button>
                  <button
                    onClick={() => {
                      setShowAddIssue(false);
                      setNewIssueWrong('');
                      setNewIssueSolved('');
                    }}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddIssue(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add issue
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link 
          href={`/projects/${project.id}`}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {project.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">{task.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(task.status)}/20`}>
              {getStatusIcon(task.status)}
              <span className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</span>
            </div>
            {task.understanding?.estimated_complexity && (
              <span className={`text-sm ${getComplexityColor(task.understanding.estimated_complexity)}`}>
                {task.understanding.estimated_complexity} complexity
              </span>
            )}
          </div>
        </div>
        
        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {task.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-500 rounded-md hover:bg-purple-500/30 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Complete
            </button>
          )}
          {task.status === 'completed' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-500 rounded-md hover:bg-blue-500/30 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Task Description */}
      <div className="mb-6 p-4 bg-card border border-border rounded-lg">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Task Description</h3>
        <p className="text-foreground whitespace-pre-wrap">{task.card_description}</p>
        {task.cursor_repo_scan && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Repository Context</h3>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-background p-3 rounded-md overflow-x-auto">
              {task.cursor_repo_scan}
            </pre>
          </div>
        )}
      </div>

      {/* Loading State for Analyzing */}
      {task.status === 'analyzing' && (
        <div className="mb-6 p-8 bg-card border border-border rounded-lg text-center">
          <Loader2 className="w-8 h-8 mx-auto text-amber-500 animate-spin mb-4" />
          <h3 className="text-lg font-medium mb-2">Analyzing Task...</h3>
          <p className="text-muted-foreground">
            Generating understanding, architecture, and key concepts
          </p>
        </div>
      )}

      {/* Tabs Navigation */}
      {task.status !== 'draft' && task.status !== 'analyzing' && (
        <div className="mb-6">
          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {task.status !== 'draft' && task.status !== 'analyzing' && (
        <div className="bg-card border border-border rounded-lg p-6">
          {renderTabContent()}
        </div>
      )}

      {/* Draft State */}
      {task.status === 'draft' && (
        <div className="mb-6 p-8 bg-card border border-border rounded-lg text-center">
          <Circle className="w-8 h-8 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Task Created - Ready for Analysis</h3>
          <p className="text-muted-foreground">
            The task has been created but analysis has not been run yet.
          </p>
        </div>
      )}
    </div>
  );
}
