import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/storage';

interface AnalyzeFullResponse {
  understanding: {
    high_level_goal: string;
    why_this_matters: string;
    major_steps: string[];
    estimated_complexity: "low" | "medium" | "high" | "very_high";
  };
  architecture: {
    detailed_breakdown: string;
    file_modifications: string[];
    testing_steps: string[];
    edge_cases: string[];
    estimated_time: string;
  };
  key_concepts: Array<{
    concept: string;
    explanation: string;
    context_in_task: string;
  }>;
  suggestions_out_of_scope?: string[];
}

async function callClaude(prompt: string): Promise<AnalyzeFullResponse> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt = `You are a senior software architect helping a junior-to-mid developer understand tasks before coding.

Output ONLY valid JSON with no additional text. Use escaped newline (\\\\n) inside string values, never literal newlines.

You MUST keep the understanding and architecture STRICTLY within the scope of the task card description and any explicit notes from the user. Do NOT add extra architecture work, refactors, or improvements that were not requested. If you have ideas that go beyond the task card, put them ONLY in "suggestions_out_of_scope".

The JSON must match this exact structure:
{
  "understanding": {
    "high_level_goal": "string - what the task accomplishes (based ONLY on the task card)",
    "why_this_matters": "string - business/technical reason this is important (derived from the task card)",
    "major_steps": ["array of strings - main implementation steps that are required to complete the task"],
    "estimated_complexity": "low|medium|high|very_high"
  },
  "architecture": {
    "detailed_breakdown": "string - step-by-step implementation guide (only for in-scope work)",
    "file_modifications": ["array of files to create/modify that are required for this task"],
    "testing_steps": ["array of testing approaches for this task"],
    "edge_cases": ["array of edge cases to handle for this task"],
    "estimated_time": "string - e.g., '2-4 hours'"
  },
  "key_concepts": [
    {
      "concept": "string - technical term",
      "explanation": "string - beginner-friendly explanation",
      "context_in_task": "string - how it applies to this task"
    }
  ],
  "suggestions_out_of_scope": [
    "Optional improvements or ideas that are NOT required to complete the task"
  ]
}

Scope rules:
- All major_steps and architecture content must describe only work required to complete the task card.
- Do NOT include refactors, extra fields, or broader architecture changes inside understanding/architecture if they are not clearly requested.
- Any idea that goes beyond the task card goes ONLY into suggestions_out_of_scope.
- suggestions_out_of_scope may be an empty array when there are no extra ideas.

Use beginner-friendly language. Be detailed in architecture for implementation guidance, but stay strictly within scope.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  // Try to parse JSON, with repair logic if needed
  let parsed: AnalyzeFullResponse;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse Claude response as JSON');
    }
  }
  
  return parsed;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params;
    
    // Get the task
    const task = await getTask(projectId, taskId);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task status to analyzing
    await updateTask(projectId, taskId, { status: 'analyzing' });
    
    // Build the prompt from task description and cursor repo scan
    const prompt = `Please analyze this development task and provide a comprehensive analysis:

Task Title: ${task.title}

Task Description:
${task.card_description}

${task.cursor_repo_scan ? `Repository Context (Cursor scan):
${task.cursor_repo_scan}` : ''}

Provide a complete analysis with understanding, architecture, and key concepts.`;

    // Call Claude for full analysis
    const result = await callClaude(prompt);
    
    // Update task with analysis results
    const updatedTask = await updateTask(projectId, taskId, {
      status: 'ready',
      understanding: result.understanding,
      architecture: result.architecture,
      key_concepts: result.key_concepts,
    });
    
    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Error in analyze-full:', error);
    
    // Try to update task status to failed
    try {
      const { id: projectId, taskId } = await params;
      await updateTask(projectId, taskId, { status: 'draft' });
    } catch {
      // Ignore cleanup errors
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
