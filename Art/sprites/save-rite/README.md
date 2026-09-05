# Save-Rite placeholder animation handoff

Read the flags before registering these assets. The PNGs are selected deliverables, not a claim that every style or gait check passed. Exact failures and scores are in ../../masters/save-rite/overnight/MORNING-REPORT.md and STRIP-AUDIT.md.

manifest.json maps all characters and facings, records source master paths, SHA-256 hashes, the colour-key rule, frame geometry and seating requirements. No game code was changed. Art remains named Anjali Raval while live CREW says Priya Raval; resolve this mapping explicitly.

Walks contain three 184×295 cells: stride, neutral, opposite stride. Idle is index1; play [0,1,2,1]. Right images mirror each left frame without reordering. Seated images contain only the person and use the existing renderer's approximate facing ratios; test actual chair placement when integrating.

Review the full cast and motion using ../../masters/save-rite/overnight/all-34-v-five-baselines.png and CAST-PREVIEW.html. Browser automation could not open the local HTML under its security policy, so interactive UI verification is pending. The PNG audits do not depend on the viewer.

Raw generations, every retry, exact prompts, cleanup scripts and checkpoints remain in ../../masters/save-rite/overnight/. Built-in image generation was used. Approved Batch1 Light and Batch2 source masters were preserved.
