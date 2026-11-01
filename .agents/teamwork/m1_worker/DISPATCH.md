# Dispatch for Milestone 1 Worker

Scope: Milestone 1 (Brand Theme Alignment & Core Infrastructure)
Working Directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m1_worker\
Read: ORIGINAL_REQUEST.md, PROJECT.md, explorer_survey_1/analysis.md, explorer_survey_3/analysis.md.
## 2026-10-31T21:58:12Z

You are Worker 1 (M1 Core Infrastructure & Theme Worker).
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m1_worker\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Master project blueprint: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- Architecture report: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_1\analysis.md
- Theme & testing report: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_3\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Scope: Milestone 1 (M1) — Brand Theme Alignment & Core Infrastructure
Exclusive file ownership for M1:
- tailwind.config.js
- index.html
- vite.config.js
- public/manifest.json
- src/index.css
- src/components/common/AppUpdateNotifier.jsx
- src/components/common/AX_InstallPwaBanner.jsx
- src/components/common/AX_WelcomeOverlay.jsx
- src/components/dashboard/AX_SalesFlowChart.jsx
- src/components/dashboard/AX_StockDistributionChart.jsx
- src/services/imageKitService.js (new file)
- src/utils/permissionsConfig.js
- src/store/useAXStore.js (base client/supplier/sales_rep store extensions)
- src/store/initialData.js (base mock data enrichments)

Requirements to Implement:
1. Update Tailwind theme palette in tailwind.config.js to meat red / burgundy:
   - Primary: DEFAULT: '#991b1b', container: '#450a0a', on-container: '#fecaca', dark: '#7f1d1d'
   - Secondary: DEFAULT: '#b91c1c', container: '#fee2e2', on-container: '#991b1b', hover: '#991b1b'
2. Update theme color references in index.html, public/manifest.json, vite.config.js, and src/index.css scrollbar.
3. Replace hardcoded blue colors in AppUpdateNotifier, AX_InstallPwaBanner, AX_WelcomeOverlay, and charts with the new meat red / burgundy tokens.
4. Implement src/services/imageKitService.js with:
   - Direct client upload using ImageKit credentials with local base64 preview fallback.
   - getTransformedUrl(url, { width, height, quality }) adding ImageKit URL transformation parameters (/tr:w-...,h-.../).
5. Extend src/utils/permissionsConfig.js to include permissions for 'customers', 'suppliers', and 'sales_reps'.
6. Extend src/store/useAXStore.js and src/store/initialData.js to prepare state for clients, suppliers, salesReps, and salesRepLedger with initial mock data.
7. Verification: Run the test suite using run_command (npm test). Ensure all 198 existing tests pass with 0 failures, and all files stay <= 500 lines.

Outputs:
1. Write changes report to: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m1_worker\changes.md
2. Write structured handoff to: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m1_worker\handoff.md
3. Send message to parent via send_message when complete.
