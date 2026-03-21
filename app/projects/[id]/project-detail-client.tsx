'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Play, Clock, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Project, Task } from '@/lib/types';

interface ProjectDetailClientProps {
  project: Project;
  initialTasks: Task[];
}

export function ProjectDetailClient({ project, initialTasks }: ProjectDetailClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cursorRepoScan, setCursorRepoScan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !cardDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          card_description: cardDescription,
          cursor_repo_scan: cursorRepoScan || undefined
        }),
      });

      if (res.ok) {
        const { task } = await res.json();
        
        // Immediately trigger analysis
        setIsAnalyzing(task.id);
        
        try {
          const analysisRes = await fetch(
            `/api/projects/${project.id}/tasks/${task.id}/analyze-full`,
            { method: 'POST' }
          );
          
          if (analysisRes.ok) {
            const { task: analyzedTask } = await analysisRes.json();
            setTasks([...tasks, analyzedTask]);
          } else {
            // If analysis fails, add task anyway
            setTasks([...tasks, task]);
          }
        } catch (analysisError) {
          console.error('Analysis failed:', analysisError);
          setTasks([...tasks, task]);
        } finally {
          setIsAnalyzing(null);
        }
        
        // Reset form and navigate to task
        setTitle('');
        setCardDescription('');
        setCursorRepoScan('');
        setShowCreateForm(false);
        router.push(`/projects/${project.id}/tasks/${task.id}`);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'ready':
        return <Circle className="w-4 h-4 text-emerald-500" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'analyzing': return 'Analyzing...';
      case 'ready': return 'Ready';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Implement Bitcoin transaction parsing"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Task Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={cardDescription}
                onChange={(e) => setCardDescription(e.target.value)}
                placeholder="Describe what needs to be built or fixed. Include any relevant details, requirements, or constraints..."
                rows={6}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Repository Context (optional)
              </label>
              <textarea
                value={cursorRepoScan}
                onChange={(e) => setCursorRepoScan(e.target.value)}
                placeholder="Paste relevant code context from Cursor, file paths, or relevant code snippets that would help understand the codebase..."
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This helps the AI understand your existing codebase structure
              </p>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <Play className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-500">
                Clicking &quot;Analyze Task&quot; will immediately run full analysis
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !cardDescription.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isSubmitting ? 'Creating & Analyzing...' : 'Analyze Task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setTitle('');
                  setCardDescription('');
                  setCursorRepoScan('');
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">Create your first task to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${project.id}/tasks/${task.id}`}
              className="block p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(task.status)}
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.card_description.substring(0, 150)}
                      {task.card_description.length > 150 ? '...' : ''}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{getStatusLabel(task.status)}</span>
                      <span>{formatDate(task.created_at)}</span>
                    </div>
                  </div>
                </div>
                {isAnalyzing === task.id && (
                  <div className="flex items-center gap-2 text-amber-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
