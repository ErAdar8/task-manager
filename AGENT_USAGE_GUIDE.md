# Agent Usage Guide (Claude/GPT)

This guide explains the best way to use the agent for:

- understanding tasks deeply
- generating practical architecture
- improving your learning over time
- minimizing Anthropic API usage to save cost

---

## 1) Main Objective

Use the agent to turn unclear tasks into clear execution plans with minimum waste:

1. Clarify the task.
2. Generate architecture only when ready.
3. Implement with strict scope.
4. Capture learnings during execution.

Target flow:

`Draft -> Understanding -> Architecture -> In Progress -> Completed`

---

## 2) Cost-Saving Policy (Minimum API Calls)

Default budget per task: **2 Anthropic calls max**

1. **Understanding call** (Phase 1)
2. **Architecture call** (Phase 2)

Only make extra calls if output is clearly unusable.

### Rules to reduce calls

- Always create as **Draft** first if the task is not fully clear.
- Add notes, constraints, and acceptance criteria before Analyze.
- Bundle all clarification questions into a single request.
- Prefer editing understanding manually instead of regenerating repeatedly.
- Regenerate architecture only when there is real scope/quality failure.

---

## 3) Best Workflow

## Step A: Create Draft (No API)

Use `Create Task Only` when collecting thoughts.

Fill:

- title
- raw task card
- constraints
- notes
- acceptance criteria

Then save.

## Step B: Analyze Task (API Call #1)

Click `Analyze Task Now` after draft is clear.

You should get:

- high-level goal
- why it matters
- major implementation steps
- key concepts

Review and correct before Phase 2.

## Step C: Build Architecture (API Call #2)

Approve understanding and generate architecture once.

Architecture should include:

- actionable step-by-step plan
- file-level changes
- testing steps
- edge cases

## Step D: Implement + Learn (No API)

Use Notes tab during implementation.

When you discover something useful:

- select note text
- click `+ Add Note to Learning`
- add optional category

This creates reusable knowledge immediately.

---

## 4) How to Write Good Requests to the Agent

Use this message structure every time:

1. **Task**: one-line summary
2. **Goal**: expected outcome/value
3. **In Scope**: what can be changed
4. **Out of Scope**: what must not be touched
5. **Constraints**: minimal changes, no unrelated refactor
6. **Done Criteria**: exact checks for completion

### Short prompt template

```text
Task: <one sentence>
Goal: <business/user outcome>
In scope:
- ...
Out of scope:
- ...
Constraints:
- minimal changes only
- no unrelated refactor
- no extra features
Done when:
1) ...
2) ...
Need from agent:
- task understanding first
- architecture only after approval
```

---

## 5) Prompt Pack You Can Reuse

## A) Understanding prompt

```text
Generate task understanding only.
Focus on:
1) high-level goal
2) why this matters
3) major implementation steps (practical only)
4) key concepts to understand
Keep it beginner-friendly and concise.
```

## B) Clarifications prompt

```text
Clarify these concepts in one response:
- ...
- ...
For each concept: explain it simply and how it applies to this task.
```

## C) Architecture prompt

```text
Generate implementation architecture with:
- ordered implementation plan
- exact files likely to change
- testing checklist
- edge cases
- estimated effort
Keep scope strict and minimal.
```

## D) Regeneration prompt (only if needed)

```text
Regenerate architecture with these fixes only:
- ...
- ...
Do not add unrelated changes.
```

---

## 6) Learning Optimization Method

For each learning, store:

- **What changed**
- **Why it works**
- **How to reuse it next time**

Suggested categories:

- API Design
- State Management
- Debugging
- Data Modeling
- Performance
- Testing

---

## 7) Quality Gate Before Extra API Calls

Before regenerating architecture, ask:

1. Is scope wrong?
2. Are key files/steps missing?
3. Is sequencing broken?
4. Is output not actionable?

If all answers are "no", do not regenerate.

---

## 8) Anti-Patterns to Avoid

- Running Analyze on vague task text
- Making multiple tiny regeneration requests
- Mixing unrelated tasks in one prompt
- Allowing open-ended refactors
- Calling API before writing constraints

---

## 9) Recommended Daily Operating Pattern

1. Draft new tasks without API.
2. Analyze only tasks you are ready to execute.
3. Approve once and generate architecture once.
4. Implement in small steps.
5. Save learnings as you go.
6. Reuse learnings in future tasks.

---

## 10) One-Message Operating Command

Use this message when starting any important task:

```text
Use a cost-efficient workflow.
First produce understanding only.
Do not generate architecture yet.

Task: <title>
Goal: <outcome>
In scope: <...>
Out of scope: <...>
Constraints: minimal changes, no unrelated refactor, no extra features.
Done criteria:
1) ...
2) ...

After I approve understanding, generate architecture once with all clarifications bundled.
```

