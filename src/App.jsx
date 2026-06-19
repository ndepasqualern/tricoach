import { useState } from "react";

// ─── PERSISTENT STORAGE HOOK ─────────────────────────────────────────────────
// Reads initial value from localStorage; writes back on every change.
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = (value) => {
    try {
      const valueToStore = typeof value === "function" ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (e) {
      console.warn("localStorage write failed:", e);
    }
  };
  return [storedValue, setValue];
}



// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_COLORS = {
  rest: "#6B7280", run: "#10B981", bike: "#F97316",
  swim: "#3B82F6", strength: "#8B5CF6", brick: "#EC4899",
};
const TYPE_ICONS = {
  rest: "🧘", run: "🏃", bike: "🚴",
  swim: "🏊", strength: "🏋️", brick: "⚡",
};
const PHASE_COLORS = { Base: "#10B981", Build: "#F59E0B", Peak: "#EF4444", Taper: "#8B5CF6" };

const RACE_OPTIONS = [
  { id: "olympic", label: "Olympic Triathlon", details: "1.5 km swim · 40 km bike · 10 km run", color: "#00C2CB" },
  { id: "703",     label: "70.3 Half-Ironman", details: "1.9 km swim · 90 km bike · 21.1 km run", color: "#F97316" },
];

const FOCUS_OPTIONS = ["Swim", "Bike", "Run"];

// ─── WORKOUT POOL ─────────────────────────────────────────────────────────────

const focusMult   = (type, focus) => type.toLowerCase() === focus.toLowerCase() ? 1.20 : 1.0;
const sessionMins = (base, f, fm) => Math.round(base * f * fm);

// ── Total Immersion drill library (used across swim sessions by phase) ────────
// Source: Terry Laughlin, Total Immersion: The Revolutionary Way to Swim Better
const TI_DRILLS = {
  // Foundation drills — always used in Base
  deadManFloat:   "Dead Man's Float (Prone Balance): Float face-down, arms at sides, legs hanging. Find spinal alignment and balance point before adding propulsion.",
  sideBalance:    "Side Balance (SB): Roll to one side, lower arm extended, upper arm on thigh. Ear submerged, one goggle above water. Hold 4–6 sec, feel weightlessness. 4×25 m each side.",
  spear:          "Spear Switch (SS): From Side Balance, 'spear' lead hand forward as hips rotate. Feel hip-driven propulsion — the arm follows the hip, not the other way around. 6×25 m.",
  zipper:         "Zipper Drill: Recovery arm travels up the body as if zipping up a jacket — elbow high, hand skimming ribs. Trains high-elbow recovery, reduces drag. 4×25 m.",
  // Technique drills — introduced in Build
  underswitch:    "Underswitch: Single-arm stroke with switch. Lead arm stays extended until rear arm passes hip. Trains patient lead arm and hip-driven timing. 4×50 m.",
  skateDrill:     "Skate Position: Hold Side Balance with lead arm extended (like a skater's glide). Count strokes needed to cross the pool — aim to reduce over time. 4×25 m.",
  doggyPaddle:    "Doggy Paddle Catch: Pull with bent elbow, hands pushing back below chest. Trains early vertical forearm (EVF) and high-elbow catch. Keep hips up. 4×25 m.",
  fistDrill:      "Fist Drill: Swim full stroke with closed fists. Forces use of forearm as a paddle surface. Open hands after 25 m and feel the difference. 4×50 m alternate.",
  // Peak drills
  tempoTrainer:   "Tempo Trainer (TT) Work: Use a Tempo Trainer set to your target stroke rate. Maintain stroke count per length while matching the beep. 8×50 m at race tempo.",
  sightingDrill:  "Open Water Sighting: Every 8–10 strokes, lift eyes just above the waterline to sight a target. Minimize head lift — chin stays in water. 4×100 m continuous.",
};
// ── END TI drills ─────────────────────────────────────────────────────────────

// Intensity rules for doubles (Dixon / Friel principles):
// AM session type → allowed PM intensity
// HARD sessions (tempo, intervals, race-pace, long, brick) → NO PM double
// MODERATE sessions (aerobic bike, aerobic run, structured swim) → EASY PM only
// EASY/STRENGTH sessions → EASY-MODERATE PM acceptable
const AM_ALLOWS_PM = {
  "swim-main":  "easy",      // structured swim AM → easy PM ok
  "swim-long":  "none",      // long swim = done for the day
  "run-main":   "none",      // tempo/intervals AM = CNS stress, no PM
  "run-long":   "none",      // long run = done for the day
  "bike-main":  "easy",      // aerobic bike AM → easy PM ok (base/build)
  "bike-long":  "none",      // long ride = done for the day
  "strength":   "easy-mod",  // strength AM → easy-moderate PM
  "brick-main": "none",      // brick already is a double
};

const buildPool = (phase, is703, factor, focus = "Run", runZones = null, swimZones = null, bikeZones = null) => {
  const p = phase; const f = factor;

  // Pace callout strings
  const rz = runZones; const sz = swimZones; const bz = bikeZones;
  const runEasy  = rz ? ` Target: ${rz.easy}.`   : " Zone 2 — fully conversational.";
  const runTempo = rz ? ` Target: ${rz.tempo}.`  : " RPE 7–8, comfortably hard, 20 min max conversation.";
  const runRP    = rz ? ` Target: ${p==="Peak" ? (is703 ? rz.racePace703 : rz.racePaceOlympic) : rz.tempo}.` : " RPE 8–9.";
  const bikeEasy = bz ? ` Target: ${bz.easy}.`   : " RPE 3–4, cadence 85–95 rpm.";
  const bikeAero = bz ? ` Target: ${bz.aerobic}.`: " RPE 5–6, sustained aerobic.";
  const bikeThr  = bz ? ` Target: ${bz.threshold}.` : " RPE 8, threshold — just below blowing up.";
  const bikeRP   = bz ? ` Target: ${is703 ? bz.race703||bz.threshold : bz.raceOlympic}.` : " RPE 7–8 sustained.";
  const swimEasy = sz ? ` Target: ${sz.easy}.`   : " RPE 3–4, relaxed.";
  const swimAero = sz ? ` Target: ${sz.aerobic}.`: " RPE 5–6, controlled breathing.";
  const swimRP   = sz ? ` Target: ${sz.race}.`   : " RPE 7–8.";

  const swimFM = focusMult("swim", focus);
  const bikeFM = focusMult("bike", focus);
  const runFM  = focusMult("run",  focus);

  const runMainBase = is703 ? 45 : 40;
  const runLongBase = is703 ? 95 : 70;
  const bikeMainBase = is703 ? 60 : 50;
  const bikeLongBase = is703 ? 120 : 75;
  const swimMainBase = 45;
  const swimLongBase = 40;

  // ── Swim sets with Total Immersion drills by phase ────────────────────────
  const swimMainDetail = {
    Base: `Warm-up: 200 m easy.
TI Drill set (600 m): 4×25 m ${TI_DRILLS.deadManFloat.split(':')[0]}, 4×25 m ${TI_DRILLS.sideBalance.split(':')[0]}, 4×25 m ${TI_DRILLS.spear.split(':')[0]}, 4×25 m ${TI_DRILLS.zipper.split(':')[0]}.
Focus on balance and hip-driven propulsion, NOT speed.
Main set: 4×100 m easy with 20 s rest. Count strokes/length — aim for same count each lap.
Cool-down: 200 m easy.
Total: ~1,200${swimFM>1?" (focus +20%)":""} m.${swimEasy}`,

    Build: `Warm-up: 300 m easy + 4×25 m ${TI_DRILLS.fistDrill.split(':')[0]}.
TI Drill set (400 m): 4×50 m ${TI_DRILLS.doggyPaddle.split(':')[0]}, 4×50 m ${TI_DRILLS.underswitch.split(':')[0]}.
Main set: ${is703 ? Math.round(700*f*swimFM) : Math.round(600*f*swimFM)} m — ${is703?"3×200":"3×150"} m at aerobic pace, 20 s rest. Then 4×50 m pull buoy at threshold.
Cool-down: 200 m easy.
Total: ~${is703 ? Math.round(1700*f*swimFM) : Math.round(1500*f*swimFM)} m.${swimAero}`,

    Peak: `Warm-up: 400 m easy.
TI Drill set (200 m): 4×50 m ${TI_DRILLS.sightingDrill.split(':')[0]} (sight every 8 strokes).
CSS Main set: ${is703 ? Math.round(1200*swimFM) : Math.round(1000*swimFM)} m — ${is703?"6×200":"5×200"} m at race pace, 15 s rest. Descend pace each rep.
Speed set: 6×50 m at interval pace, 20 s rest.
Cool-down: 200 m easy.
Total: ~${is703 ? Math.round(2100*swimFM) : Math.round(1900*swimFM)} m.${swimRP}`,

    Taper: "400 m easy. Smooth stroke only — feel the water, no effort. 4×25 m Spear Switch to keep feel sharp.",
  };

  const swimLongDetail = {
    Base: `Warm-up: 200 m easy.
TI Drill set (500 m): 4×25 m ${TI_DRILLS.skateDrill.split(':')[0]}, 4×25 m ${TI_DRILLS.zipper.split(':')[0]}, 2×50 m full stroke (count strokes).
Main set: ${Math.round(600*swimFM)} m continuous no-stop. Every 4 laps, note your stroke count — keep it consistent.
Cool-down: 100 m easy.
Total: ~${Math.round(1000*swimFM)} m.${swimEasy}`,

    Build: `Warm-up: 300 m easy + 4×25 m ${TI_DRILLS.fistDrill.split(':')[0]}.
TI Drill: 4×50 m ${TI_DRILLS.underswitch.split(':')[0]}.
CSS Threshold set: ${is703 ? Math.round(800*f*swimFM) : Math.round(700*f*swimFM)} m — ${is703?"8×100":"7×100"} m on 15 s rest. Consistent split every rep (Critical Swim Speed pace).
Easy pull: 200 m pull buoy, relaxed.
Cool-down: 150 m easy.
Total: ~${is703 ? Math.round(1500*f*swimFM) : Math.round(1300*f*swimFM)} m.${swimAero}`,

    Peak: `Warm-up: 400 m easy + 4×25 m ${TI_DRILLS.tempoTrainer.split(':')[0]}.
Race-pace set: ${is703 ? Math.round(1100*swimFM) : Math.round(900*swimFM)} m — ${is703?"2×500":"2×400"} m at race pace with 2 min rest. Sight every 8 strokes, breathe bilaterally.
Descending set: 4×100 m descending pace (each 100 faster than last).
Cool-down: 200 m easy.
Total: ~${is703 ? Math.round(1900*swimFM) : Math.round(1700*swimFM)} m.${swimRP}`,

    Taper: "300 m easy. Optional — only if you feel good. No effort.",
  };

  // ── Run workouts (Jack Daniels VDOT framework) ────────────────────────────
  const runMainDetail = {
    Base: `E-pace easy run — ${sessionMins(runMainBase, f, runFM)} min. Fully conversational effort (Daniels Zone 1–2).
Cadence target: 170–180 spm (count steps for 30 sec, multiply by 4).
Last 5 min: 4×20 sec strides at R-pace (fast but relaxed) with full recovery between.${runEasy}
${runFM>1?"Focus discipline: add 4 extra strides and 2×100 m barefoot/sock runs on grass for proprioception.":""}`,

    Build: `Tempo run (Daniels T-pace cruise intervals):
Warm-up: 12 min E-pace.
Main set: 4×1 mile (or 4×8 min) at T-pace, 1 min standing rest between (cruise intervals — rest is short by design).${runFM>1?" Focus: 5×1 mile.":""}
Cool-down: 10 min E-pace.
Total: ${sessionMins(runMainBase, f, runFM)} min.${runTempo}
Note: T-pace should feel "comfortably hard" — you can speak a few words but not a sentence.`,

    Peak: `Race-pace intervals (Daniels I-pace work):
Warm-up: 12 min E-pace + 4×20 sec strides.
Main set: 3×10 min at race pace, 2 min walk recovery.${runFM>1?" Focus: 4th interval at race pace.":""}
Cool-down: 10 min E-pace.
Total: ${sessionMins(runMainBase, f, runFM)} min.${runRP}`,

    Taper: `25 min E-pace easy. Last 5 min: 4×20 sec strides. Trust the taper — resist adding volume.${runEasy}`,
  };

  const runLongDetail = {
    Base: `Long E-run — ${sessionMins(runLongBase, f, runFM)} min, Zone 2 only (Daniels E-pace).
Rule: if you cannot hold a full conversation, you are going too fast — slow down.
Every 15 min, note how you feel (1–10). Aim for consistent 3–4.
${is703?"This base is critical — the 70.3 run is 13.1 miles. Every long run you finish adds to your aerobic reservoir.":""}${runEasy}
Post-run: 30g protein within 30 min (ACSM protein timing guidance).`,

    Build: `Progressive long run — ${sessionMins(runLongBase, f, runFM)} min.
First 2/3 at E-pace (Zone 2). Final 1/3 at M-pace (marathon effort, Daniels).${runFM>1?" Focus: extend M-pace segment by 5 min.":""}
Purpose: trains the body to run faster as glycogen depletes — race-specific adaptation.${runEasy}
Fuel: 1 gel every 45 min, water every 20 min. Practice race nutrition.`,

    Peak: `Race-simulation long run — ${sessionMins(runLongBase, f, runFM)} min.${is703?" This brings you to ~10–12 miles — the longest run before race day.":" Longest training run."}
Wear race kit. Run at planned race time of day. Use race nutrition.
First 20 min easy, then settle into goal race pace.${runRP}
Post-run: mandatory 30g protein + 60g carb recovery meal within 30 min.`,

    Taper: `40 min easy E-pace. Legs should feel springy — if not, you need more sleep.${runEasy}
Post-run: 5 min dynamic stretching. No static stretching while muscles are fatigued.`,
  };

  // ── Bike workouts (Matt Dixon / Fast-Track Triathlete framework) ──────────
  const bikeMainDetail = {
    Base: `Aerobic base ride — ${sessionMins(bikeMainBase, f, bikeFM)} min.
Cadence focus: maintain 85–95 rpm throughout (Dixon's cadence efficiency work).${bikeFM>1?" Focus: add 3×10 min at 100+ rpm (high cadence, low resistance) to build turnover.":""}
Every 15 min: check cadence and perceived effort. Should feel easy enough to hold a conversation.
Practice fueling: one bottle per hour minimum.${bikeEasy}`,

    Build: `Dixon Over/Under intervals — ${sessionMins(bikeMainBase, f, bikeFM)} min.
Warm-up: 12 min easy.
Main set: ${bikeFM>1?"6":"5"}×(4 min just below threshold + 1 min just above threshold), 3 min easy spin between sets. This "over/under" pattern trains lactate clearance at race pace.
Alternative: ${bikeFM>1?"6":"5"}×5 min at threshold (Sweet Spot), 2 min easy.
Cool-down: 10 min easy.${bikeThr}
Fuel: 1 gel at minute 20 if over 60 min. Practice eating while riding.`,

    Peak: `Race-simulation ride — ${sessionMins(bikeMainBase, f, bikeFM)} min at race pace.
Dixon's "race feel" session: no coasting, hold race power/speed consistently.
Fueling protocol: gel every 30 min, water every 15 min. Log everything — this is race-day data.${bikeRP}
${bikeFM>1?"Focus: finish last 15 min 5% harder than race pace — trains ability to push when fatigued.":""}`,

    Taper: `30 min easy spin. Cadence 90 rpm. Zone 1 only — this is leg activation, not training.${bikeEasy}`,
  };

  const bikeLongDetail = {
    Base: `Long aerobic ride — ${sessionMins(bikeLongBase, f, bikeFM)} min.
Zone 2 throughout (Dixon: "If you want to go fast, first go long and slow").
Practice skills: eat and drink every 20 min without slowing. Two bottles minimum.${bikeFM>1?" Focus: add 15 min at aerobic threshold (just below tempo) at the end.":""}${bikeAero}
Post-ride nutrition: 30g protein + 60g carb within 30 min (Dixon's recovery window).`,

    Build: `Endurance long ride — ${sessionMins(bikeLongBase, f, bikeFM)} min.
First 2/3 steady Zone 2. Final 1/3: 3×10 min sweet-spot efforts (just below threshold) with 5 min easy between.
Dixon principle: finish the ride slightly tired but not destroyed. If you're wrecked, you went too hard.
Race nutrition: gel every 30 min, electrolytes every 45 min.${bikeAero}`,

    Peak: `Race-simulation long ride — ${sessionMins(bikeLongBase, f, bikeFM)} min.${is703?" This is your longest ride — approaching the 56-mile race distance.":" Full race-distance simulation."}
Ride at race intensity. Execute race nutrition plan perfectly — gel every 30 min, water at every "aid station" (set phone alarm).
Last 20 min: push to slightly above race pace. Trains ability to push when legs are fatigued.${bikeRP}`,

    Taper: `40 min easy. Cadence 90 rpm. Spin out the legs — no effort.${bikeEasy}`,
  };

  // ── Strength (Dixon + JSCR triathlon-specific) ────────────────────────────
  const strengthDetail = {
    Base: `Foundation strength — 45 min. Moderate load, perfect form.
Lower: Back squat 3×10 @65% 1RM, Romanian deadlift 3×8, reverse lunge 3×10/leg (hip mobility), step-down 3×10/leg (eccentric quad — critical for downhill running).
Upper/Core: Push-up 3×15, TRX row 3×12, plank 3×45s, dead bug 3×10/side.
Run-specific: A-skip drill 2×20 m, B-skip 2×20 m (Dixon's run mechanics work).
Key: controlled descent on all lower-body moves — 3 sec down.`,

    Build: `Performance strength — 50 min. Increase load 5–10% from Base.
Lower: Single-leg squat to box 3×8/leg (most run-specific move), Nordic hamstring curl 3×6 (JSCR injury prevention), lateral band walk 3×15/side, Copenhagen plank 3×20s/side.
Upper/Core: Cable anti-rotation press 3×10/side, TRX row 3×12, shoulder press 3×10.
Power: Box jump 3×5 (peak power, full recovery between reps). Stop if form breaks.
Hip flexor mobility: 2×60 sec couch stretch each side (critical for cyclists).`,

    Peak: `Reduced-load strength — 35 min. Cut load 20%, maintain movement quality.
Activation focus (ACSM pre-race protocol): glute bridge 3×15, clamshell 3×15, single-leg RDL 2×8/leg (light), lateral band walk 2×12.
No heavy squats or deadlifts — no DOMS risk within 3 weeks of race.
Finish: 5 min hip flexor stretching. Shoulder circles. Foam roll IT band and calves.`,

    Taper: `20 min activation only. No weights.
Glute bridge 2×15, clamshell 2×15, single-leg balance 2×30s, band pull-apart 2×15, leg swing 2×10/leg.
Purpose: wake up the stabilizers. This is NOT a training session.`,
  };

  // ── Brick sessions ─────────────────────────────────────────────────────────
  const brickDetail = {
    Base: `Intro Brick — ${sessionMins(is703?55:40, f, 1)} min bike + ${is703?15:10} min run.
Bike: easy Zone 2.${bikeEasy} Practice transition setup.
T2: rack bike, helmet off, rack in order, change shoes. Time it — your T2 goal is under 2 min.
Run: first 3 min walk or very slow jog. Don't fight the "brick legs" — let them come around naturally.
Purpose: neuromuscular adaptation. Your legs will feel like concrete — this is normal and gets better.`,

    Build: `Build Brick — ${sessionMins(is703?80:55, f, bikeFM)} min bike + ${sessionMins(is703?25:18, f, runFM)} min run.
Bike: first 2/3 aerobic, last 1/3 at race effort. Practice nutrition — gel at min 30 and 60.${bikeRP}
T2: execute your transition routine. Target under 90 sec.
Run: first 5 min allow pace to settle, then push to race pace for remaining time.${runRP}
Dixon principle: the run off the bike is its own skill — the more bricks you do, the faster T2 legs arrive.`,

    Peak: `Race-Sim Brick — ${is703?"100 min bike → 35 min run":"65 min bike → 22 min run"}.
This is your dress rehearsal. Identical to race day: same start time, same kit, same nutrition.
Bike: execute race pace from minute 1.${bikeRP} Log speed, HR, nutrition timing.
T2: full transition including changing shoes and any other race-day gear.
Run: hold race pace — do not look at watch for first mile, run by feel then check.${runRP}
Post-session: full race-day debrief. Note anything to adjust before race day.`,

    Taper: `Short Brick — 25 min easy spin + 10 min easy run. Zone 1–2 only.
Purpose: maintain neuromuscular memory of the bike-to-run transition. No effort.${bikeEasy}`,
  };

  return [
    {
      id: "swim-main", type: "swim",
      label: p === "Base" ? "Swim — TI Drills + Aerobic" : p === "Build" ? "Swim — CSS Endurance" : p === "Peak" ? "Swim — Race Pace" : "Swim — Easy",
      duration: p === "Taper" ? "25 min" : `${sessionMins(swimMainBase, f, swimFM)} min`,
      detail: swimMainDetail[p] || swimMainDetail.Base,
    },
    {
      id: "swim-long", type: "swim",
      label: p === "Base" ? "Swim — Balance + Continuous" : p === "Build" ? "Swim — CSS Threshold" : p === "Peak" ? "Swim — Race Simulation" : "Swim — Shakeout",
      duration: p === "Taper" ? "20 min" : `${sessionMins(swimLongBase, f, swimFM)} min`,
      detail: swimLongDetail[p] || swimLongDetail.Base,
    },
    {
      id: "run-main", type: "run",
      label: p === "Base" ? "Run — E-pace + Strides" : p === "Build" ? "Run — T-pace Cruise Intervals" : p === "Peak" ? "Run — Race-Pace Intervals" : "Run — Easy Shakeout",
      duration: p === "Taper" ? "25 min" : `${sessionMins(runMainBase, f, runFM)} min`,
      detail: runMainDetail[p] || runMainDetail.Base,
    },
    {
      id: "run-long", type: "run",
      label: p === "Base" ? "Long Run — E-pace" : p === "Build" ? "Long Run — Progressive (E→M)" : p === "Peak" ? "Long Run — Race Sim" : "Long Run — Easy",
      duration: p === "Taper" ? "40 min" : `${sessionMins(runLongBase, f, runFM)} min`,
      detail: runLongDetail[p] || runLongDetail.Base,
    },
    {
      id: "bike-main", type: "bike",
      label: p === "Base" ? "Bike — Cadence + Aerobic" : p === "Build" ? "Bike — Over/Under Intervals" : p === "Peak" ? "Bike — Race Simulation" : "Bike — Easy Spin",
      duration: p === "Taper" ? "30 min" : `${sessionMins(bikeMainBase, f, bikeFM)} min`,
      detail: bikeMainDetail[p] || bikeMainDetail.Base,
    },
    {
      id: "bike-long", type: "bike",
      label: p === "Base" ? "Long Ride — Aerobic Base" : p === "Build" ? "Long Ride — Sweet Spot" : p === "Peak" ? "Long Ride — Race Sim" : "Long Ride — Easy",
      duration: p === "Taper" ? "40 min" : `${sessionMins(bikeLongBase, f, bikeFM)} min`,
      detail: bikeLongDetail[p] || bikeLongDetail.Base,
    },
    {
      id: "strength", type: "strength",
      label: p === "Taper" ? "Strength — Activation" : p === "Peak" ? "Strength — Maintenance" : p === "Build" ? "Strength — Performance" : "Strength — Foundation",
      duration: p === "Taper" ? "20 min" : p === "Peak" ? "35 min" : p === "Build" ? "50 min" : "45 min",
      detail: strengthDetail[p] || strengthDetail.Base,
    },
    {
      id: "brick-main", type: "brick",
      label: p === "Base" ? "Brick — Intro T2" : p === "Build" ? "Brick — Build" : p === "Peak" ? "Brick — Race Sim" : "Brick — Short",
      duration: p === "Taper" ? "35 min" : `${sessionMins(is703 ? 100 : 70, f, Math.max(bikeFM, runFM))} min`,
      detail: brickDetail[p] || brickDetail.Base,
    },
  ];
};

// ── PM-specific recovery workout pool (Dixon / Friel principles) ──────────────
// These are EASY sessions designed to follow a moderate AM session only.
// Never hard. Never long. Purpose: active recovery + skill maintenance.
const buildPMPool = (phase, is703, factor, swimZones = null, runZones = null, bikeZones = null) => {
  const sz = swimZones; const rz = runZones; const bz = bikeZones;
  const swimEasy = sz ? ` Target: ${sz.easy}.` : " RPE 3–4, fully relaxed.";
  const runEasy  = rz ? ` Target: ${rz.easy}.` : " RPE 3–4, conversational.";
  const bikeEasy = bz ? ` Target: ${bz.easy}.` : " RPE 3–4, cadence 90 rpm.";

  return [
    {
      id: "pm-swim-ti",  type: "swim",
      label: "PM Swim — TI Technique",
      duration: "30 min",
      detail: `Easy 800–1,000 m. No structured sets — pure technique work.
TI Drill rotation (200 m each): ${TI_DRILLS.sideBalance.split(':')[0]}, ${TI_DRILLS.spear.split(':')[0]}, ${TI_DRILLS.skateDrill.split(':')[0]}.
Count strokes per length every 4 laps. Goal: same count each time.
This session is recovery — if you're tired, get out and go home.${swimEasy}`,
    },
    {
      id: "pm-swim-easy", type: "swim",
      label: "PM Swim — Easy Flush",
      duration: "25 min",
      detail: `600–800 m easy continuous. Zero effort — this is active recovery, not training.
Bilateral breathing every 3 strokes. Smooth TI Spear Switch entry.
If you feel good: add 4×25 m ${TI_DRILLS.zipper.split(':')[0]} for form maintenance.${swimEasy}`,
    },
    {
      id: "pm-run-easy", type: "run",
      label: "PM Run — Easy Recovery",
      duration: "20 min",
      detail: `20 min E-pace jog only. Daniels E-pace — fully conversational the entire time.
If you cannot speak in full sentences, you are going too fast. Walk if needed.
Purpose: increase blood flow to flush metabolic waste from AM session, not to add training load.${runEasy}
Finish: 5 min walk + dynamic leg swings.`,
    },
    {
      id: "pm-bike-easy", type: "bike",
      label: "PM Bike — Easy Spin",
      duration: "25 min",
      detail: `25 min easy Zone 1 spin. Cadence 90–100 rpm, very light resistance.
This is active recovery — legs should feel better when you finish than when you started.
If legs feel dead: reduce to 15 min and stop. Dixon: "Never turn recovery into training."${bikeEasy}`,
    },
    {
      id: "pm-mobility", type: "strength",
      label: "PM Mobility + Activation",
      duration: "20 min",
      detail: `Active recovery mobility session:
Hip flexor stretch 2×60s each side (critical for cyclists and runners).
Pigeon pose 2×60s each side.
Thoracic spine rotation 2×10/side.
Glute bridge 2×15 (activation, not strength).
Calf raise 2×20 (injury prevention — Achilles tendon load).
Foam roll: IT band, quads, calves, lats. 60s per area.`,
    },
  ];
};

// Default schedule — focus discipline gets the prime weekday slot (Tue)
const defaultAssignment = (is703, focus = "Run") => {
  const f = focus.toLowerCase();
  // All three disciplines always present. Focus gets Tue quality + Sat long.
  // Mon=rest, Tue=focus quality, Wed=swim, Thu=strength, Fri=run or bike, Sat=focus long, Sun=brick(703) or cross
  if (f === "swim") return is703
    ? { Mon: null, Tue: "swim-main", Wed: "bike-main", Thu: "strength", Fri: "run-main",  Sat: "swim-long", Sun: "brick-main" }
    : { Mon: null, Tue: "swim-main", Wed: "run-main",  Thu: "strength", Fri: "bike-main", Sat: "swim-long", Sun: "run-long"   };
  if (f === "bike") return is703
    ? { Mon: null, Tue: "bike-main", Wed: "swim-main", Thu: "strength", Fri: "run-main",  Sat: "bike-long", Sun: "brick-main" }
    : { Mon: null, Tue: "bike-main", Wed: "swim-main", Thu: "strength", Fri: "run-main",  Sat: "bike-long", Sun: "run-long"   };
  // Run focus (default)
  return is703
    ? { Mon: null, Tue: "run-main",  Wed: "swim-main", Thu: "strength", Fri: "bike-main", Sat: "run-long",  Sun: "brick-main" }
    : { Mon: null, Tue: "run-main",  Wed: "swim-main", Thu: "strength", Fri: "bike-main", Sat: "run-long",  Sun: "bike-long"  };
};


// ── Default doubles — derived from AM_ALLOWS_PM intensity rules ──────────────
// Principles (Dixon / Friel):
//   1. HARD AM sessions (tempo, intervals, long ride, long run, brick) → NO PM
//   2. MODERATE AM (aerobic bike, structured swim) → easy PM swim only
//   3. STRENGTH AM → easy-moderate PM swim (different energy system, low impact)
//   4. PM sessions are ALWAYS from the PM pool (recovery-appropriate)
//   5. No doubles in Base — build the aerobic base first, absorb stress fully
//   6. No doubles in Taper — protect freshness
//
// Day-by-day logic for Build/Peak (using defaultAssignment layout):
//   Mon = rest → no PM
//   Tue = quality run/bike/swim (HARD) → NO PM (CNS stress too high)
//   Wed = aerobic swim (MODERATE) → PM easy run acceptable in Peak only
//   Thu = strength (EASY-MOD) → PM TI technique swim (perfect pairing)
//   Fri = aerobic bike or run (MODERATE) → PM easy swim in Peak only
//   Sat = long ride/run (HARD) → NO PM
//   Sun = brick or long bike (HARD) → NO PM
const defaultDoubles = (phase, is703, focus, assignment = {}) => {
  if (phase === "Base" || phase === "Taper") return {};

  // Thu is always strength → PM TI swim (universally applicable, both phases)
  const base = { Thu: "pm-swim-ti" };

  if (phase === "Build") {
    // Only Thu double in Build — let athletes absorb the new training stress
    return base;
  }

  if (phase === "Peak") {
    // Peak: add Wed PM easy run (Wed AM is always swim → MODERATE → easy run ok)
    // Add Fri PM easy swim (Fri AM is aerobic bike or run → MODERATE)
    return {
      ...base,
      Wed: "pm-run-easy",   // Wed AM = swim (moderate) → easy run PM
      Fri: "pm-swim-easy",  // Fri AM = bike or run (aerobic) → easy swim PM
    };
  }

  return {};
};

const buildWeeks = (is703, focus = "Run", runZones = null, swimZones = null, bikeZones = null) => {
  const phases = [
    { label: "Base",  range: [1, 4],  desc: `Build your aerobic engine. Zones 1–2 only. ${focus} focus means extra ${focus.toLowerCase()} volume each week.` },
    { label: "Build", range: [5, 9],  desc: is703 ? `Extend long ride + run. Introduce bricks. ${focus} sessions get an added intensity boost.` : `Increase run volume. Intervals and bricks. ${focus} sessions boosted 20%.` },
    { label: "Peak",  range: [10, 13], desc: "Race-pace work. Sessions approach race distances. Don't skip rest days." },
    { label: "Taper", range: [14, 14], desc: "Cut volume 40–50%. Keep a little intensity. Sleep, hydrate, trust the work." },
  ];
  const weeks = [];
  phases.forEach(({ label, range, desc }) => {
    for (let w = range[0]; w <= range[1]; w++) {
      const f = label === "Taper" ? 0.5 : label === "Base" ? 0.6 + (w - 1) * 0.05 : label === "Build" ? 0.75 + (w - 5) * 0.05 : 0.95;
      const pmPool = buildPMPool(label, is703, f, swimZones, runZones, bikeZones);
      weeks.push({ week: w, phase: label, phaseDesc: desc, factor: f, pool: buildPool(label, is703, f, focus, runZones, swimZones, bikeZones), pmPool, assignment: defaultAssignment(is703, focus), doubles: defaultDoubles(label, is703, focus) });
    }
  });
  return weeks;
};

// ─── BRICK LIBRARY ────────────────────────────────────────────────────────────

const BRICK_LIBRARY = [
  { id: "b1", name: "Sprint Brick", level: "Beginner", duration: "45 min", bike: "20 min easy", run: "10 min easy", purpose: "Teach your legs the bike→run transition feeling. No effort, just adaptation.", tip: "Rack bike, change shoes, go immediately. Walk the first 30 sec if needed." },
  { id: "b2", name: "Threshold Brick", level: "Intermediate", duration: "75 min", bike: "50 min — last 15 min at threshold", run: "20 min at race pace", purpose: "Simulate race fatigue. Running on tired legs builds specific endurance.", tip: "Keep nutrition identical to race day. Note how pace feels vs HR." },
  { id: "b3", name: "Long Brick", level: "Intermediate", duration: "2.5 hrs", bike: "90 min at race effort", run: "35 min progressive", purpose: "Full simulation of race demands. Practice all fueling strategies.", tip: "Use exact race kit, shoes, and nutrition. Treat it like a dress rehearsal." },
  { id: "b4", name: "Descending Brick", level: "Advanced", duration: "90 min", bike: "60 min steady", run: "3×10 min descending pace", purpose: "Train the ability to accelerate through fatigue — critical for strong race finishes.", tip: "Each 10-min block is 5–10 sec/mile faster. 90 sec rest between blocks." },
  { id: "b5", name: "T2 Drill Brick", level: "All levels", duration: "40 min", bike: "3×5 min hard / 5 min easy", run: "5 min hard after each bike block", purpose: "Repeated transitions build neuromuscular adaptation and sharpen T2.", tip: "Full stop and transition each time — rack bike, change shoes, go. Time every T2." },
  { id: "b6", name: "Race-Sim Brick", level: "Advanced", duration: "Race distance", bike: "Full race bike leg at race pace", run: "Full race run leg at race pace", purpose: "Complete race rehearsal 3–4 weeks out. Builds confidence and reveals gaps.", tip: "Identical conditions to race day — same start time, nutrition, kit. Log everything." },
];

// ─── NUTRITION ────────────────────────────────────────────────────────────────

const NUTRITION = {
  trainingDay: {
    label: "Training Day", calories: "2,400–2,700 kcal",
    macros: { protein: "165–185g", carbs: "280–320g", fat: "65–80g" },
    meals: [
      { time: "6:30 AM", label: "Pre-Workout",          items: ["1 banana", "2 tbsp peanut butter", "8 oz water"],                                                           kcal: 230, protein: "7g" },
      { time: "8:30 AM", label: "Post-Workout Breakfast",items: ["3-egg omelette w/ spinach & feta", "1 cup oats with berries", "Greek yogurt (½ cup)", "12 oz coffee"],       kcal: 620, protein: "42g" },
      { time: "11:00 AM",label: "Mid-Morning Snack",    items: ["Cottage cheese (¾ cup)", "Sliced apple", "12 almonds"],                                                       kcal: 280, protein: "22g" },
      { time: "1:00 PM", label: "Lunch",                items: ["6 oz grilled chicken", "1.5 cups brown rice", "Roasted broccoli + olive oil", "Side salad"],                  kcal: 680, protein: "48g" },
      { time: "4:00 PM", label: "Afternoon Snack",      items: ["Protein shake (30g whey)", "1 rice cake", "1 oz dark chocolate"],                                             kcal: 240, protein: "32g" },
      { time: "7:00 PM", label: "Dinner",               items: ["6 oz salmon or lean beef", "1.5 cups sweet potato", "Asparagus + EVOO", "Sparkling water"],                   kcal: 680, protein: "45g" },
      { time: "9:00 PM", label: "Evening (optional)",   items: ["Casein protein or ¾ cup cottage cheese", "Herbal tea"],                                                        kcal: 160, protein: "28g" },
    ],
  },
  restDay: {
    label: "Rest Day", calories: "1,900–2,100 kcal",
    macros: { protein: "155–170g", carbs: "180–220g", fat: "65–75g" },
    meals: [
      { time: "8:00 AM", label: "Breakfast",            items: ["2-egg + 2-white scramble", "½ cup oats", "½ cup berries", "Coffee"],                                          kcal: 400, protein: "30g" },
      { time: "11:00 AM",label: "Mid-Morning Snack",    items: ["Greek yogurt (¾ cup)", "Chia seeds (1 tbsp)", "Walnuts"],                                                      kcal: 260, protein: "18g" },
      { time: "1:00 PM", label: "Lunch",                items: ["5 oz tuna or chicken", "Mixed greens", "Quinoa (½ cup)", "Avocado (¼)", "Lemon-tahini"],                       kcal: 560, protein: "42g" },
      { time: "4:00 PM", label: "Afternoon Snack",      items: ["2 string cheese", "1 medium apple"],                                                                           kcal: 190, protein: "14g" },
      { time: "7:00 PM", label: "Dinner",               items: ["5 oz turkey or white fish", "Roasted veggies", "1 cup lentils", "Kimchi or sauerkraut"],                       kcal: 580, protein: "48g" },
    ],
  },
  raceDay: {
    label: "Race Day", calories: "Race-fueling protocol",
    macros: { protein: "Pre-race light", carbs: "Primary fuel", fat: "Minimize" },
    meals: [
      { time: "3:30 AM", label: "Wake Up",              items: ["12–16 oz water immediately"],                                                                                  kcal: 0,   protein: "0g" },
      { time: "4:00 AM", label: "Race Breakfast",       items: ["1.5 cups oatmeal + honey + banana", "2 eggs scrambled", "8 oz electrolyte drink", "Coffee (if habitual)"],     kcal: 620, protein: "22g" },
      { time: "6:30 AM", label: "30 Min Pre-Start",     items: ["1 gel or 1 banana", "4–6 oz water", "Electrolyte tabs if hot"],                                                kcal: 110, protein: "1g" },
      { time: "During",  label: "On-Course Fueling",    items: ["Gel every 30–40 min on bike", "Water at every aid station", "Electrolytes every 45–60 min", "No solids 45 min before run"], kcal: 250, protein: "2g" },
      { time: "Finish",  label: "Recovery (≤30 min)",   items: ["Protein shake + banana", "Real meal within 90 min", "Electrolyte drink", "Celebrate 🎉"],                      kcal: 700, protein: "45g" },
    ],
  },
};

// Mifflin-St Jeor BMR — weight lbs, heightIn inches, age years, sex "female"|"male"
const calcCalories = (weight, goalWeight, trainingHrs, sex = "female", heightIn = 65, age = 30) => {
  const weightKg = weight * 0.453592;
  const heightCm = heightIn * 2.54;
  const bmr = sex === "female"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const activityBmr = bmr * 1.375; // lightly-moderately active baseline
  const trainingKcal = trainingHrs * 350; // ~350 kcal/hr triathlon training average
  const tdee = activityBmr + trainingKcal;
  const deficit = weight > goalWeight ? Math.min(500, (weight - goalWeight) * 3.5) : 0;
  const target = Math.round((tdee - deficit) / 50) * 50;
  const proteinPerLb = sex === "female" ? 0.85 : 1.0;
  const protein = Math.round(weight * proteinPerLb);
  return {
    target,
    deficit: Math.round(deficit),
    protein,
    carbs: Math.round((target * 0.45) / 4),
    fat: Math.round((target * 0.25) / 9),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
};


// ─── PACE UTILITIES ───────────────────────────────────────────────────────────

// Convert total seconds to "M:SS" string
const secsToMinStr = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// Parse "M:SS" or plain number (minutes) → total seconds
const parseMinSec = (str) => {
  if (!str) return null;
  str = String(str).trim();
  if (str.includes(":")) {
    const [m, s] = str.split(":").map(Number);
    return m * 60 + (s || 0);
  }
  const v = parseFloat(str);
  return isNaN(v) ? null : v * 60;
};

// Jack Daniels VDOT from a recent run: distance meters, time seconds
// Returns VDOT value
const calcVDOT = (distM, timeSec) => {
  const vo2 = (-4.60 + 0.182258 * (distM / timeSec) * 60 + 0.000104 * Math.pow((distM / timeSec) * 60, 2));
  const pct  = (0.8 + 0.1894393 * Math.exp(-0.012778 * timeSec) + 0.2989558 * Math.exp(-0.1932605 * timeSec));
  return vo2 / pct;
};

// From VDOT derive training paces (sec/mile)
// Returns { easy, marathon, threshold, interval, rep } as sec/mile
const vdotToPaces = (vdot) => {
  // Regression coefficients from Daniels' Running Formula tables
  const paceFromVO2pct = (pct) => {
    const vo2 = vdot * pct;
    // Inverse of speed equation: vo2 = -4.60 + 0.182258*v + 0.000104*v^2 where v = m/min
    // Solve quadratic for v (m/min), convert to sec/mile
    const a = 0.000104, b = 0.182258, c = -4.60 - vo2;
    const vMperMin = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    return 1609.34 / vMperMin * 60; // sec/mile
  };
  return {
    easy:      paceFromVO2pct(0.70),
    marathon:  paceFromVO2pct(0.83),
    threshold: paceFromVO2pct(0.88),
    interval:  paceFromVO2pct(0.98),
    rep:       paceFromVO2pct(1.05),
  };
};

// Derive run training zones as readable strings from a benchmark
// benchmark: { dist: meters, time: seconds }
const calcRunZones = (benchmark) => {
  if (!benchmark) return null;
  const vdot = calcVDOT(benchmark.dist, benchmark.time);
  const paces = vdotToPaces(vdot);
  return {
    easy:       `${secsToMinStr(paces.easy)}–${secsToMinStr(paces.easy * 1.08)}/mi`,
    tempo:      `${secsToMinStr(paces.threshold)}–${secsToMinStr(paces.threshold * 1.03)}/mi`,
    interval:   `${secsToMinStr(paces.interval)}–${secsToMinStr(paces.interval * 1.02)}/mi`,
    racePaceOlympic: secsToMinStr(paces.threshold * 0.97) + "/mi",
    racePace703:     secsToMinStr(paces.marathon * 1.02) + "/mi",
    vdot: Math.round(vdot * 10) / 10,
  };
};

// Swim: pace per 100m from a benchmark (e.g. 400m TT)
const calcSwimZones = (per100mSec) => {
  if (!per100mSec) return null;
  return {
    easy:      secsToMinStr(per100mSec * 1.15) + "/100m",
    aerobic:   secsToMinStr(per100mSec * 1.07) + "/100m",
    threshold: secsToMinStr(per100mSec * 1.02) + "/100m",
    race:      secsToMinStr(per100mSec * 1.04) + "/100m",
  };
};

// Bike: from avg mph derive training ranges
const calcBikeZones = (avgMph) => {
  if (!avgMph) return null;
  const ez  = (avgMph * 0.72).toFixed(1);
  const aer = (avgMph * 0.82).toFixed(1);
  const thr = (avgMph * 0.90).toFixed(1);
  const raceOlympic = (avgMph * 0.92).toFixed(1);
  const race703     = (avgMph * 0.88).toFixed(1);
  return {
    easy:      `${ez}–${aer} mph`,
    aerobic:   `${aer}–${thr} mph`,
    threshold: `${thr}–${(avgMph * 0.95).toFixed(1)} mph`,
    raceOlympic: `${raceOlympic}+ mph`,
    race703:     `${race703}+ mph`,
  };
};

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [race, setRace] = useState(null);
  const [focus, setFocus] = useState(null);
  const [sex, setSex] = useState(null);
  const [heightFt, setHeightFt] = useState(5);
  const [heightInch, setHeightInch] = useState(5);
  const [age, setAge] = useState(30);
  const [weight, setWeight] = useState(160);
  const [goalWeight, setGoalWeight] = useState(150);
  const [trainingHrs, setTrainingHrs] = useState(8);
  // Paces
  const [run5kMin, setRun5kMin] = useState(""); const [run5kSec, setRun5kSec] = useState("");
  const [swimPer100, setSwimPer100] = useState(""); // "M:SS"
  const [bikeAvgMph, setBikeAvgMph] = useState("");

  const accentColor = race ? RACE_OPTIONS.find(r => r.id === race)?.color : "#00C2CB";
  const totalHeightIn = heightFt * 12 + heightInch;

  const canNext = [
    name.trim().length > 0,
    !!race,
    !!focus,
    !!sex,
    true,
    true, // paces optional
  ][step];

  const handleNext = () => {
    if (step < 5) { setStep(step + 1); return; }
    // Build pace benchmarks
    const runSecs = (parseInt(run5kMin)||0)*60 + (parseInt(run5kSec)||0);
    const runBenchmark = runSecs > 60 ? { dist: 5000, time: runSecs } : null;
    const swimSec = parseMinSec(swimPer100);
    const bikeMph = parseFloat(bikeAvgMph) || null;
    onComplete({ name: name.trim(), race, focus, sex, heightIn: totalHeightIn, age, weight, goalWeight, trainingHrs,
      runBenchmark, swimPer100Sec: swimSec, bikeAvgMph: bikeMph });
  };

  const steps = ["Name", "Race", "Focus", "Body", "Training", "Paces"];

  const NumberInputRow = ({ label, value, setter, min, max, stepVal, unit }) => {
    const [raw, setRaw] = useState(String(value));
    return (
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginBottom: 7 }}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number" min={min} max={max} step={stepVal} value={raw}
            onChange={e => {
              setRaw(e.target.value);
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) setter(v);
            }}
            onBlur={() => {
              const v = parseFloat(raw);
              if (isNaN(v) || v < min) { setter(min); setRaw(String(min)); }
              else if (v > max) { setter(max); setRaw(String(max)); }
              else { setter(v); setRaw(String(v)); }
            }}
            style={{ flex: 1, background: "#1A1F2E", border: `1.5px solid ${accentColor}60`, borderRadius: 8,
              padding: "10px 12px", fontSize: 16, fontWeight: 700, color: "#F9FAFB", outline: "none",
              textAlign: "center" }}
          />
          <span style={{ fontSize: 13, color: "#9CA3AF", minWidth: 32 }}>{unit}</span>
        </div>
        <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>Range: {min}–{max} {unit}</div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#0F1117", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        <span style={{ fontSize: 26 }}>🏅</span>
        <span style={{ fontSize: 21, fontWeight: 700, color: "#F9FAFB", letterSpacing: "-0.02em" }}>TriCoach</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i === step ? accentColor : i < step ? accentColor + "80" : "#2D3748", transition: "all 0.3s" }} />
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 380 }}>

        {step === 0 && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#F9FAFB", textAlign: "center" }}>Welcome to TriCoach</h2>
            <p style={{ margin: "0 0 26px", fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Let's build your personal 14-week plan.</p>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>YOUR NAME</label>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canNext && handleNext()}
              placeholder="e.g. Nicole" autoFocus
              style={{ width: "100%", background: "#1A1F2E", border: `1.5px solid ${name.trim() ? accentColor : "#2D3748"}`, borderRadius: 10, padding: "12px 14px", fontSize: 16, color: "#F9FAFB", outline: "none", boxSizing: "border-box" }} />
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#F9FAFB", textAlign: "center" }}>Hi {name} 👋</h2>
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Which race are you training for?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RACE_OPTIONS.map(r => (
                <button key={r.id} onClick={() => setRace(r.id)}
                  style={{ padding: "14px 16px", borderRadius: 12, border: `2px solid ${race === r.id ? r.color : "#2D3748"}`, background: race === r.id ? r.color + "18" : "#1A1F2E", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: race === r.id ? r.color : "#F9FAFB" }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>{r.details}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#F9FAFB", textAlign: "center" }}>Weakest discipline?</h2>
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Your plan will give this extra emphasis.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {FOCUS_OPTIONS.map(opt => {
                const type = opt.toLowerCase();
                return (
                  <button key={opt} onClick={() => setFocus(opt)}
                    style={{ flex: 1, padding: "16px 8px", borderRadius: 12, border: `2px solid ${focus === opt ? TYPE_COLORS[type] : "#2D3748"}`, background: focus === opt ? TYPE_COLORS[type] + "18" : "#1A1F2E", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{TYPE_ICONS[type]}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: focus === opt ? TYPE_COLORS[type] : "#F9FAFB" }}>{opt}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#F9FAFB", textAlign: "center" }}>About you</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Used for accurate calorie targets via Mifflin-St Jeor.</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>BIOLOGICAL SEX</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[["female", "♀ Female"], ["male", "♂ Male"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setSex(val)}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: `2px solid ${sex === val ? accentColor : "#2D3748"}`, background: sex === val ? accentColor + "18" : "#1A1F2E", cursor: "pointer", fontSize: 14, fontWeight: 600, color: sex === val ? accentColor : "#9CA3AF" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>HEIGHT</label>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#9CA3AF", display: "block", marginBottom: 6 }}>Feet</label>
                  <input type="number" min={4} max={7} step={1} value={heightFt}
                    onChange={e => setHeightFt(e.target.value === "" ? "" : parseInt(e.target.value) || heightFt)}
                    onBlur={() => { const v = parseInt(heightFt); setHeightFt(isNaN(v) || v < 4 ? 4 : v > 7 ? 7 : v); }}
                    style={{ width: "100%", background: "#1A1F2E", border: `1.5px solid ${accentColor}60`, borderRadius: 8, padding: "10px 0", fontSize: 16, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#9CA3AF", display: "block", marginBottom: 6 }}>Inches</label>
                  <input type="number" min={0} max={11} step={1} value={heightInch}
                    onChange={e => setHeightInch(e.target.value === "" ? "" : parseInt(e.target.value))}
                    onBlur={() => { const v = parseInt(heightInch); setHeightInch(isNaN(v) || v < 0 ? 0 : v > 11 ? 11 : v); }}
                    style={{ width: "100%", background: "#1A1F2E", border: `1.5px solid ${accentColor}60`, borderRadius: 8, padding: "10px 0", fontSize: 16, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>= {heightFt}' {heightInch}"  ({heightFt * 12 + heightInch}" total)</div>
            </div>

            <NumberInputRow label="Age" value={age} setter={setAge} min={16} max={75} stepVal={1} unit="yrs" />
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#F9FAFB", textAlign: "center" }}>Almost there!</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Adjust anytime in the Stats tab.</p>

            <NumberInputRow label="Current Weight" value={weight} setter={setWeight} min={90} max={350} stepVal={1} unit="lbs" />
            <NumberInputRow label="Goal Weight" value={goalWeight} setter={setGoalWeight} min={90} max={350} stepVal={1} unit="lbs" />
            <NumberInputRow label="Weekly Training Hours" value={trainingHrs} setter={setTrainingHrs} min={1} max={25} stepVal={0.5} unit="hrs" />

            {(() => {
              const preview = calcCalories(weight, goalWeight, trainingHrs, sex || "female", totalHeightIn, age);
              return (
                <div style={{ background: "#1A1F2E", borderRadius: 10, padding: "10px 12px", border: `1px solid ${accentColor}50`, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: accentColor, fontWeight: 600, marginBottom: 8 }}>YOUR ESTIMATED DAILY TARGETS</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["Calories", preview.target.toLocaleString(), "#F59E0B"], ["Protein", preview.protein + "g", "#10B981"], ["Carbs", preview.carbs + "g", "#3B82F6"], ["Fat", preview.fat + "g", "#F97316"]].map(([l, v, c]) => (
                      <div key={l} style={{ flex: 1, background: "#0F1117", borderRadius: 7, padding: "7px 4px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#6B7280" }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {preview.deficit > 0 && <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 8 }}>📉 {preview.deficit} kcal/day deficit · ~{(preview.deficit / 500).toFixed(1)} lb/week</div>}
                </div>
              );
            })()}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#F9FAFB", textAlign: "center" }}>Current Paces</h2>
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Unlocks exact training zones in every workout.</p>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#6B7280", textAlign: "center" }}>All optional — skip any you don't know yet.</p>

            {/* Run */}
            <div style={{ marginBottom: 16, background: "#1A1F2E", borderRadius: 10, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🏃</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>Recent 5K Time</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>Any recent timed run works — 1 mile, 10K, etc.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 5 }}>Minutes</div>
                  <input type="number" min={14} max={60} value={run5kMin} placeholder="28"
                    onChange={e => setRun5kMin(e.target.value)}
                    style={{ width: "100%", background: "#0F1117", border: `1.5px solid ${accentColor}40`, borderRadius: 8, padding: "10px", fontSize: 18, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                </div>
                <div style={{ fontSize: 20, color: "#6B7280", paddingBottom: 12 }}>:</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 5 }}>Seconds</div>
                  <input type="number" min={0} max={59} value={run5kSec} placeholder="00"
                    onChange={e => setRun5kSec(e.target.value)}
                    style={{ width: "100%", background: "#0F1117", border: `1.5px solid ${accentColor}40`, borderRadius: 8, padding: "10px", fontSize: 18, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                </div>
              </div>
              {run5kMin && (() => {
                const secs = (parseInt(run5kMin)||0)*60+(parseInt(run5kSec)||0);
                if (secs < 60) return null;
                const zones = calcRunZones({ dist: 5000, time: secs });
                if (!zones) return null;
                return (
                  <div style={{ marginTop: 10, background: "#0F1117", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#10B981", fontWeight: 600, marginBottom: 6 }}>YOUR RUN ZONES (VDOT {zones.vdot})</div>
                    {[["Easy", zones.easy], ["Tempo", zones.tempo], ["Interval", zones.interval]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: "#6B7280" }}>{l}</span><span style={{ color: "#F9FAFB", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Swim */}
            <div style={{ marginBottom: 16, background: "#1A1F2E", borderRadius: 10, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🏊</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6" }}>Swim Pace / 100m</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>From a 200m or 400m time trial — enter as M:SS</div>
                </div>
              </div>
              <input type="text" value={swimPer100} placeholder="2:15"
                onChange={e => setSwimPer100(e.target.value)}
                style={{ width: "100%", background: "#0F1117", border: `1.5px solid ${accentColor}40`, borderRadius: 8, padding: "10px 12px", fontSize: 18, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
              {swimPer100 && parseMinSec(swimPer100) && (() => {
                const zones = calcSwimZones(parseMinSec(swimPer100));
                if (!zones) return null;
                return (
                  <div style={{ marginTop: 10, background: "#0F1117", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#3B82F6", fontWeight: 600, marginBottom: 6 }}>YOUR SWIM ZONES</div>
                    {[["Easy", zones.easy], ["Aerobic", zones.aerobic], ["Race pace", zones.race]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: "#6B7280" }}>{l}</span><span style={{ color: "#F9FAFB", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Bike */}
            <div style={{ background: "#1A1F2E", borderRadius: 10, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🚴</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F97316" }}>Average Bike Speed</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>Your comfortable training average (mph)</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="number" min={8} max={35} value={bikeAvgMph} placeholder="16"
                  onChange={e => setBikeAvgMph(e.target.value)}
                  style={{ flex: 1, background: "#0F1117", border: `1.5px solid ${accentColor}40`, borderRadius: 8, padding: "10px", fontSize: 18, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center" }} />
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>mph</span>
              </div>
              {bikeAvgMph && parseFloat(bikeAvgMph) >= 8 && (() => {
                const zones = calcBikeZones(parseFloat(bikeAvgMph));
                if (!zones) return null;
                return (
                  <div style={{ marginTop: 10, background: "#0F1117", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#F97316", fontWeight: 600, marginBottom: 6 }}>YOUR BIKE ZONES</div>
                    {[["Easy", zones.easy], ["Aerobic", zones.aerobic], ["Threshold", zones.threshold]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: "#6B7280" }}>{l}</span><span style={{ color: "#F9FAFB", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <button onClick={handleNext} disabled={!canNext}
          style={{ width: "100%", marginTop: 22, padding: "14px", borderRadius: 12, border: "none",
            background: canNext ? accentColor : "#2D3748", color: canNext ? "#0F1117" : "#4B5563",
            fontSize: 15, fontWeight: 700, cursor: canNext ? "pointer" : "default", transition: "all 0.2s" }}>
          {step < 5 ? "Continue →" : "Build My Plan 🚀"}
        </button>

        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 12, border: "none", background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function TriathlonApp() {
  const [profile, setProfile] = useLocalStorage("tricoach_profile", null);

  const handleComplete = (p) => setProfile(p);
  const handleReset = () => {
    setProfile(null);
    // Clear all app data on reset so next user starts fresh
    ["tricoach_progress","tricoach_overrides","tricoach_stats"].forEach(k => {
      try { window.localStorage.removeItem(k); } catch {}
    });
  };

  if (!profile) return <Onboarding onComplete={handleComplete} />;

  return <TrainingApp profile={profile} onReset={handleReset} />;
}

function TrainingApp({ profile, onReset }) {
  const is703 = profile.race === "703";
  const raceInfo = RACE_OPTIONS.find(r => r.id === profile.race);
  const COLOR = raceInfo.color;

  // Calculate pace zones from profile benchmarks
  const runZones  = profile.runBenchmark   ? calcRunZones(profile.runBenchmark)          : null;
  const swimZones = profile.swimPer100Sec  ? calcSwimZones(profile.swimPer100Sec)         : null;
  const bikeZones = profile.bikeAvgMph     ? calcBikeZones(profile.bikeAvgMph)            : null;
  const WEEKS = buildWeeks(is703, profile.focus || 'Run', runZones, swimZones, bikeZones);

  const [tab, setTab] = useState("plan");
  const [activeWeek, setActiveWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState(null);
  const [nutTab, setNutTab] = useState("trainingDay");
  const [expandedBrick, setExpandedBrick] = useState(null);
  const [pendingDay, setPendingDay] = useState(null);
  const [scheduleOverrides, setScheduleOverrides] = useLocalStorage("tricoach_overrides", {});
  const [doubleOverrides, setDoubleOverrides] = useLocalStorage("tricoach_doubles", {});
  const [progress, setProgress] = useLocalStorage("tricoach_progress", {});
  const [stats, setStats] = useLocalStorage("tricoach_stats", { weight: profile.weight, goalWeight: profile.goalWeight, trainingHrs: profile.trainingHrs, sex: profile.sex || 'female', heightIn: profile.heightIn || 65, age: profile.age || 30 });

  const wi = activeWeek - 1;

  const getWeek = (weekIndex) => {
    const base = WEEKS[weekIndex];
    const override = scheduleOverrides[`w${weekIndex}`];
    const dblOverride = doubleOverrides[`w${weekIndex}`];
    return {
      ...base,
      assignment: override ? { ...base.assignment, ...override } : base.assignment,
      doubles: dblOverride !== undefined ? dblOverride : base.doubles,
    };
  };

  const setDouble = (dayName, workoutId) => {
    setDoubleOverrides(prev => {
      const cur = prev[`w${wi}`] !== undefined ? prev[`w${wi}`] : week.doubles;
      return { ...prev, [`w${wi}`]: { ...cur, [dayName]: workoutId } };
    });
  };

  const clearDouble = (dayName) => {
    setDoubleOverrides(prev => {
      const cur = prev[`w${wi}`] !== undefined ? prev[`w${wi}`] : week.doubles;
      const next = { ...cur };
      delete next[dayName];
      return { ...prev, [`w${wi}`]: next };
    });
  };

  const week = getWeek(wi);
  const poolById = Object.fromEntries([...week.pool, ...(week.pmPool||[])].map(w => [w.id, w]));
  const getWorkout = (dayName) => { const id = week.assignment[dayName]; return id ? (poolById[id] || null) : null; };
  const assignedIds = new Set(Object.values(week.assignment).filter(Boolean));

  const applyAssignment = (dayName, workoutId) => {
    setScheduleOverrides(prev => {
      const cur = prev[`w${wi}`] || {};
      const merged = { ...week.assignment, ...cur };
      const swapDay = Object.keys(merged).find(d => merged[d] === workoutId);
      const newAssign = { ...merged, [dayName]: workoutId };
      if (swapDay && swapDay !== dayName) newAssign[swapDay] = merged[dayName];
      return { ...prev, [`w${wi}`]: newAssign };
    });
    setPendingDay(null);
  };

  const clearDay = (dayName) => {
    setScheduleOverrides(prev => {
      const cur = prev[`w${wi}`] || {};
      return { ...prev, [`w${wi}`]: { ...week.assignment, ...cur, [dayName]: null } };
    });
    setExpandedDay(null);
  };

  const toggleProgress = (weekNum, dayName) => {
    setProgress(prev => {
      const wk = { ...(prev[`w${weekNum}`] || {}) };
      wk[dayName] = !wk[dayName];
      return { ...prev, [`w${weekNum}`]: wk };
    });
  };

  const weekProgress = (weekNum) => {
    const wkData = progress[`w${weekNum}`] || {};
    const wk = getWeek(weekNum - 1);
    let total = 0, done = 0;
    DAYS.forEach(d => {
      if (wk.assignment[d]) {
        total++;
        if (wkData[d]) done++;
      }
      if (wk.doubles[d]) {
        total++;
        if (wkData[`${d}_pm`]) done++;
      }
    });
    return { done, total: total || 7 };
  };

  const calcs = calcCalories(stats.weight, stats.goalWeight, stats.trainingHrs, stats.sex, stats.heightIn, stats.age);
  const card = { background: "#1A1F2E", borderRadius: 10, border: "1px solid #2D3748" };

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#0F1117", minHeight: "100vh", color: "#E5E7EB" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0F1117 0%,#1A1F2E 100%)", borderBottom: "1px solid #1F2937", padding: "18px 16px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏅</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#F9FAFB", letterSpacing: "-0.02em" }}>TriCoach</span>
            </div>
            <button onClick={onReset}
              style={{ fontSize: 11, color: "#6B7280", background: "transparent", border: "1px solid #2D3748", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
              Switch athlete
            </button>
          </div>

          {/* Athlete + race bar */}
          <div style={{ background: `${COLOR}12`, border: `1px solid ${COLOR}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLOR }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>{raceInfo.label} · {raceInfo.details}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#6B7280" }}>Focus</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F9FAFB" }}>{TYPE_ICONS[profile.focus.toLowerCase()]} {profile.focus}</div>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: "flex", borderBottom: "1px solid #1F2937", overflowX: "auto" }}>
            {[["plan","📅 Plan"],["nutrition","🥗 Nutrition"],["bricks","⚡ Bricks"],["progress","✅ Progress"],["stats","👤 Stats"]].map(([key, lbl]) => (
              <button key={key} onClick={() => { setTab(key); setPendingDay(null); setExpandedDay(null); }}
                style={{ flex: 1, padding: "9px 4px", background: "transparent", border: "none", whiteSpace: "nowrap",
                  borderBottom: `2px solid ${tab === key ? COLOR : "transparent"}`,
                  color: tab === key ? COLOR : "#6B7280", fontWeight: 600, fontSize: 12, cursor: "pointer", minWidth: 56 }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px" }}>

        {/* ══ PLAN TAB ══════════════════════════════════════════════════════════ */}
        {tab === "plan" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 7, fontWeight: 600, letterSpacing: "0.06em" }}>SELECT WEEK</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {WEEKS.map(w => {
                  const { done, total } = weekProgress(w.week);
                  const pct = total ? done / total : 0;
                  return (
                    <button key={w.week} onClick={() => { setActiveWeek(w.week); setExpandedDay(null); setPendingDay(null); }}
                      style={{ width: 36, height: 36, borderRadius: 8, position: "relative", overflow: "hidden",
                        border: `1px solid ${activeWeek === w.week ? PHASE_COLORS[w.phase] : "#2D3748"}`,
                        background: activeWeek === w.week ? `${PHASE_COLORS[w.phase]}20` : "#1A1F2E",
                        color: activeWeek === w.week ? PHASE_COLORS[w.phase] : "#9CA3AF",
                        fontWeight: activeWeek === w.week ? 700 : 400, fontSize: 12, cursor: "pointer" }}>
                      {done > 0 && <div style={{ position: "absolute", bottom: 0, left: 0, width: `${pct * 100}%`, height: 3, background: PHASE_COLORS[w.phase], opacity: 0.7 }} />}
                      {w.week}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                {Object.entries(PHASE_COLORS).map(([p, c]) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                    <span style={{ color: "#9CA3AF" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, border: `1px solid ${PHASE_COLORS[week.phase]}40`, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PHASE_COLORS[week.phase], letterSpacing: "0.06em" }}>{week.phase.toUpperCase()} PHASE</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", marginTop: 2 }}>Week {week.week} of 14</div>
                </div>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${PHASE_COLORS[week.phase]}20`, border: `2px solid ${PHASE_COLORS[week.phase]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: PHASE_COLORS[week.phase] }}>
                  {Math.round((week.week / 14) * 100)}%
                </div>
              </div>
              <p style={{ margin: "7px 0 0", fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>{week.phaseDesc}</p>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["swim", "bike", "run", "strength", "brick"].map(type => {
                const amCount = DAYS.filter(d => getWorkout(d)?.type === type).length;
                const pmCount = DAYS.filter(d => week.doubles[d] && poolById[week.doubles[d]]?.type === type).length;
                const count = amCount + pmCount;
                return (
                  <div key={type} style={{ flex: 1, ...card, border: `1px solid ${TYPE_COLORS[type]}30`, padding: "7px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 14 }}>{TYPE_ICONS[type]}</div>
                    <div style={{ fontSize: 10, color: TYPE_COLORS[type], fontWeight: 600, marginTop: 1 }}>{count}x</div>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "capitalize" }}>{type}</div>
                  </div>
                );
              })}
            </div>

            {pendingDay && (
              <div style={{ background: `${COLOR}20`, border: `1px solid ${COLOR}`, borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: COLOR, fontWeight: 600 }}>Assigning to <strong>{pendingDay}</strong> — pick a workout below</div>
                <button onClick={() => setPendingDay(null)} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {DAYS.map(dayName => {
                const workout = getWorkout(dayName);
                const pmWorkoutId = week.doubles[dayName];
                const pmWorkout = pmWorkoutId ? poolById[pmWorkoutId] : null;
                const isExpanded = expandedDay === dayName;
                const isPending = pendingDay === dayName;
                const wkProg = progress[`w${week.week}`] || {};
                const doneAM = !!wkProg[dayName];
                const donePM = !!wkProg[`${dayName}_pm`];
                const hasDouble = !!pmWorkout;
                const borderColor = isPending ? COLOR : isExpanded && workout ? TYPE_COLORS[workout.type] : "#2D3748";

                return (
                  <div key={dayName} style={{ ...card, border: `1px solid ${borderColor}`, transition: "all 0.15s" }}>

                    {/* ── AM SESSION ROW ── */}
                    <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 10, opacity: doneAM ? 0.55 : 1 }}>
                      {/* AM badge */}
                      {hasDouble && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#F59E0B", background: "#F59E0B15", border: "1px solid #F59E0B30", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>AM</div>
                      )}
                      {/* AM checkbox */}
                      <button onClick={() => toggleProgress(week.week, dayName)}
                        style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${doneAM ? "#10B981" : "#374151"}`, background: doneAM ? "#10B98120" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#10B981" }}>
                        {doneAM ? "✓" : ""}
                      </button>
                      {/* Icon */}
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${workout ? TYPE_COLORS[workout.type] : "#6B7280"}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                        {workout ? TYPE_ICONS[workout.type] : "🧘"}
                      </div>
                      {/* Label */}
                      <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => { setPendingDay(null); setExpandedDay(isExpanded ? null : dayName); }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{dayName}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: doneAM ? "#6B7280" : "#F9FAFB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {workout ? workout.label : "Rest Day"}
                        </div>
                      </div>
                      {/* Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {workout && <span style={{ fontSize: 11, color: TYPE_COLORS[workout.type], fontWeight: 600 }}>{workout.duration}</span>}
                        <button onClick={() => { setPendingDay(isPending ? null : dayName); setExpandedDay(null); }}
                          style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${isPending ? COLOR : "#374151"}`, background: isPending ? `${COLOR}20` : "transparent", color: isPending ? COLOR : "#6B7280" }}>
                          {isPending ? "Cancel" : "Assign"}
                        </button>
                        {workout && <button onClick={() => clearDay(dayName)} style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid #374151", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>}
                        <span style={{ fontSize: 10, color: "#374151", cursor: "pointer" }} onClick={() => { setPendingDay(null); setExpandedDay(isExpanded ? null : dayName); }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* ── PM / DOUBLE SESSION ROW ── */}
                    {hasDouble && (
                      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 10px", gap: 10, borderTop: "1px dashed #2D3748", opacity: donePM ? 0.55 : 1, background: "#0F111740" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#8B5CF6", background: "#8B5CF615", border: "1px solid #8B5CF630", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>PM</div>
                        {/* PM checkbox */}
                        <button onClick={() => {
                          setProgress(prev => {
                            const wk = { ...(prev[`w${week.week}`] || {}) };
                            wk[`${dayName}_pm`] = !wk[`${dayName}_pm`];
                            return { ...prev, [`w${week.week}`]: wk };
                          });
                        }}
                          style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${donePM ? "#8B5CF6" : "#374151"}`, background: donePM ? "#8B5CF620" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#8B5CF6" }}>
                          {donePM ? "✓" : ""}
                        </button>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${TYPE_COLORS[pmWorkout.type]}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                          {TYPE_ICONS[pmWorkout.type]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: donePM ? "#6B7280" : "#D1D5DB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {pmWorkout.label}
                          </div>
                          <div style={{ fontSize: 11, color: TYPE_COLORS[pmWorkout.type], marginTop: 1 }}>{pmWorkout.duration}</div>
                        </div>
                        {/* Remove PM session */}
                        <button onClick={() => clearDouble(dayName)}
                          style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid #374151", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    )}

                    {/* ── Add PM session button (only on workout days with no PM yet, Build/Peak) ── */}
                    {!hasDouble && workout && (week.phase === "Build" || week.phase === "Peak") && (
                      <div style={{ padding: "0 12px 8px" }}>
                        <button onClick={() => {
                          // Default PM suggestion from PM pool based on AM type and intensity rules
                          const suggestions = { swim:"pm-run-easy", bike:"pm-swim-easy", run:"pm-swim-easy", strength:"pm-swim-ti", brick:"pm-swim-easy" };
                          const suggestion = suggestions[workout.type] || "pm-swim-ti";
                          setDouble(dayName, suggestion);
                        }}
                          style={{ width: "100%", padding: "5px", borderRadius: 6, border: "1px dashed #374151", background: "transparent", color: "#4B5563", fontSize: 11, cursor: "pointer", textAlign: "center" }}>
                          + Add PM session
                        </button>
                      </div>
                    )}

                    {/* ── Expanded detail ── */}
                    {isExpanded && (
                      <div style={{ padding: "0 12px 12px", borderTop: "1px solid #2D3748", paddingTop: 10 }}>
                        {workout && (
                          <div style={{ marginBottom: pmWorkout ? 10 : 0 }}>
                            <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600, marginBottom: 4 }}>🌅 AM — {workout.label}</div>
                            <p style={{ margin: 0, fontSize: 13, color: "#D1D5DB", lineHeight: 1.65 }}>{workout.detail}</p>
                          </div>
                        )}
                        {!workout && <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", lineHeight: 1.65 }}>Rest day — 20 min gentle yoga, foam rolling, or a slow walk. Sleep and hydration are the priority.</p>}
                        {pmWorkout && (
                          <div style={{ background: "#8B5CF610", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #8B5CF6" }}>
                            <div style={{ fontSize: 10, color: "#8B5CF6", fontWeight: 600, marginBottom: 4 }}>🌆 PM — {pmWorkout.label}</div>
                            <p style={{ margin: 0, fontSize: 13, color: "#D1D5DB", lineHeight: 1.65 }}>{pmWorkout.detail}</p>
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>⏱ Allow at least 4–6 hrs between AM and PM sessions.</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em" }}>
                {pendingDay ? `PICK A WORKOUT FOR ${pendingDay.toUpperCase()} (AM)` : "WORKOUT POOL — tap Assign on a day, then select here"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {week.pool.map(w => {
                  const isOnDay = assignedIds.has(w.id);
                  const onDayName = isOnDay ? DAYS.find(d => week.assignment[d] === w.id) : null;
                  const isSelectable = !!pendingDay;
                  return (
                    <div key={w.id} onClick={() => isSelectable && applyAssignment(pendingDay, w.id)}
                      style={{ ...card, border: `1px solid ${isSelectable && !isOnDay ? COLOR : isOnDay ? `${TYPE_COLORS[w.type]}50` : `${TYPE_COLORS[w.type]}30`}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: isSelectable ? "pointer" : "default", opacity: isOnDay && !isSelectable ? 0.5 : 1, background: isSelectable && !isOnDay ? `${COLOR}08` : "#1A1F2E", transition: "all 0.15s" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: `${TYPE_COLORS[w.type]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{TYPE_ICONS[w.type]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#F9FAFB" }}>{w.label}</div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{w.duration}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {isOnDay ? <span style={{ color: TYPE_COLORS[w.type] }}>📅 {onDayName}</span>
                          : isSelectable ? <span style={{ color: COLOR }}>← Assign here</span>
                          : <span style={{ color: "#4B5563" }}>Unscheduled</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ══ NUTRITION TAB ════════════════════════════════════════════════════ */}
        {tab === "nutrition" && (
          <>
            <div style={{ ...card, border: `1px solid ${COLOR}40`, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR, marginBottom: 4 }}>{profile.name}'s Personalized Targets</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>{stats.weight} lbs → goal {stats.goalWeight} lbs · {stats.trainingHrs} hrs/week</div>
              <div style={{ display: "flex", gap: 7 }}>
                {[["Calories", calcs.target.toLocaleString(), "#F59E0B"], ["Protein", calcs.protein + "g", "#10B981"], ["Carbs", calcs.carbs + "g", "#3B82F6"], ["Fat", calcs.fat + "g", "#F97316"]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, background: "#0F1117", borderRadius: 8, padding: "8px 5px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#6B7280" }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {calcs.deficit > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "#F59E0B" }}>📉 {calcs.deficit} kcal/day deficit — ~{(calcs.deficit / 500).toFixed(1)} lb/week loss</div>}
              <div style={{ marginTop: 6, fontSize: 11, color: "#6B7280" }}>Adjust in 👤 Stats tab</div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {Object.keys(NUTRITION).map(key => (
                <button key={key} onClick={() => setNutTab(key)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${nutTab === key ? COLOR : "#2D3748"}`, background: nutTab === key ? `${COLOR}15` : "#1A1F2E", color: nutTab === key ? COLOR : "#9CA3AF", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {key === "trainingDay" ? "🏋️ Train" : key === "restDay" ? "😴 Rest" : "🏁 Race"}
                </button>
              ))}
            </div>

            {(() => {
              const plan = NUTRITION[nutTab];
              return (
                <>
                  <div style={{ ...card, border: `1px solid ${COLOR}30`, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLOR, marginBottom: 8 }}>{plan.label} — General Targets</div>
                    <div style={{ display: "flex", gap: 7 }}>
                      {[["Calories", plan.calories, "#F59E0B"], ["Protein", plan.macros.protein, "#10B981"], ["Carbs", plan.macros.carbs, "#3B82F6"], ["Fat", plan.macros.fat, "#F97316"]].map(([l, v, c]) => (
                        <div key={l} style={{ flex: 1, background: "#0F1117", borderRadius: 8, padding: "8px 5px", textAlign: "center" }}>
                          <div style={{ fontSize: 9, color: "#6B7280" }}>{l}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: c, marginTop: 2, lineHeight: 1.3 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em" }}>MEAL SCHEDULE</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.meals.map((meal, i) => (
                      <div key={i} style={{ ...card, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#6B7280" }}>{meal.time}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>{meal.label}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {meal.kcal > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>{meal.kcal} kcal</div>}
                            <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>{meal.protein} protein</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {meal.items.map((item, j) => (
                            <span key={j} style={{ fontSize: 11, background: "#0F1117", color: "#D1D5DB", padding: "3px 8px", borderRadius: 20, border: "1px solid #374151" }}>{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {nutTab === "trainingDay" && (
                    <div style={{ ...card, padding: "12px 14px", marginTop: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 7 }}>💧 Hydration</div>
                      {["16 oz water on waking", "16–20 oz in the 2 hrs before training", "16 oz per 30 min of intense effort — add electrolytes when sweating heavily", "Target: pale yellow urine throughout the day"].map((t, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 5, paddingLeft: 12, borderLeft: `2px solid ${COLOR}`, lineHeight: 1.5 }}>{t}</div>
                      ))}
                    </div>
                  )}
                  {nutTab === "raceDay" && (
                    <div style={{ background: "#EF444415", borderRadius: 10, padding: "12px 14px", marginTop: 14, border: "1px solid #EF444440" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 5 }}>⚠️ Rule #1</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>Never consume anything on race day that you haven't practiced in training. Test all gels and electrolytes on long workouts 4+ weeks out.</div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* ══ BRICKS TAB ═══════════════════════════════════════════════════════ */}
        {tab === "bricks" && (
          <>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.6 }}>
              Brick workouts combine bike → run to train your legs for the transition. The "brick" feeling — heavy, unresponsive legs — improves with repeated practice.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BRICK_LIBRARY.map((b, i) => (
                <div key={b.id} style={{ ...card, border: `1px solid ${expandedBrick === i ? "#EC4899" : "#2D3748"}`, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 10, cursor: "pointer" }} onClick={() => setExpandedBrick(expandedBrick === i ? null : i)}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EC489920", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{b.name}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "#EC4899", background: "#EC489915", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{b.level}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{b.duration}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#374151" }}>{expandedBrick === i ? "▲" : "▼"}</span>
                  </div>
                  {expandedBrick === i && (
                    <div style={{ padding: "0 14px 14px", borderTop: "1px solid #2D3748", paddingTop: 10 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1, background: "#0F1117", borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10, color: "#F97316", fontWeight: 600, marginBottom: 3 }}>🚴 BIKE</div>
                          <div style={{ fontSize: 12, color: "#D1D5DB" }}>{b.bike}</div>
                        </div>
                        <div style={{ flex: 1, background: "#0F1117", borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10, color: "#10B981", fontWeight: 600, marginBottom: 3 }}>🏃 RUN</div>
                          <div style={{ fontSize: 12, color: "#D1D5DB" }}>{b.run}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 7, lineHeight: 1.55 }}><span style={{ color: "#F9FAFB", fontWeight: 600 }}>Purpose: </span>{b.purpose}</div>
                      <div style={{ background: "#F59E0B15", border: "1px solid #F59E0B30", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600, marginBottom: 3 }}>💡 TIP</div>
                        <div style={{ fontSize: 12, color: "#D1D5DB", lineHeight: 1.55 }}>{b.tip}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ PROGRESS TAB ═════════════════════════════════════════════════════ */}
        {tab === "progress" && (
          <>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>Check off sessions as you complete them.</div>
            {(() => {
              let totalDone = 0, totalPossible = 0;
              WEEKS.forEach(w => {
                const wkData = progress[`w${w.week}`] || {};
                totalDone += Object.values(wkData).filter(Boolean).length;
                totalPossible += DAYS.filter(d => getWeek(w.week - 1).assignment[d]).length;
              });
              const pct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;
              return (
                <div style={{ ...card, border: `1px solid ${COLOR}40`, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{profile.name} — Overall</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{totalDone} / {totalPossible} sessions</div>
                  </div>
                  <div style={{ height: 8, background: "#2D3748", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${COLOR},${COLOR}cc)`, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 5 }}>{pct}% complete</div>
                </div>
              );
            })()}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {WEEKS.map(w => {
                const wkData = progress[`w${w.week}`] || {};
                const weekFull = getWeek(w.week - 1);
                const scheduledDays = DAYS.filter(d => weekFull.assignment[d]);
                const done = scheduledDays.filter(d => wkData[d]).length;
                const total = scheduledDays.length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={w.week} style={{ ...card, border: `1px solid ${activeWeek === w.week ? PHASE_COLORS[w.phase] : "#2D3748"}` }}>
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: PHASE_COLORS[w.phase] }}>WK {w.week}</span>
                          <span style={{ fontSize: 10, color: "#6B7280", background: `${PHASE_COLORS[w.phase]}15`, padding: "2px 6px", borderRadius: 4 }}>{w.phase}</span>
                        </div>
                        <span style={{ fontSize: 12, color: done === total && total > 0 ? "#10B981" : "#9CA3AF", fontWeight: 600 }}>
                          {done === total && total > 0 ? "✅ Complete" : `${done}/${total}`}
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#2D3748", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: PHASE_COLORS[w.phase], borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {DAYS.map(dayName => {
                          const poolMap = Object.fromEntries([...weekFull.pool, ...(weekFull.pmPool||[])].map(p => [p.id, p]));
                          const id = weekFull.assignment[dayName];
                          const wko = id ? poolMap[id] : null;
                          const pmId = weekFull.doubles[dayName];
                          const pmWko = pmId ? poolMap[pmId] : null;
                          const isDone = !!wkData[dayName];
                          const isPMDone = !!wkData[`${dayName}_pm`];
                          return (
                            <div key={dayName} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <button onClick={() => {
                                setProgress(prev => {
                                  const wk = { ...(prev[`w${w.week}`] || {}) };
                                  wk[dayName] = !wk[dayName];
                                  return { ...prev, [`w${w.week}`]: wk };
                                });
                              }}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "5px 6px", borderRadius: 7, border: `1px solid ${isDone ? PHASE_COLORS[w.phase] : "#374151"}`, background: isDone ? `${PHASE_COLORS[w.phase]}20` : "#0F1117", cursor: "pointer", minWidth: 36 }}>
                                <span style={{ fontSize: 12 }}>{wko ? TYPE_ICONS[wko.type] : "🧘"}</span>
                                <span style={{ fontSize: 9, color: isDone ? PHASE_COLORS[w.phase] : "#6B7280", fontWeight: 600 }}>{dayName.slice(0, 2)}</span>
                                {isDone && <span style={{ fontSize: 9, color: PHASE_COLORS[w.phase] }}>✓</span>}
                              </button>
                              {pmWko && (
                                <button onClick={() => {
                                  setProgress(prev => {
                                    const wk = { ...(prev[`w${w.week}`] || {}) };
                                    wk[`${dayName}_pm`] = !wk[`${dayName}_pm`];
                                    return { ...prev, [`w${w.week}`]: wk };
                                  });
                                }}
                                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 6px", borderRadius: 7, border: `1px solid ${isPMDone ? "#8B5CF6" : "#2D3748"}`, background: isPMDone ? "#8B5CF620" : "#0F1117", cursor: "pointer", minWidth: 36 }}>
                                  <span style={{ fontSize: 11 }}>{TYPE_ICONS[pmWko.type]}</span>
                                  <span style={{ fontSize: 8, color: isPMDone ? "#8B5CF6" : "#4B5563", fontWeight: 600 }}>PM</span>
                                  {isPMDone && <span style={{ fontSize: 8, color: "#8B5CF6" }}>✓</span>}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ STATS TAB ════════════════════════════════════════════════════════ */}
        {tab === "stats" && (
          <>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
              Calorie and macro targets update automatically as you adjust these.
            </div>
            <div style={{ ...card, border: `1px solid ${COLOR}`, padding: "14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${COLOR}20`, border: `2px solid ${COLOR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLOR }}>{profile.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{raceInfo.label}</div>
                </div>
              </div>

              {/* Sex */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginBottom: 7 }}>Biological Sex</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["female", "♀ Female"], ["male", "♂ Male"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setStats(prev => ({ ...prev, sex: val }))}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, border: `2px solid ${stats.sex === val ? COLOR : "#2D3748"}`, background: stats.sex === val ? COLOR + "18" : "#0F1117", cursor: "pointer", fontSize: 13, fontWeight: 600, color: stats.sex === val ? COLOR : "#9CA3AF" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginBottom: 8 }}>Height</label>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 5 }}>Feet</div>
                    <input type="number" min={4} max={7} step={1} value={stats._ftRaw !== undefined ? stats._ftRaw : Math.floor(stats.heightIn / 12)}
                      onChange={e => setStats(prev => ({ ...prev, _ftRaw: e.target.value }))}
                      onBlur={e => { const v = parseInt(e.target.value); const ft = isNaN(v) || v < 4 ? 4 : v > 7 ? 7 : v; setStats(prev => ({ ...prev, heightIn: ft * 12 + (prev.heightIn % 12), _ftRaw: undefined })); }}
                      style={{ width: "100%", background: "#0F1117", border: `1.5px solid ${COLOR}60`, borderRadius: 8, padding: "10px 0", fontSize: 16, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 5 }}>Inches</div>
                    <input type="number" min={0} max={11} step={1} value={stats._inRaw !== undefined ? stats._inRaw : stats.heightIn % 12}
                      onChange={e => setStats(prev => ({ ...prev, _inRaw: e.target.value }))}
                      onBlur={e => { const v = parseInt(e.target.value); const inch = isNaN(v) || v < 0 ? 0 : v > 11 ? 11 : v; setStats(prev => ({ ...prev, heightIn: Math.floor(prev.heightIn / 12) * 12 + inch, _inRaw: undefined })); }}
                      style={{ width: "100%", background: "#0F1117", border: `1.5px solid ${COLOR}60`, borderRadius: 8, padding: "10px 0", fontSize: 16, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>

              {/* Age, Weight, Goal Weight, Training Hours as number inputs */}
              {[
                { label: "Age", field: "age", min: 16, max: 75, step: 1, unit: "yrs", isInt: true },
                { label: "Current Weight", field: "weight", min: 90, max: 350, step: 1, unit: "lbs", isInt: false },
                { label: "Goal Weight", field: "goalWeight", min: 90, max: 350, step: 1, unit: "lbs", isInt: false },
                { label: "Weekly Training Hours", field: "trainingHrs", min: 1, max: 25, step: 0.5, unit: "hrs", isInt: false },
              ].map(({ label, field, min, max, step, unit, isInt }) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginBottom: 7 }}>{label}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="number" min={min} max={max} step={step} value={stats[field]}
                      onChange={e => setStats(prev => ({ ...prev, [field]: e.target.value }))}
                      onBlur={e => {
                        const v = isInt ? parseInt(e.target.value) : parseFloat(e.target.value);
                        const clamped = isNaN(v) || v < min ? min : v > max ? max : v;
                        setStats(prev => ({ ...prev, [field]: clamped }));
                      }}
                      style={{ flex: 1, background: "#0F1117", border: `1.5px solid ${COLOR}60`, borderRadius: 8, padding: "10px 12px", fontSize: 16, fontWeight: 700, color: "#F9FAFB", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
                    <span style={{ fontSize: 13, color: "#9CA3AF", minWidth: 36 }}>{unit}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>Range: {min}–{max} {unit}</div>
                </div>
              ))}

              <div style={{ background: "#0F1117", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>CALCULATED DAILY TARGETS</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {[["Calories", calcs.target.toLocaleString() + " kcal", "#F59E0B"], ["Protein", calcs.protein + "g", "#10B981"], ["Carbs", calcs.carbs + "g", "#3B82F6"], ["Fat", calcs.fat + "g", "#F97316"]].map(([l, v, col]) => (
                    <div key={l} style={{ flex: 1, background: "#1A1F2E", borderRadius: 7, padding: "7px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#6B7280" }}>{l}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: col, marginTop: 2, lineHeight: 1.3 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <div style={{ flex: 1, background: "#1A1F2E", borderRadius: 7, padding: "6px 8px", fontSize: 11, color: "#9CA3AF" }}>
                    <span style={{ color: "#6B7280" }}>BMR </span>{calcs.bmr?.toLocaleString()} kcal
                  </div>
                  <div style={{ flex: 1, background: "#1A1F2E", borderRadius: 7, padding: "6px 8px", fontSize: 11, color: "#9CA3AF" }}>
                    <span style={{ color: "#6B7280" }}>TDEE </span>{calcs.tdee?.toLocaleString()} kcal
                  </div>
                </div>
                {calcs.deficit > 0 ? (
                  <div style={{ fontSize: 11, color: "#F59E0B", background: "#F59E0B15", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                    📉 {calcs.deficit} kcal/day deficit · ~{(calcs.deficit / 500).toFixed(1)} lb/week · goal in ~{Math.ceil((stats.weight - stats.goalWeight) / (calcs.deficit / 500))} weeks
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#10B981", background: "#10B98115", borderRadius: 6, padding: "6px 10px" }}>
                    ✅ At or below goal weight — targets set for performance maintenance.
                  </div>
                )}
              </div>
            </div>
            <div style={{ background:"#10B98115", border:"1px solid #10B98130", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>💾</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#10B981" }}>Auto-saved to this device</div>
                <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>Progress, schedule changes, and stats are stored locally. They'll be here next time you open the app.</div>
              </div>
            </div>
            <div style={{ ...card, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>📋 How targets are calculated</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.65 }}>
                Uses the Mifflin-St Jeor equation with your sex, height, age, and weight to estimate BMR. TDEE adds a moderate activity multiplier plus ~350 kcal/hr of structured training. A deficit of up to 500 kcal/day is applied when current weight exceeds goal. Protein is set at 0.85g/lb (female) or 1.0g/lb (male) to preserve lean mass during training. Consult a registered dietitian for clinical precision.
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
