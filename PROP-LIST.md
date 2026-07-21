# Prop List — available prop sprites (art catalog)

Every prop sprite currently loaded by the game (`Art/sprites/`), numbered so you can call
one out by number. "Facing" = the direction the art is drawn to face (almost all are drawn
front-on / facing **down** toward the viewer, which is why they read right against a **top**
wall but want a redraw for the **bottom** of a room). Dims are the PNG size in pixels.

Sister map: [PROP-MAP.md](PROP-MAP.md) numbers the *instances placed on the floor* (D#/C#/O#/T#).
This list is the *palette of art* those instances are drawn from.

## Desks & tables
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 1 | `cubicle_desk` | worker cubicle desk | down (worker below) | 628×550 | yes (default desk) |
| 2 | `cubicle_desk_up` | worker cubicle desk | up (worker above) | 628×538 | yes |
| 3 | `cubicle_desk_left` | worker cubicle desk | left (worker at right) | 328×546 | yes |
| 4 | `cubicle_desk_right` | worker cubicle desk | right (worker at left) | 328×546 | yes |
| 5 | `assistant_desk` | wide CEO-assistant exec desk (chair + plant) | down | 1614×974 | yes (Colette) |
| 6 | `manager_desk` | manager/exec desk | down | 256×196 | yes (Dale + CEO office) |
| 7 | `reception_desk` | reception front counter | down | 256×124 | yes (reception) |
| 8 | `conference_table` | long meeting/break/kitchen table | down | 256×127 | yes (T1–T4) |

## Seating
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 9 | `office_chair` | single office chair | down | 113×160 | yes (meeting/break/office) |
| 10 | `couch` | 2-seat couch | down | 256×132 | **available, not placed** |

## Storage / containers
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 11 | `filing_cabinet` | filing cabinet | down (front + top) | 299×259 | yes (C16–C25 cabinets) |
| 12 | `supply_shelf` | tall supply/binder shelf | down (front) | 414×599 | yes (C1–C15 bins/shelves) |
| 13 | `lockers` | 3-locker bank | down (front) | 564×481 | yes (C27 break room) |
| 14 | `fridge` | stainless double fridge | down (front) | 414×645 | yes (C26 kitchen) |
| 15 | `vending_machine` | vending machine | down (front) | 165×203 | **available, not placed** |

## Machines / objects
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 16 | `printer` | office printer/copier | down | 152×151 | yes (O1, O2) |
| 17 | `water_cooler` | water cooler | down | 119×219 | yes (O3, O4) |
| 18 | `coffee_machine` | coffee machine | down | 128×203 | yes (O5) |
| 19 | `phone` | sales phones | down | 186×182 | yes (O9) |
| 20 | `fire_alarm` | wall fire alarm | down | 105×135 | yes (O7) |
| 21 | `whiteboard` | whiteboard | down | 239×182 | yes (O8) |

## Bathroom fixtures
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 22 | `toilet` | toilet | down | 219×345 | yes (O11, O12) |
| 23 | `urinal` | urinal | down | 155×304 | yes (men's) |
| 24 | `sink` | sink | down | 238×246 | yes (restroom row) |
| 25 | `stall_h` | horizontal stall | — | 256×132 | **available, not placed** |
| 26 | `stall_v` | vertical stall | — | 97×322 | **available, not placed** |
| 27 | `mirror` | wall mirror | down | 193×246 | **available, not placed** |

## Structure
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 28 | `elevator` | elevator doors | down | 256×133 | yes (exit) |
| 29 | `stairs` | stairwell | down | 256×283 | yes (below elevator) |

## Decor / outdoor
| # | sprite | what it is | facing | dims | placed? |
|---|--------|-----------|--------|------|---------|
| 30 | `plant` | potted plant | — | 120×183 | yes (scattered) |
| 31 | `bush` | exterior bush | — | 96×97 | yes (perimeter) |

---
*Not in the list:* `printer_wreck` (a 4-stage meltdown animation sheet, not a placeable prop),
plus the character sheet, floor tiles, and bat-swing sheets — those aren't props.
