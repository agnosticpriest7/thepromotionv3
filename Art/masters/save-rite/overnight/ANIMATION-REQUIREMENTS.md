# Animation study and requirements — before generation

Read-only code study: `../../../../index.html`, lines 1031–1058, 1219–1249, 2533–2544, 3511–3552, 5551–5574, 13077–13104, 13172–13234. No game code changed.

## Findings

- All 28 shipped walk files were opened and measured frame by frame. Jax, Karl, Kyle, NWH, Raelee and Rod use 552×295 strips / 184×295 frames. Stacie uses 687×374 / 229×374.
- The art places a stride in column 1, neutral in column 2, the opposite stride in column 3. Live `IDLE_FRAME=1` and `WALK_CYCLE=[0,1,2,1]` agree. The older preceding comment claiming neutral first is wrong.
- Sources do not have identical anchors. Across all facings/frames, content heights are Jax 258–263, Karl 258–263, Kyle 262–268, NWH 257–263, Raelee 263–272, Rod 258–262, Stacie 324–340. New normalized walk deliveries target figure height 262, head top 16, bottom pixel 277 in 184×295 cells. The approved masters remain unchanged at 280px figure height.
- Right is an exact per-frame horizontal mirror for Kyle, NWH and Raelee. Jax differs at 62,826 pixels; Karl 65,303; Rod 62,620; Stacie 123,397. New rights will be derived by mirroring each left frame without reversing frame order.
- Front/back feet step in depth; side views show a forward/rear leg exchange with opposing arm swing. The front body does not turn to profile for the contact poses.
- There are exactly 110 seated files. They are person-only with bent knees/thighs, no chair or furniture. Canvases vary; Kyle is 496×884 in every facing, but content boxes differ substantially (down y71–868, left/right y215–868, up y152–867). The renderer measures content boxes and scales all seated facings against that character's down-pose content height. Matching seated head tops by independently rescaling each facing would distort this convention.
- Source width is not screen size. In this checkout `drawChar` defaults to `U1(38)` frame width, and current callers do not override it. The brief's 45 is not the current constant. It scales by frame width 184, not whole-strip width 552.
- The named current baseline's manually annotated head ratios are 35.74–42.59%, not a uniform 34–36%. The requested literal target remains visible as a separate check; it is not substituted for the measured reference.
- Width/height is pose-dependent. A profile contact pose can be wider than a neutral front without a change of build; all values will be reported rather than forcing every moving silhouette into the neutral-front range.

## Per-character requirement from current code

Every character receives down/up/left/right walk strips. No bat/meltdown sheets.

| ID | Character | Seated requirement | Evidence |
|---|---|---|---|
| 01 | Tyson Beck | Unresolved; walk only | Not in live CREW |
| 02 | Anjali Raval | Four break-chair facings for intended Raval slot; naming flag | Live CREW calls this person Priya Raval, not Anjali |
| 03 | Marguerite Dubois | Four break-chair facings | Live CREW worker |
| 04 | Danika Osei | Four break-chair facings | Live CREW worker |
| 05 | Curtis Lam | Four break-chair facings | Live CREW worker |
| 06 | Bekah Thorne | Four break-chair facings | Live CREW worker |
| 07 | Ade Okonkwo | Unresolved; walk only | Not in live CREW |
| 08 | Russ Pelletier | Four break-chair facings | Live CREW worker |
| 09 | Joon-Ho Bae | Unresolved; walk only | Not in live CREW |
| 10 | Sam Whitecalf | Unresolved; walk only | Not in live CREW |
| 11 | Cheryl Novak | Unresolved; walk only | Not in live CREW |
| 12 | Gita Mahal | Four break-chair facings | Live CREW worker |
| 13 | Vince Carboni | Unresolved; walk only | Not in live CREW |
| 14 | Aleks Petrov | Unresolved; walk only | Not in live CREW |
| 15 | Denise Fung | Unresolved; walk only | Not in live CREW |
| 16 | Bruno Sarr | Four break-chair facings | Live CREW worker |
| 17 | Elaine Kovacs | Unresolved; walk only | Not in live CREW |
| 18 | Manny Reyes | Unresolved; walk only | Not in live CREW |
| 19 | Tova Lindqvist | Unresolved; walk only | Not in live CREW |
| 20 | Doreen Stapp | Four break-chair facings | Live CREW worker |
| 21 | Garret Voss | Four break-chair facings | Live CREW worker; central clipboard retained, arm-swing exception |
| 22 | Lorne Petrie | Four break-chair facings | Live CREW worker |
| 23 | Merv Kastelic | Four break-chair facings | Live CREW worker |
| 24 | Sandrine Pike | Unresolved; walk only | Not in live CREW |
| 25–34 | All ten shoppers individually | None | customer=true; isWorker excludes customers |

The twelve CREW entries all receive `station:true`, including management: they stand during work even inside offices. `isWorker` includes all of them; `deskbound` excludes only Ravinder, who is absent here. `assignBreakSeats` shuffles all eligible staff into the eight real break chairs, so every one of these twelve can sit on different breaks. Station status does not exclude break seating.

None of the new store art is registered in `CHAR_SHEETS`, `SEAT_ART` or the shopper pools yet. Assets and a handoff manifest are delivered for Claude Code; this art run does not change those game mappings. The existing Anjali filename remains intact and its Priya discrepancy is explicit.
