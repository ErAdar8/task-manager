-- ============================================================
-- Task Helper — demo seed data
-- Story: A dev building a crypto wallet app + a SaaS side project
-- Run AFTER demo-schema.sql. Safe to re-run (truncates first).
-- ============================================================

truncate table learnings cascade;
truncate table notes     cascade;
truncate table tasks     cascade;
truncate table projects  cascade;

-- ════════════════════════════════════════════════════════════
-- PROJECTS
-- ════════════════════════════════════════════════════════════

insert into projects (id, user_id, name, description, repo_scan, total_tasks, completed_tasks, created_at, updated_at) values

('proj_demo_001', 'demo_user',
 'EOA Wallet — Mobile',
 'Flutter-based Ethereum wallet. Supports zkSync Sepolia testnet, Uniswap V3 swaps, ERC-20 tokens, and hardware-wallet signing.',
 'Flutter monorepo. Entry: lib/main.dart. State: Riverpod providers in lib/shared/providers/. Screens in lib/features/. Network config in lib/config/network_config.dart. Swap logic in lib/data/services/swap_service.dart.',
 8, 4,
 now() - interval '21 days', now() - interval '1 day'),

('proj_demo_002', 'demo_user',
 'Task Helper — Open Source',
 'The very app you are looking at. Next.js 15, Supabase, Claude API. Helps developers break tasks into mini-prompts for Cursor.',
 'Next.js App Router. API routes under app/api/. Storage layer in lib/storage/. Claude analysis in lib/task-analyze-claude.ts. Schemas in schemas/.',
 5, 2,
 now() - interval '10 days', now() - interval '2 hours'),

('proj_demo_003', 'demo_user',
 'SaaS Billing Integration',
 'Stripe billing for a B2B SaaS. Monthly/annual plans, usage-based pricing, webhook handler, customer portal.',
 'Node.js + Express backend. Stripe SDK v12. Webhook endpoint at /api/webhooks/stripe. Subscription model in models/subscription.ts.',
 3, 1,
 now() - interval '5 days', now() - interval '3 hours');


-- ════════════════════════════════════════════════════════════
-- TASKS — EOA Wallet
-- ════════════════════════════════════════════════════════════

insert into tasks (id, project_id, user_id, title, raw_input, status, analysis_mode, last_analysis_kind,
                   task_notes, work_process, completed_at, created_at, updated_at,
                   canonical_execute_result, understanding) values

-- ── Task 1: completed ──────────────────────────────────────
('task_demo_001', 'proj_demo_001', 'demo_user',
 'Fix seed phrase verification — wallet saves before user confirms backup',
 'BUG: createWallet() persists the mnemonic to secure storage immediately when CreateWalletPage loads, before the user reaches the verify step. A user who closes the app mid-onboarding ends up with a wallet saved but no verified backup.

Fix: split wallet creation into two phases:
1. Generate mnemonic in memory only (no persistence)
2. Persist to secure storage only after successful 3-word verification in VerifyBackupPage

If the user abandons verification, nothing should be saved.',
 'completed', 'execute', 'execute',
 'Split WalletAccountNotifier into generateMnemonic() and persistWallet(). Hooked VerifyBackupPage to call persist on success. Tested by killing the app mid-verify — no wallet left behind.',
 'Traced the bug through providers.dart → create_wallet_page.dart → verify_backup_page.dart. Realised the Riverpod provider was doing too much in one call. Refactored into two actions and added a "pendingMnemonic" state to the provider.',
 now() - interval '14 days',
 now() - interval '20 days', now() - interval '14 days',
 '{
   "high_level_goal": "Split wallet creation into a two-phase flow so the mnemonic is only persisted after the user passes the 3-word verification challenge.",
   "topic_cards": [
     {
       "id": "provider-split",
       "title": "Split WalletAccountNotifier into generate + persist phases",
       "description": "Currently createWallet() does both mnemonic generation and secure-storage write in one call. Introduce generatePendingWallet() that stores only in provider state, and confirmWallet() that flushes to secure storage.",
       "files_involved": ["lib/shared/providers/providers.dart", "lib/features/onboarding/presentation/pages/create_wallet_page.dart"]
     },
     {
       "id": "verify-page",
       "title": "Wire VerifyBackupPage to call confirmWallet on success",
       "description": "VerifyBackupPage currently navigates forward regardless of provider state. Update it to call ref.read(walletProvider.notifier).confirmWallet() only after the 3-word check passes.",
       "files_involved": ["lib/features/onboarding/presentation/pages/verify_backup_page.dart", "lib/features/onboarding/presentation/pages/backup_wallet_page.dart"]
     }
   ],
   "execution_plan": [
     {"stage_number": 1, "stage_title": "Add pendingMnemonic state to provider", "topic_card_id": "provider-split", "mini_prompt": "In lib/shared/providers/providers.dart, add a pendingMnemonic field to WalletState. Rename createWallet() to generatePendingWallet() — it should generate the mnemonic and store it only in Riverpod state (not in FlutterSecureStorage). Add a separate confirmWallet() method that reads pendingMnemonic from state and writes it to secure storage. Keep the old createWallet() signature as a deprecated alias pointing to generatePendingWallet() + confirmWallet() for now."},
     {"stage_number": 2, "stage_title": "Update CreateWalletPage to call generatePendingWallet", "topic_card_id": "provider-split", "mini_prompt": "In lib/features/onboarding/presentation/pages/create_wallet_page.dart, replace the createWallet() call with generatePendingWallet(). Do not navigate until the provider reports pendingMnemonic is set."},
     {"stage_number": 3, "stage_title": "Wire VerifyBackupPage to confirmWallet on success", "topic_card_id": "verify-page", "mini_prompt": "In lib/features/onboarding/presentation/pages/verify_backup_page.dart, after the 3-word verification passes, call ref.read(walletProvider.notifier).confirmWallet() before navigating to the next screen. Add error handling for the case where confirmWallet throws (e.g. secure storage write fails)."}
   ],
   "key_concepts": [
     {"term": "Riverpod provider state", "explanation": "Riverpod keeps state in memory; it is not persisted across app restarts unless explicitly written to storage."},
     {"term": "FlutterSecureStorage", "explanation": "The secure-storage plugin encrypts values in the OS keychain. Writes are async and can fail if the device is locked."}
   ]
 }'::jsonb,
 '{"high_level_goal": "Two-phase wallet creation", "why_this_matters": "Users lose funds if they skip backup", "major_steps": [], "key_concepts": [], "estimated_time": "2h", "stages": [{"title": "Split provider", "goal": "Separate generate from persist", "tasks": ["Add pendingMnemonic state", "Rename createWallet"], "completion_criteria": ["No storage write on CreateWalletPage load"], "stage_number": 1}, {"title": "Wire verify page", "goal": "Persist only after verification", "tasks": ["Call confirmWallet on success"], "completion_criteria": ["Killing app mid-flow leaves no wallet"], "stage_number": 2}]}'::jsonb),

-- ── Task 2: completed ──────────────────────────────────────
('task_demo_002', 'proj_demo_001', 'demo_user',
 'Fix transaction history — empty screen due to missing contract addresses',
 'TransactionHistoryService fails silently because zkSync Sepolia contract addresses (wreckTokenAddress, stablecoinAddress) are empty strings in network_config.dart. EthereumAddress.fromHex("") throws and the service returns an empty list with no error shown.

Fix:
1. Set the correct contract addresses in network_config.dart
2. Add try/catch in the service so one bad address doesn''t wipe the whole list
3. Add clickable Explorer links (using explorerUrl from NetworkConfig) to each TX tile in activity_page.dart',
 'completed', 'execute', 'execute',
 'Contract addresses were set. Also discovered the RPC node was rate-limiting us at >10 req/s — added a 200ms debounce on the history fetch.',
 'Found the issue by adding print statements to TransactionHistoryService. The empty string was causing EthereumAddress.fromHex to throw before any network call was made.',
 now() - interval '10 days',
 now() - interval '18 days', now() - interval '10 days',
 null, null),

-- ── Task 3: in_progress ────────────────────────────────────
('task_demo_003', 'proj_demo_001', 'demo_user',
 'Add biometric authentication gate before sending transactions',
 'Security requirement: before any send/swap transaction is signed and broadcast, the user must authenticate with FaceID / fingerprint via local_auth.

Scope:
- Gate the "Confirm send" button in SendPage
- Gate the "Confirm swap" button in SwapPage
- If biometric fails or is unavailable, fall back to PIN entry
- Store preference (biometric vs PIN) in SharedPreferences
- Unit test the auth gate logic',
 'in_progress', 'execute', 'execute',
 'local_auth package added to pubspec. BiometricService class created. Wired into SendPage — working. SwapPage gate still TODO. PIN fallback not started.',
 '',
 null,
 now() - interval '8 days', now() - interval '1 day',
 '{
   "high_level_goal": "Add a biometric / PIN authentication gate before any transaction is signed and broadcast.",
   "topic_cards": [
     {
       "id": "biometric-service",
       "title": "Create BiometricService wrapping local_auth",
       "description": "Centralise all biometric auth logic in a single service. Expose authenticate() that returns a bool. Handle unavailable hardware, permanent denial, and fallback to PIN.",
       "files_involved": ["lib/data/services/biometric_service.dart", "pubspec.yaml"]
     },
     {
       "id": "send-page-gate",
       "title": "Gate SendPage confirm button",
       "description": "In SendPage, disable the confirm button until BiometricService.authenticate() resolves true. Show a loading state during auth. Handle cancellation gracefully.",
       "files_involved": ["lib/features/wallet/presentation/pages/send_page.dart"]
     },
     {
       "id": "swap-page-gate",
       "title": "Gate SwapPage confirm button",
       "description": "Same pattern as SendPage. Reuse the BiometricService — do not duplicate logic.",
       "files_involved": ["lib/features/wallet/presentation/pages/swap_page.dart"]
     }
   ],
   "execution_plan": [
     {"stage_number": 1, "stage_title": "Add local_auth and create BiometricService", "topic_card_id": "biometric-service", "mini_prompt": "Add local_auth: ^2.2.0 to pubspec.yaml. Create lib/data/services/biometric_service.dart with a BiometricService class. Expose authenticate({String reason}) → Future<bool>. Handle LocalAuthException: notEnrolled (return false), notAvailable (return false, caller will show PIN). Add a Riverpod provider for this service."},
     {"stage_number": 2, "stage_title": "Gate SendPage confirm button", "topic_card_id": "send-page-gate", "mini_prompt": "In lib/features/wallet/presentation/pages/send_page.dart, wrap the confirm-send handler: call ref.read(biometricServiceProvider).authenticate(reason: ''Confirm send transaction'') before calling the send service. If it returns false, show a SnackBar ''Authentication required''. Show a CircularProgressIndicator while awaiting. Do not sign or broadcast if authentication fails."},
     {"stage_number": 3, "stage_title": "Gate SwapPage confirm button", "topic_card_id": "swap-page-gate", "mini_prompt": "Apply the identical gate pattern from stage 2 to lib/features/wallet/presentation/pages/swap_page.dart. Reuse the biometricServiceProvider. Reason string: ''Confirm swap''."},
     {"stage_number": 4, "stage_title": "Add PIN fallback + preference storage", "topic_card_id": "biometric-service", "mini_prompt": "Extend BiometricService: if authenticate() returns false AND biometric is unavailable (LocalAuthException.notAvailable), show a PIN entry dialog (simple 6-digit TextField). Store the user''s preference (''biometric'' vs ''pin'') in SharedPreferences under key auth_method. Read this preference on app start to skip the biometric prompt for PIN users."}
   ],
   "key_concepts": [
     {"term": "local_auth", "explanation": "Flutter plugin that wraps iOS LocalAuthentication and Android BiometricPrompt APIs."},
     {"term": "Riverpod provider isolation", "explanation": "Wrapping BiometricService in a provider lets you override it in tests with a mock that always returns true/false."}
   ]
 }'::jsonb,
 null),

-- ── Task 4: in_progress ────────────────────────────────────
('task_demo_004', 'proj_demo_001', 'demo_user',
 'Uniswap V3 — ETH output returns WETH, not native ETH',
 'Known bug: when a user swaps any token → ETH, they receive WETH in their wallet instead of native ETH. This is because SwapRouter02.exactInputSingle always outputs to the ERC-20 WETH contract.

Fix: after the swap, call WETH.withdraw(amount) to unwrap WETH → ETH before updating the UI balance. Alternatively use SwapRouter02 with the unwrapWETH9 flag.',
 'in_progress', 'execute', 'execute',
 'Researched SwapRouter02 ABI. The cleanest fix is to add a second transaction (WETH.withdraw) rather than rewriting the swap path. Drafted the code but haven''t tested on-chain yet.',
 '',
 null,
 now() - interval '4 days', now() - interval '5 hours',
 null, null),

-- ── Task 5: ready (analyzed, not started) ─────────────────
('task_demo_005', 'proj_demo_001', 'demo_user',
 'Tab navigation — switching tabs should reset to root screen',
 'In app_shell.dart, goBranch is called with initialLocation: false when switching tabs, which preserves nested navigation history. This means if the user drills into Settings → About, then switches to Wallet and back, they land on About instead of Settings root.

Fix: call goBranch with initialLocation: true when the user taps a tab they are already on (double-tap to root), and navigate to the tab root when switching from a different tab.',
 'ready', 'execute', 'execute',
 '', '',
 null,
 now() - interval '2 days', now() - interval '2 days',
 '{
   "high_level_goal": "Fix tab navigation so switching tabs always lands on the tab root screen, not a nested sub-screen.",
   "topic_cards": [
     {
       "id": "go-router-branch",
       "title": "Understand GoRouter StatefulShellRoute branch navigation",
       "description": "StatefulShellRoute.indexedStack keeps a navigator per branch. goBranch(index, initialLocation: true) resets the branch stack; initialLocation: false preserves it. The fix is to pass initialLocation: true on cross-tab switch.",
       "files_involved": ["lib/app_shell.dart"]
     }
   ],
   "execution_plan": [
     {"stage_number": 1, "stage_title": "Update goBranch call in app_shell.dart", "topic_card_id": "go-router-branch", "mini_prompt": "In lib/app_shell.dart, find the NavigationBar onDestinationSelected handler. Change the goBranch call to always pass initialLocation: true when the selected index differs from the current branch index. When the user taps the already-active tab (same index), also call goBranch with initialLocation: true to reset to root (double-tap-to-root UX). Remove the initialLocation: false branch entirely."}
   ],
   "key_concepts": [
     {"term": "StatefulShellRoute", "explanation": "GoRouter widget that maintains separate navigation stacks per tab, preserving scroll position and back stack independently."},
     {"term": "initialLocation", "explanation": "When true, goBranch navigates to the branch''s initial route, discarding any nested history."}
   ]
 }'::jsonb,
 null),

-- ── Task 6: draft ─────────────────────────────────────────
('task_demo_006', 'proj_demo_001', 'demo_user',
 'Add push notifications for incoming transactions',
 'Users want to be notified when ETH or tokens arrive in their wallet even when the app is in the background.

Approach: use Firebase Cloud Messaging (FCM). A backend worker (Cloud Function or simple cron) polls the RPC for new blocks, checks watched addresses, and sends a push via FCM if a relevant transaction is found.',
 'draft', null, null,
 '', '',
 null,
 now() - interval '1 day', now() - interval '1 day',
 null, null);


-- ════════════════════════════════════════════════════════════
-- TASKS — Task Helper (meta!)
-- ════════════════════════════════════════════════════════════

insert into tasks (id, project_id, user_id, title, raw_input, status, analysis_mode, last_analysis_kind,
                   task_notes, work_process, completed_at, created_at, updated_at,
                   canonical_execute_result) values

('task_demo_101', 'proj_demo_002', 'demo_user',
 'Migrate storage layer from local JSON files to Supabase',
 'All data currently lives in local JSON files on disk. Need to migrate to Supabase (Postgres) so the app works across devices and can be deployed publicly.

Steps:
1. Design schema
2. Apply via migration
3. Rewrite lib/storage/ to use Supabase JS client
4. Migrate existing data
5. Deploy to Vercel',
 'completed', 'execute', 'execute',
 'Migration complete. 63 tasks, 7 projects, 87 learnings moved. One gotcha: analysis_mode stored as null in DB but Zod schema expected undefined — fixed with .nullable().optional().',
 'Wrote a one-shot migration script. Ran into WebSocket issues with Supabase client on Node 20 — fixed by passing ws as the realtime transport.',
 now() - interval '5 days',
 now() - interval '9 days', now() - interval '5 days',
 null),

('task_demo_102', 'proj_demo_002', 'demo_user',
 'Fix tasks API returning HTTP 500 on Vercel',
 'After deploying to Vercel, GET /api/tasks?projectId=... returns 500 with an empty body (Content-Length: 0). The projects API works fine. Local dev works fine.

Root cause investigation needed. Suspected: Supabase client WebSocket init failing in Node 20 serverless.',
 'completed', 'execute', 'execute',
 'Root cause: Supabase realtime client checks for WebSocket during createClient() — not just on connect. Vercel Node 20 has no native WebSocket. Fixed by passing ws package as the transport option.',
 'Tested with curl -v to confirm empty body. Added try/catch to GET handler. Discovered Content-Length: 0 = module-level crash. Tested the fix locally first.',
 now() - interval '3 days',
 now() - interval '6 days', now() - interval '3 days',
 null),

('task_demo_103', 'proj_demo_002', 'demo_user',
 'Remove duplicate analysis section shown below key concepts',
 'Execute-mode tasks show two analysis sections: the canonical one (with mini-prompts, copy buttons) rendered by AnalysisResultView, then a second legacy section (same content, no copy buttons) from task.understanding.

Fix: suppress the legacy task.understanding block when any canonical_*_result is present.',
 'completed', 'execute', 'execute',
 'One-line fix in page.tsx: added || (task.canonical_execute_result ?? ...) to the condition.',
 'Read the full page.tsx to understand rendering order. Found both AnalysisResultView and the raw understanding block rendering back to back.',
 now() - interval '2 days',
 now() - interval '3 days', now() - interval '2 days',
 null),

('task_demo_104', 'proj_demo_002', 'demo_user',
 'Set up demo Supabase project with open-source seed data',
 'Create a second Supabase project for the public/open-source version of the app. Schema should match the private DB. Seed it with realistic demo data that tells a story of a developer working on a real project.',
 'in_progress', 'execute', 'execute',
 '', '',
 null,
 now(), now(),
 null),

('task_demo_105', 'proj_demo_002', 'demo_user',
 'Add public read-only domain for portfolio view',
 'Create a second Vercel deployment pointing at the demo Supabase project. This version should be read-only (no creating tasks) and suitable for sharing on a resume or portfolio.',
 'draft', null, null,
 '', '',
 null,
 now() - interval '1 hour', now() - interval '1 hour',
 null);


-- ════════════════════════════════════════════════════════════
-- TASKS — SaaS Billing
-- ════════════════════════════════════════════════════════════

insert into tasks (id, project_id, user_id, title, raw_input, status, analysis_mode, last_analysis_kind,
                   task_notes, work_process, completed_at, created_at, updated_at) values

('task_demo_201', 'proj_demo_003', 'demo_user',
 'Implement Stripe webhook handler for subscription lifecycle events',
 'Need to handle: customer.subscription.created, updated, deleted, and invoice.payment_failed. On payment_failed after 3 retries, downgrade the account to the free tier.',
 'completed', 'execute', 'execute',
 'Used stripe.webhooks.constructEvent() to validate signatures. Stored the Stripe customer ID on the User model for lookups.',
 'Tested with Stripe CLI stripe trigger invoice.payment_failed. Race condition found between webhook and UI — fixed with idempotency key.',
 now() - interval '2 days',
 now() - interval '5 days', now() - interval '2 days'),

('task_demo_202', 'proj_demo_003', 'demo_user',
 'Build customer portal redirect for plan upgrades/cancellations',
 'Instead of building our own billing UI, redirect to Stripe''s hosted customer portal. User clicks "Manage billing" → server creates a portal session → redirect to Stripe.',
 'in_progress', 'execute', 'execute',
 'Portal session creation working. Return URL set to /dashboard?billing=success. Still need to handle the case where a user has no Stripe customer ID yet.',
 '',
 null,
 now() - interval '3 days', now() - interval '4 hours'),

('task_demo_203', 'proj_demo_003', 'demo_user',
 'Add usage-based pricing for API calls above plan limit',
 'Pro plan includes 10k API calls/month. Above that, charge $0.001 per call. Needs: call counter per org (Redis), nightly job to report usage to Stripe Billing Meter, overage invoice line items.',
 'draft', null, null,
 '', '',
 null,
 now() - interval '1 day', now() - interval '1 day');


-- ════════════════════════════════════════════════════════════
-- SYNC PROJECT TASK COUNTS
-- ════════════════════════════════════════════════════════════

update projects p set
  total_tasks     = (select count(*)                                   from tasks t where t.project_id = p.id),
  completed_tasks = (select count(*) filter (where t.status = 'completed') from tasks t where t.project_id = p.id);


-- ════════════════════════════════════════════════════════════
-- LEARNINGS
-- ════════════════════════════════════════════════════════════

insert into learnings (id, user_id, title, content, category,
                       source_type, source_task_id, source_task_title,
                       source_project_id, source_project_name, created_at) values

('learn_demo_001', 'demo_user',
 'Riverpod: split state mutations into fine-grained methods',
 'When a single provider method does too much (generate + persist + navigate), bugs hide at phase boundaries. Split into generateX() and confirmX() methods. The provider holds the in-flight state; the UI calls confirm only after user verification. This pattern also makes unit testing trivial — you can test generate and confirm independently.',
 'Flutter / State Management',
 'task', 'task_demo_001', 'Fix seed phrase verification',
 'proj_demo_001', 'EOA Wallet — Mobile',
 now() - interval '14 days'),

('learn_demo_002', 'demo_user',
 'Always validate contract address format before any RPC call',
 'EthereumAddress.fromHex("") throws synchronously. If this is inside an async service that returns a list, the exception propagates and you get an empty list with no error shown in the UI. Wrap each address parse in a try/catch and skip/log bad addresses rather than aborting the whole fetch.',
 'Blockchain / Ethereum',
 'task', 'task_demo_002', 'Fix transaction history',
 'proj_demo_001', 'EOA Wallet — Mobile',
 now() - interval '10 days'),

('learn_demo_003', 'demo_user',
 'Supabase JS + Node 20: pass ws as the realtime transport',
 'Supabase realtime client calls new WebSocket() during createClient() initialization — not lazily on first subscription. Node 20 has no native WebSocket. Fix: import ws from "ws" and pass it as { realtime: { transport: ws } } to createClient(). The reconnectAfterMs workaround does NOT help — it only affects reconnection, not the initial socket factory check.',
 'Supabase / Infrastructure',
 'task', 'task_demo_102', 'Fix tasks API returning 500 on Vercel',
 'proj_demo_002', 'Task Helper — Open Source',
 now() - interval '3 days'),

('learn_demo_004', 'demo_user',
 'Content-Length: 0 on a 500 = module-level crash, not handler error',
 'If a Next.js serverless function returns HTTP 500 with Content-Length: 0, the crash happened before any response was written — i.e., during module initialisation or import. A try/catch inside the handler cannot catch this. Diagnose by simplifying imports one by one, or adding a trivial route that returns immediately to confirm the route itself is reachable.',
 'Next.js / Debugging',
 'task', 'task_demo_102', 'Fix tasks API returning 500 on Vercel',
 'proj_demo_002', 'Task Helper — Open Source',
 now() - interval '3 days'),

('learn_demo_005', 'demo_user',
 'Stripe webhook signature validation is non-negotiable',
 'Always use stripe.webhooks.constructEvent(rawBody, signature, secret) before processing any webhook event. If you parse req.body as JSON before this call, the signature check will always fail because the body has been transformed. Use express.raw({ type: ''application/json'' }) for the webhook route, not express.json().',
 'Stripe / Payments',
 'task', 'task_demo_201', 'Stripe webhook handler',
 'proj_demo_003', 'SaaS Billing Integration',
 now() - interval '2 days'),

('learn_demo_006', 'demo_user',
 'Stripe CLI for local webhook testing',
 'stripe listen --forward-to localhost:3000/api/webhooks/stripe\nstripe trigger invoice.payment_failed\n\nThis creates a real test event and forwards it to your local server. Far faster than setting up ngrok. The CLI prints the webhook signing secret — copy it into STRIPE_WEBHOOK_SECRET in your .env.',
 'Stripe / Dev Tools',
 'task', 'task_demo_201', 'Stripe webhook handler',
 'proj_demo_003', 'SaaS Billing Integration',
 now() - interval '2 days'),

('learn_demo_007', 'demo_user',
 'GoRouter: initialLocation: true resets branch stack on tab switch',
 'In StatefulShellRoute, goBranch(index, initialLocation: false) preserves the branch navigator stack — so switching away and back lands the user mid-flow, not at the root. Pass initialLocation: true to reset. Apply this on every cross-tab navigation; only preserve stack state within the same tab session.',
 'Flutter / Navigation',
 'task', 'task_demo_005', 'Tab navigation reset',
 'proj_demo_001', 'EOA Wallet — Mobile',
 now() - interval '1 day'),

-- standalone general learnings (not tied to a task)
('learn_demo_008', 'demo_user',
 'Zod: use .nullable().optional() for DB fields that store null',
 'Zod .optional() accepts undefined but not null. Postgres stores missing values as NULL. When a Supabase row has NULL in a column, the JS client returns null — which fails .optional() validation. Use .nullable().optional() for any column that can be NULL in the DB. Also normalise null → undefined in your row-mapping function if your app logic expects undefined.',
 'TypeScript / Zod',
 'general', null, null, null, null,
 now() - interval '5 days'),

('learn_demo_009', 'demo_user',
 'Vercel deployment not updating? Check if GitHub auto-deploy is connected',
 'Pushing to GitHub does NOT automatically redeploy on Vercel unless the project is connected to the repo via Vercel''s GitHub integration. If you deployed manually (drag-and-drop or CLI without linking), Vercel runs the old bundle forever. Go to Project → Settings → Git and connect the repo for auto-deploy on every push to main.',
 'Vercel / Deployment',
 'general', null, null, null, null,
 now() - interval '3 days');


-- ════════════════════════════════════════════════════════════
-- NOTES
-- ════════════════════════════════════════════════════════════

insert into notes (id, user_id, title, content, tags, created_at) values

('note_demo_001', 'demo_user',
 'zkSync Sepolia — useful RPC endpoints & contract addresses',
 'RPC: https://sepolia.era.zksync.dev
Chain ID: 300
Explorer: https://sepolia.explorer.zksync.io

WETH: 0x20b28B1e4665FFf290650586ad76E977EAb90c5d
USDC (test): 0x0faF6df7054946141266420b43783387A78d82A
Uniswap V3 Factory: 0x4408C0C25a55a1b9d8D91D55F6Df1BEb0A7b0a2a
SwapRouter02: 0x99c56385daBCE3E81d8499d0b8d0257aBC07E8A4

Faucet: https://faucet.quicknode.com/zksync/sepolia',
 ARRAY['blockchain', 'zksync', 'reference'],
 now() - interval '15 days'),

('note_demo_002', 'demo_user',
 'Claude API — analysis prompt tips',
 'For reliable JSON output from Claude:
1. End your prompt with: "Respond with ONLY valid JSON. No markdown fences, no commentary."
2. Use claude-opus-4 for complex structured analysis, sonnet for lighter tasks
3. Set max_tokens to at least 4000 for tasks with many stages
4. If the response is truncated, the JSON will be malformed — detect this with a try/catch on JSON.parse and retry with a shorter prompt

Typical failure modes:
- Model adds a prose intro before the JSON → strip with regex /\{[\s\S]*\}/
- Model adds a trailing comma in an array → use a lenient JSON parser
- Response cut off mid-string → increase max_tokens or reduce task complexity',
 ARRAY['claude', 'api', 'prompt-engineering'],
 now() - interval '7 days'),

('note_demo_003', 'demo_user',
 'Supabase RLS — quick reference for single-user apps',
 'For a single-user / personal tool where auth isn''t needed:
- Disable RLS on all tables (alter table X disable row level security)
- Use the service role key server-side ONLY — never expose it to the browser
- Use the anon key for public/read-only access

If you add multi-user later:
- Enable RLS: alter table X enable row level security
- Add policy: create policy "own rows" on X using (user_id = auth.uid()::text)
- Switch from service role key to using Supabase Auth JWT',
 ARRAY['supabase', 'rls', 'reference'],
 now() - interval '4 days');
