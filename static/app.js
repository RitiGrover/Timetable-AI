"use strict";

/* ─── Helpers ─────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const DAY_NAMES  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES= ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDayName(d)  { return DAY_NAMES[d.getDay()]; }

/** Format Date → DD-MM-YYYY */
function fmtDMY(d) {
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}

/** Parse DD-MM-YYYY or DD.MM.YYYY or DD/MM/YYYY → Date */
function parseDMY(str) {
  const parts = str.trim().split(/[.\-\/]/);
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

/** Format Date → DD/MM/YYYY for display */
function fmtDisplay(d) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

/* ═══════════════════════════════════════════════════════════════════
   1.  PAGE NAVIGATION  (main page ↔ academic full-screen page)
   ═══════════════════════════════════════════════════════════════════ */
const mainShell    = $("main-shell");
const academicPage = $("academic-page");

function openAcademicMode() {
  mainShell.style.display   = "none";
  academicPage.classList.remove("hidden");
  window.scrollTo(0, 0);
  $("nav-academic-mode").classList.add("active-mode");
  $("nav-academic-mode").textContent = "✓ academic mode";
}

function closeAcademicMode() {
  academicPage.classList.add("hidden");
  mainShell.style.display   = "";
  $("nav-academic-mode").classList.remove("active-mode");
  $("nav-academic-mode").textContent = "academic mode";
}

$("nav-academic-mode").addEventListener("click", openAcademicMode);
$("ap-back-btn").addEventListener("click", closeAcademicMode);

/* ─── Main navbar smooth scroll ──────────────────────────────────── */
function smoothScrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("nav-product").addEventListener("click",   (e) => { e.preventDefault(); smoothScrollTo("#how-it-works"); });
$("nav-about").addEventListener("click",     (e) => { e.preventDefault(); smoothScrollTo("#about"); });
$("nav-solve-now").addEventListener("click", ()  => smoothScrollTo("#input-form"));

/* ═══════════════════════════════════════════════════════════════════
   2.  TIMETABLE GENERATOR
   ═══════════════════════════════════════════════════════════════════ */
(function initGenerator() {
  const modeEl              = $("mode");
  const slotsEl             = $("slots");
  const enrollSectionEl     = $("enrollments-section");
  const pairsSectionEl      = $("pairs-section");
  const enrollTextEl        = $("enrollments-text");
  const subjectsTextEl      = $("subjects-text");
  const pairsTextEl         = $("pairs-text");
  const sampleBtn           = $("sample-btn");
  const solveBtn            = $("solve-btn");
  const statusEl            = $("status");
  const timetableBodyEl     = $("timetable-body");
  const metricsBodyEl       = $("metrics-body");
  const conflictListEl      = $("conflict-list");
  const stepsListEl         = $("steps-list");
  const validationEl        = $("validation");
  const exportBtns          = $("export-btns");

  let lastTimetableData = [];

  function setStatus(msg, type = "muted") {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
  }

  function updateModeView() {
    if (modeEl.value === "enrollments") {
      enrollSectionEl.classList.remove("hidden");
      pairsSectionEl.classList.add("hidden");
    } else {
      enrollSectionEl.classList.add("hidden");
      pairsSectionEl.classList.remove("hidden");
    }
  }
  modeEl.addEventListener("change", updateModeView);

  function parseEnrollments(text) {
    const enrollments = {};
    for (const line of text.split("\n").map(l => l.trim()).filter(Boolean)) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const subject  = line.slice(0, idx).trim();
      const students = line.slice(idx + 1).split(",").map(s => s.trim()).filter(Boolean);
      if (subject) enrollments[subject] = students;
    }
    return enrollments;
  }

  function parsePairs(text) {
    return text.split("\n").map(l => l.trim()).filter(Boolean)
      .map(line => { const p = line.split("-").map(v => v.trim()); return p.length === 2 ? p : null; })
      .filter(Boolean);
  }

  /* ── Official university exam schedule render ── */
  function renderTimetable(rows = []) {
    lastTimetableData = rows;
    exportBtns.style.display = rows.length ? "flex" : "none";

    if (!rows.length) {
      timetableBodyEl.innerHTML = `<tr><td colspan="6" class="muted">No result yet.</td></tr>`;
      return;
    }

    const sorted = [...rows].sort((a, b) => a.time_slot - b.time_slot);

    // Assign one date per slot, starting tomorrow
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const slotDateMap = {};
    sorted.forEach(row => {
      if (!slotDateMap[row.time_slot]) {
        slotDateMap[row.time_slot] = new Date(startDate);
        startDate.setDate(startDate.getDate() + 1);
      }
    });

    let serial = 1;
    const courseCodes = {};
    let codeIdx = 101;

    timetableBodyEl.innerHTML = sorted.map(row => {
      const d   = slotDateMap[row.time_slot];
      if (!courseCodes[row.subject]) {
        const init = row.subject.replace(/\s+/g,"").slice(0,2).toUpperCase();
        courseCodes[row.subject] = `${init}${codeIdx++}`;
      }
      return `<tr>
        <td>${serial++}</td>
        <td>${fmtDisplay(d)}</td>
        <td>${getDayName(d)}</td>
        <td>2:00 PM – 5:00 PM</td>
        <td>${courseCodes[row.subject]}</td>
        <td>${row.subject}</td>
      </tr>`;
    }).join("");
  }

  function renderMetrics(rows = []) {
    metricsBodyEl.innerHTML = rows.length
      ? rows.map(r => `<tr>
          <td>${r.algorithm}</td>
          <td>${r.execution_time_ms.toFixed(4)}</td>
          <td>${r.recursive_calls}</td>
          <td>${r.constraint_checks}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="muted">No data.</td></tr>`;
  }

  function renderConflicts(conflicts = []) {
    conflictListEl.innerHTML = conflicts.length
      ? conflicts.map(c => c.shared_students && c.shared_students.length
          ? `<li><strong>${c.subject_a}</strong> conflicts with <strong>${c.subject_b}</strong> — shared students: ${c.shared_students.join(", ")}.</li>`
          : `<li><strong>${c.subject_a}</strong> conflicts with <strong>${c.subject_b}</strong> (direct pair).</li>`
        ).join("")
      : `<li class="muted">No conflicts detected.</li>`;
  }

  function renderSteps(steps = []) {
    stepsListEl.innerHTML = steps.length
      ? steps.map(s => `<li>${s}</li>`).join("")
      : `<li class="muted">No explanation available.</li>`;
  }

  /* Sample */
  sampleBtn.addEventListener("click", async () => {
    setStatus("Loading sample data…");
    try {
      const res  = await fetch("/api/sample");
      if (!res.ok) throw new Error("Could not load sample data.");
      const data = await res.json();
      modeEl.value  = data.input_mode;
      slotsEl.value = data.total_slots;
      updateModeView();
      enrollTextEl.value = Object.entries(data.enrollments)
        .map(([s, st]) => `${s}: ${st.join(", ")}`).join("\n");
      setStatus("Sample data loaded.", "success");
    } catch (err) {
      setStatus(err.message || "Failed to load sample.", "error");
    }
  });

  /* Solve */
  solveBtn.addEventListener("click", async () => {
    const payload = {
      input_mode:     modeEl.value,
      total_slots:    Number(slotsEl.value),
      enrollments:    {},
      subjects:       [],
      conflict_pairs: [],
    };

    if (payload.input_mode === "enrollments") {
      payload.enrollments = parseEnrollments(enrollTextEl.value);
      if (!Object.keys(payload.enrollments).length) {
        return setStatus("Please add subject-to-students data first.", "error");
      }
    } else {
      payload.subjects       = subjectsTextEl.value.split(",").map(s => s.trim()).filter(Boolean);
      payload.conflict_pairs = parsePairs(pairsTextEl.value);
      if (!payload.subjects.length) return setStatus("Please add subjects first.", "error");
    }

    setStatus("Solving CSP timetable…");
    validationEl.textContent = "Validating…";
    validationEl.className   = "validation muted";

    try {
      const res  = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to solve timetable.");

      renderMetrics(data.algorithm_results || []);
      renderConflicts(data.conflict_reasons || []);
      renderSteps(data.assignment_steps || []);

      if (!data.success) {
        renderTimetable([]);
        validationEl.textContent = data.message;
        validationEl.className   = "validation error";
        return setStatus("No solution found for current slot count.", "error");
      }

      renderTimetable(data.timetable || []);
      validationEl.textContent = `${data.message} Selected: ${data.selected_algorithm}.`;
      validationEl.className   = data.valid ? "validation success" : "validation error";
      setStatus("Timetable generated successfully.", "success");
    } catch (err) {
      setStatus(err.message || "An error occurred.", "error");
    }
  });

  /* PDF Export */
  $("export-pdf-btn").addEventListener("click", async () => {
    if (!lastTimetableData.length) return;
    const canvas  = await html2canvas($("exam-schedule-wrapper"), { backgroundColor: "#f8f5f5", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pW  = pdf.internal.pageSize.getWidth();
    const pH  = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    let w = pW - 20, h = w / ratio;
    if (h > pH - 24) { h = pH - 24; w = h * ratio; }
    pdf.setFontSize(13);
    pdf.text("Official Exam Schedule", 10, 10);
    pdf.addImage(imgData, "PNG", 10, 16, w, h);
    pdf.save("exam_schedule.pdf");
  });

  /* PNG Export */
  $("export-png-btn").addEventListener("click", async () => {
    if (!lastTimetableData.length) return;
    const canvas = await html2canvas($("exam-schedule-wrapper"), { backgroundColor: "#f8f5f5", scale: 2 });
    const link = Object.assign(document.createElement("a"), {
      download: "exam_schedule.png",
      href:     canvas.toDataURL("image/png"),
    });
    link.click();
  });

  updateModeView();
})();

/* ═══════════════════════════════════════════════════════════════════
   3.  ACADEMIC MODE TABS
   ═══════════════════════════════════════════════════════════════════ */
$("tab-manual").addEventListener("click", () => {
  $("tab-manual").classList.add("active");
  $("tab-ocr").classList.remove("active");
  $("am-manual-panel").classList.remove("hidden");
  $("am-ocr-panel").classList.add("hidden");
});

$("tab-ocr").addEventListener("click", () => {
  $("tab-ocr").classList.add("active");
  $("tab-manual").classList.remove("active");
  $("am-ocr-panel").classList.remove("hidden");
  $("am-manual-panel").classList.add("hidden");
});

/* ═══════════════════════════════════════════════════════════════════
   4.  OCR — SMART PARSER
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Parse OCR text from a university exam timetable.
 *
 * Handles formats like:
 *   | 05.05.2026 | TUESDAY | 02.00 PM To 05:00 PM | CSS_2203/IT_2224 INTRODUCTION TO AI |
 *   12.05.2026 | TUESDAY | 02.00 PM To 05.2202/IT_2222 DESIGN & ANALYSIS OF ALGORITHMS
 *
 * Strategy:
 *   1. Find every date in the text (DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY)
 *   2. For each date, look at surrounding text for a course title
 *   3. Course title = text after any course-code pattern (ALPHA_DIGITS/ALPHA_DIGITS)
 *      or, if absent, text after date+timing noise
 */
function parseOCRExams(rawText) {
  const DATE_RE   = /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})\b/g;
  // e.g. CSS_2203/IT_2224, MAT 2201/MAT 2226, or noisy OCR like 55.2202/IT_2222
  const CODE_RE   = /(?:[A-Z]{2,5}[\s_]*\d{3,4}|\d{1,3}[._]\d{3,4})\s*[\/\\]\s*[A-Z]{1,5}[\s_]*\d{3,4}/gi;
  // e.g. 02.00 PM To 05:00 PM  / 02:00PMTo5:00PM
  const TIMING_RE = /\d{1,2}[:.]\d{2}\s*(?:AM|PM)?\s*(?:To|to|TO|-)\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM)?/gi;
  const results = [];
  const seen    = new Set();

  // Gather lines so we can do multi-line look-ahead
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line  = lines[i];
    let   match;

    // Reset lastIndex each iteration
    DATE_RE.lastIndex = 0;

    while ((match = DATE_RE.exec(line)) !== null) {
      const [fullMatch, dd, mm, yyyy] = match;
      // Validate date values
      if (Number(dd) < 1 || Number(dd) > 31 || Number(mm) < 1 || Number(mm) > 12) continue;

      const dateStr  = `${dd.padStart(2,"0")}-${mm.padStart(2,"0")}-${yyyy}`;
      const dateKey  = dateStr;

      // --- Extract course title from this line ---
      // Method 1: take text after the last course code on the line
      let title = "";
      const codeMatches = [...line.matchAll(new RegExp(CODE_RE.source, "gi"))];
      if (codeMatches.length) {
        const lastCode = codeMatches[codeMatches.length - 1];
        const afterCode = line.slice(lastCode.index + lastCode[0].length).trim();
        title = cleanTitle(afterCode);
      }

      // Method 2: take everything after the date + strip timing noise
      if (!title) {
        let afterDate = line.slice(match.index + fullMatch.length);
        afterDate = afterDate.replace(new RegExp(TIMING_RE.source, "gi"), "");
        afterDate = afterDate.replace(new RegExp(CODE_RE.source, "gi"), "");
        afterDate = stripPipes(afterDate);
        title = cleanTitle(afterDate);
      }

      // Method 3: peek at next non-empty line for a title-only row
      if (!title && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // If next line has no date it might be a title continuation
        if (!DATE_RE.test(nextLine)) {
          const candidate = stripPipes(nextLine).replace(new RegExp(CODE_RE.source, "gi"), "").trim();
          if (candidate.length > 4) title = cleanTitle(candidate);
        }
        DATE_RE.lastIndex = 0;
      }

      if (title && title.length >= 4 && !seen.has(dateKey)) {
        seen.add(dateKey);
        results.push({ subject: title, dateStr });
      }
    }
  }

  return results;
}

function stripPipes(str) {
  return str.replace(/\|/g, " ").replace(/[+\[\]{}()]/g, "").trim();
}

function cleanTitle(str) {
  const WEEKDAY_RE = /\b(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/gi;
  const DATE_RE    = /\b\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}\b/g;
  const CODE_RE    = /(?:[A-Z]{2,5}[\s_]*\d{3,4}|\d{1,3}[._]\d{3,4})\s*[\/\\]\s*[A-Z]{1,5}[\s_]*\d{3,4}/gi;
  const TIME_RE    = /\b\d{1,2}[:.]\d{2}\s*(?:AM|PM)?\s*(?:TO|To|to|-)\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM)?\b/gi;

  return str
    .replace(/\|/g, " ")
    .replace(DATE_RE, " ")
    .replace(TIME_RE, " ")
    .replace(CODE_RE, " ")
    .replace(WEEKDAY_RE, " ")
    .replace(/\b(?:SL\.?\s*NO\.?|DATE|DAY|TIMINGS?|COURSE\s+CODE|COURSE\s+TITLE)\b/gi, " ")
    .replace(/^[\s|+\[\]{}()\d.\/\\:_-]+/, "")  // leading row numbers and OCR noise
    .replace(/[\s|+\[\]{}()]+$/, "")            // trailing noise
    .replace(/\s{2,}/g, " ")
    .trim();
}

(function initOCR() {
  const dropZone     = $("ocr-drop-zone");
  const fileInput    = $("ocr-file-input");
  const preview      = $("ocr-preview");
  const ocrStatus    = $("ocr-status");
  const resultArea   = $("ocr-result-area");
  const parsedSection= $("ocr-parsed-section");
  const rawSection   = $("ocr-raw-section");
  const parsedList   = $("ocr-parsed-list");
  const extractedTA  = $("ocr-extracted-text");

  let lastParsed = [];   // array of { subject, dateStr }
  let lastRawText = "";

  function showStatus(msg) {
    ocrStatus.textContent = msg;
    ocrStatus.classList.remove("hidden");
  }

  function showParsedView(parsed) {
    lastParsed = parsed;
    parsedSection.style.display = "block";
    rawSection.style.display    = "none";

    if (!parsed.length) {
      parsedList.innerHTML = `<p class="muted" style="font-size:0.84rem;padding:8px;">
        ⚠️ Could not auto-parse dates. Click "Show Raw Text" to copy manually.</p>`;
      return;
    }

    parsedList.innerHTML = parsed.map((p, idx) => `
      <div class="ocr-parsed-row">
        <span class="ocr-parsed-subject" title="${p.subject}">${p.subject}</span>
        <span class="ocr-parsed-date">${p.dateStr.split("-").join("/")}</span>
      </div>`).join("");
  }

  async function runOCR(file) {
    if (!file || !file.type.startsWith("image/")) {
      showStatus("⚠️ Please upload a JPG or PNG image.");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.classList.remove("hidden"); };
    reader.readAsDataURL(file);

    showStatus("🔍 Running OCR… this may take a moment.");
    resultArea.classList.add("hidden");

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: m => {
          if (m.status === "recognizing text") {
            showStatus(`🔍 OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      lastRawText = result.data.text;
      extractedTA.value = lastRawText;

      const parsed = parseOCRExams(lastRawText);
      resultArea.classList.remove("hidden");
      showParsedView(parsed);

      showStatus(parsed.length
        ? `✅ OCR complete — found ${parsed.length} exam(s). Review below.`
        : "✅ OCR complete — could not auto-parse dates. Use raw text option."
      );
    } catch (err) {
      showStatus("❌ OCR failed: " + (err.message || "Unknown error"));
    }
  }

  /* Drop zone */
  dropZone.addEventListener("click",     () => fileInput.click());
  fileInput.addEventListener("change",   e  => { if (e.target.files[0]) runOCR(e.target.files[0]); });
  dropZone.addEventListener("dragover",  e  => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop",      e  => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) runOCR(e.dataTransfer.files[0]);
  });

  /* Use parsed data → switch to manual tab & populate textarea */
  $("ocr-use-parsed-btn").addEventListener("click", () => {
    if (!lastParsed.length) return;
    const text = lastParsed.map(p => `${p.subject}: ${p.dateStr}`).join("\n");
    $("am-exam-dates").value = text;
    syncSubjectDifficultyInputs(parseExamDates(text));
    $("tab-manual").click();
  });

  /* Show / hide raw text */
  $("ocr-show-raw-btn").addEventListener("click", () => {
    parsedSection.style.display = "none";
    rawSection.style.display    = "block";
  });
  $("ocr-parse-btn").addEventListener("click", () => {
    parsedSection.style.display = "block";
    rawSection.style.display    = "none";
  });

  /* Use raw text — try to re-parse then switch */
  $("ocr-use-raw-btn").addEventListener("click", () => {
    const raw     = extractedTA.value;
    const parsed  = parseOCRExams(raw);
    if (parsed.length) {
      const text = parsed.map(p => `${p.subject}: ${p.dateStr}`).join("\n");
      $("am-exam-dates").value = text;
      syncSubjectDifficultyInputs(parseExamDates(text));
      $("tab-manual").click();
    } else {
      alert("Still could not parse dates from the text.\n\nManually edit the textarea in Manual Input tab:\n  Subject: DD-MM-YYYY");
    }
  });
})();

/* ═══════════════════════════════════════════════════════════════════
   5.  STUDY PLANNER ENGINE
   ═══════════════════════════════════════════════════════════════════ */

const CHIP_COLORS = [
  { bg:"rgba(180,160,255,0.22)", color:"#5b3fd4" },
  { bg:"rgba(160,210,160,0.25)", color:"#1a6b2a" },
  { bg:"rgba(255,210,120,0.28)", color:"#7a4c00" },
  { bg:"rgba(255,170,170,0.28)", color:"#8b1a1a" },
  { bg:"rgba(130,200,230,0.25)", color:"#0a4a6a" },
  { bg:"rgba(255,180,200,0.28)", color:"#7a1a45" },
  { bg:"rgba(160,230,210,0.28)", color:"#0a5a45" },
  { bg:"rgba(255,200,150,0.28)", color:"#7a3a00" },
];
let subjectColorMap = {};

function getSubjectColor(subject) {
  if (!subjectColorMap[subject]) {
    const idx = Object.keys(subjectColorMap).length % CHIP_COLORS.length;
    subjectColorMap[subject] = CHIP_COLORS[idx];
  }
  return subjectColorMap[subject];
}

let currentPlan  = [];   // [{ date, subjects[], isExam, isRevision }]
let currentExams = [];   // [{ subject, date, difficulty }]

const DIFFICULTY_RULES = {
  1: { weight: 0.5, maxSessions: 4,  minGapDays: 2 },
  2: { weight: 1,   maxSessions: 7,  minGapDays: 1 },
  3: { weight: 1.5, maxSessions: 10, minGapDays: 0 },
};

function getDifficultyRules(difficulty) {
  return DIFFICULTY_RULES[Number(difficulty)] || DIFFICULTY_RULES[2];
}

/* Parse exam dates from textarea */
function parseExamDates(text) {
  const exams = [];
  for (const line of text.split("\n").map(l => l.trim()).filter(Boolean)) {
    const idx = line.lastIndexOf(":");
    if (idx === -1) continue;
    const subject = cleanTitle(line.slice(0, idx));
    const dateStr = line.slice(idx + 1).trim();
    const date    = parseDMY(dateStr);
    if (date && subject) exams.push({ subject, date, difficulty: 2 });
  }
  return exams;
}

function syncSubjectDifficultyInputs(exams) {
  const container = $("am-subject-difficulty-list");
  if (!exams.length) {
    container.innerHTML = `<p class="muted" style="font-size:0.82rem;">Subjects appear here after you enter exam dates.</p>`;
    return;
  }
  container.innerHTML = exams.map(exam => `
    <div class="am-diff-row">
      <label>${exam.subject}</label>
      <select data-diff-select="${exam.subject}">
        <option value="1">Low</option>
        <option value="2" selected>Medium</option>
        <option value="3">High</option>
      </select>
    </div>`).join("");
}

$("am-exam-dates").addEventListener("input", () => {
  syncSubjectDifficultyInputs(parseExamDates($("am-exam-dates").value));
});

/* Generate */
$("am-generate-btn").addEventListener("click", () => {
  const exams = parseExamDates($("am-exam-dates").value);
  if (!exams.length) {
    alert("Please enter at least one exam.\nFormat:  Subject: DD-MM-YYYY");
    return;
  }

  exams.forEach(exam => {
    const el = document.querySelector(`[data-diff-select="${exam.subject}"]`);
    exam.difficulty = el ? Number(el.value) : Number($("am-difficulty").value);
  });

  subjectColorMap = {};
  exams.forEach(e => getSubjectColor(e.subject));

  currentExams = exams;
  currentPlan  = buildStudyPlan(exams);

  $("am-output").classList.remove("hidden");
  renderCountdown(exams);
  renderCalendar(currentPlan, exams);
  renderEditableSchedule(currentPlan, exams);
  $("am-output").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* Recalculate from edited schedule */
$("am-recalculate-btn").addEventListener("click", () => {
  if (!currentPlan.length) return;
  document.querySelectorAll(".sched-row").forEach(row => {
    const key   = row.dataset.date;
    const input = row.querySelector(".sched-subject-input");
    if (!key || !input) return;
    const entry = currentPlan.find(e => fmtDMY(e.date) === key);
    if (entry) {
      const raw = input.value.trim();
      entry.subjects = raw ? raw.split(",").map(s => s.trim()).filter(Boolean) : [];
    }
  });
  renderCalendar(currentPlan, currentExams);
  renderEditableSchedule(currentPlan, currentExams);
});

function calculateStudyPriority(exam, date) {
  const rules = getDifficultyRules(exam.difficulty);
  const daysUntilExam = Math.max(1, Math.ceil((exam.date - date) / 86400000));
  const urgencyWeight = 1 / daysUntilExam;
  return (rules.weight * 0.6) + (urgencyWeight * 0.4);
}

function allocateSubjectSlots(exams, studyDays, today) {
  const availableBySubject = {};
  const candidates = exams
    .map(exam => {
      const rules = getDifficultyRules(exam.difficulty);
      const availableDays = studyDays.filter(day => day < exam.date).length;
      const cap = Math.min(rules.maxSessions, availableDays);
      const priority = calculateStudyPriority(exam, today);
      availableBySubject[exam.subject] = cap;
      return { exam, priority, cap, exact: 0, sessions: 0 };
    })
    .filter(item => item.cap > 0);

  const totalSlots = Math.min(
    studyDays.length,
    candidates.reduce((sum, item) => sum + item.cap, 0)
  );
  const totalPriority = candidates.reduce((sum, item) => sum + item.priority, 0) || 1;

  candidates.forEach(item => {
    item.exact = (item.priority / totalPriority) * totalSlots;
    item.sessions = Math.min(item.cap, Math.floor(item.exact));
  });

  let remaining = totalSlots - candidates.reduce((sum, item) => sum + item.sessions, 0);
  while (remaining > 0) {
    const next = candidates
      .filter(item => item.sessions < item.cap)
      .sort((a, b) => {
        const fracDiff = (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact));
        return fracDiff || b.priority - a.priority;
      })[0];
    if (!next) break;
    next.sessions += 1;
    remaining -= 1;
  }

  return Object.fromEntries(candidates.map(item => [item.exam.subject, item.sessions]));
}

function canScheduleSubject(exam, date, scheduledCounts, lastScheduledDate, allocation, enforceGap = true) {
  if (date >= exam.date) return false;
  if ((scheduledCounts[exam.subject] || 0) >= (allocation[exam.subject] || 0)) return false;
  if (!enforceGap) return true;

  const lastDate = lastScheduledDate[exam.subject];
  if (!lastDate) return true;

  const rules = getDifficultyRules(exam.difficulty);
  const gapDays = Math.round((date - lastDate) / 86400000);
  return gapDays > rules.minGapDays;
}

function chooseSubjectForDay(exams, date, scheduledCounts, lastScheduledDate, allocation) {
  const choose = (enforceGap) => exams
    .filter(exam => canScheduleSubject(exam, date, scheduledCounts, lastScheduledDate, allocation, enforceGap))
    .sort((a, b) => {
      const remainingA = (allocation[a.subject] || 0) - (scheduledCounts[a.subject] || 0);
      const remainingB = (allocation[b.subject] || 0) - (scheduledCounts[b.subject] || 0);
      const scoreA = calculateStudyPriority(a, date) * (1 + remainingA * 0.15);
      const scoreB = calculateStudyPriority(b, date) * (1 + remainingB * 0.15);
      return scoreB - scoreA;
    })[0];

  return choose(true) || choose(false);
}

/* Build plan */
function buildStudyPlan(exams) {
  const sorted  = [...exams].sort((a, b) => a.date - b.date);
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const planMap = {};

  sorted.forEach(exam => {
    const examKey = fmtDMY(exam.date);
    if (!planMap[examKey]) planMap[examKey] = { date: new Date(exam.date), subjects: [], isExam: true, isRevision: false };
    planMap[examKey].subjects.push(`📋 EXAM: ${exam.subject}`);
    planMap[examKey].isExam = true;

    const rev = new Date(exam.date);
    rev.setDate(rev.getDate() - 1);
    const revKey = fmtDMY(rev);
    if (!planMap[revKey]) planMap[revKey] = { date: rev, subjects: [], isExam: false, isRevision: false };
    if (!planMap[revKey].isExam) {
      planMap[revKey].isRevision = true;
      planMap[revKey].subjects.push(`🔁 Revision: ${exam.subject}`);
    }
  });

  const lastExamDate = sorted[sorted.length - 1].date;
  const cursor = new Date(today);
  const studyDays = [];
  while (cursor < lastExamDate) {
    const key = fmtDMY(cursor);
    if (!planMap[key]) planMap[key] = { date: new Date(cursor), subjects: [], isExam: false, isRevision: false };
    if (!planMap[key].isExam && !planMap[key].isRevision) {
      studyDays.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const allocation = allocateSubjectSlots(sorted, studyDays, today);
  const scheduledCounts = {};
  const lastScheduledDate = {};

  studyDays.forEach(date => {
    const exam = chooseSubjectForDay(sorted, date, scheduledCounts, lastScheduledDate, allocation);
    if (!exam) return;

    const key = fmtDMY(date);
    planMap[key].subjects.push(exam.subject);
    scheduledCounts[exam.subject] = (scheduledCounts[exam.subject] || 0) + 1;
    lastScheduledDate[exam.subject] = new Date(date);
  });

  return Object.keys(planMap)
    .sort((a, b) => parseDMY(a) - parseDMY(b))
    .map(k => planMap[k]);
}

/* ═══════════════════════════════════════════════════════════════════
   6.  COUNTDOWN PANEL
   ═══════════════════════════════════════════════════════════════════ */
function renderCountdown(exams) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $("countdown-cards").innerHTML = [...exams]
    .sort((a, b) => a.date - b.date)
    .map(exam => {
      const diff    = Math.round((exam.date - today) / 86400000);
      const urgency = diff <= 3 ? "urgency-high" : diff <= 7 ? "urgency-medium" : "urgency-low";
      const label   = diff < 0 ? "days ago" : diff === 0 ? "TODAY" : diff === 1 ? "day" : "days";
      return `<div class="countdown-card ${urgency}">
        <div class="countdown-subject">${exam.subject}</div>
        <div class="countdown-date">${fmtDMY(exam.date)}</div>
        <div class="countdown-days">${Math.abs(diff)}</div>
        <div class="countdown-days-label">${label}</div>
      </div>`;
    }).join("");
}

/* ═══════════════════════════════════════════════════════════════════
   7.  CALENDAR VIEW
   ═══════════════════════════════════════════════════════════════════ */
function getWeekNum(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t - y) / 86400000) + 1) / 7);
}

function renderCalendar(plan, exams) {
  const grid = $("calendar-grid");
  if (!plan.length) { grid.innerHTML = ""; return; }

  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const examKeys   = new Set(exams.map(e => fmtDMY(e.date)));
  const planLookup = {};
  plan.forEach(e => { planLookup[fmtDMY(e.date)] = e; });

  // Expand range to full weeks (Mon–Sun)
  const firstDate = plan[0].date;
  const lastDate  = plan[plan.length - 1].date;
  const startMon  = new Date(firstDate);
  startMon.setDate(startMon.getDate() - ((startMon.getDay() + 6) % 7)); // back to Monday

  const DAY_LABELS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

  // ── Build <table> ─────────────────────────────────────────
  let html = `
  <table class="cal-table">
    <thead>
      <tr>
        <th class="cal-th-week"></th>
        ${DAY_LABELS.map(d => `<th class="cal-th-day">${d}</th>`).join("")}
      </tr>
    </thead>
    <tbody>`;

  const cur = new Date(startMon);
  while (cur <= lastDate) {
    html += `<tr><td class="cal-td-week">W${getWeekNum(cur)}</td>`;

    for (let i = 0; i < 7; i++) {
      const key   = fmtDMY(cur);
      const entry = planLookup[key];

      // Cell classes
      const classes = ["cal-cell"];
      if (cur.getTime() === today.getTime()) classes.push("is-today");
      if (cur < today)                       classes.push("is-past");

      // Date label
      const dateLabel = `<span class="cal-cell-date">${cur.getDate()} ${MONTH_NAMES[cur.getMonth()]}</span>`;

      // Content chips — no truncation, text wraps
      let chipsHtml = "";
      if (entry && entry.subjects.length) {
        chipsHtml = entry.subjects.map(sub => {
          const isExam = sub.startsWith("📋");
          const isRev  = sub.startsWith("🔁");

          // Build display text: keep day + course code + title but drop emoji prefix
          const display = sub
            .replace(/^📋 EXAM: /, "")
            .replace(/^🔁 Revision: /, "Rev ");

          if (isExam) {
            return `<span class="cal-chip cal-chip-exam">${display}</span>`;
          } else if (isRev) {
            return `<span class="cal-chip cal-chip-revision">${display}</span>`;
          } else {
            // Use per-subject color from the CHIP_COLORS palette
            const col = getSubjectColor(sub);
            return `<span class="cal-chip cal-chip-study" style="background:${col.bg};color:${col.color};">${display}</span>`;
          }
        }).join("");
      }

      html += `<td class="${classes.join(" ")}">${dateLabel}${chipsHtml}</td>`;
      cur.setDate(cur.getDate() + 1);
    }

    html += `</tr>`;
  }

  html += `</tbody></table>`;
  grid.innerHTML = html;
}



/* ═══════════════════════════════════════════════════════════════════
   8.  EDITABLE SCHEDULE
   ═══════════════════════════════════════════════════════════════════ */
function renderEditableSchedule(plan, exams) {
  const today      = new Date(); today.setHours(0,0,0,0);
  const examDateMap= {};
  exams.forEach(e => examDateMap[fmtDMY(e.date)] = e.subject);

  $("editable-schedule").innerHTML = plan.map(entry => {
    const key     = fmtDMY(entry.date);
    const editVal = entry.subjects
      .filter(s => !s.startsWith("📋"))
      .map(s => s.replace(/^🔁 Revision: /, ""))
      .join(", ");

    const badge = entry.isExam     ? `<span class="sched-exam-badge">EXAM</span>`
                : entry.isRevision ? `<span class="sched-exam-badge revision">REVISION</span>`
                : "";

    const dayLabel = entry.date.toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"short" });
    const disabled = entry.isExam || entry.date < today;

    return `<div class="sched-row" data-date="${key}">
      <span class="sched-date">${dayLabel}</span>
      <input class="sched-subject-input" type="text"
        value="${editVal}" placeholder="Study subjects…"
        ${disabled ? "disabled" : ""} />
      ${badge}
    </div>`;
  }).join("");
}

/* ═══════════════════════════════════════════════════════════════════
   9.  STUDY PLAN EXPORT
   ═══════════════════════════════════════════════════════════════════ */
$("am-export-pdf-btn").addEventListener("click", async () => {
  const output = $("am-output");
  if (!output || output.classList.contains("hidden")) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pW  = pdf.internal.pageSize.getWidth();
  const pH  = pdf.internal.pageSize.getHeight();

  async function addPage(elId, title, isFirst) {
    const el     = $(elId);
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#f8f5f5", scale: 2 });
    const img    = canvas.toDataURL("image/png");
    const ratio  = canvas.width / canvas.height;
    let w = pW - 20, h = w / ratio;
    if (h > pH - 24) { h = pH - 24; w = h * ratio; }
    if (!isFirst) pdf.addPage();
    pdf.setFontSize(13);
    pdf.text(title, 10, 10);
    pdf.addImage(img, "PNG", 10, 16, w, h);
  }

  await addPage("countdown-panel",  "Exam Countdown",       true);
  await addPage("calendar-block",   "Calendar View",        false);
  await addPage("schedule-block",   "Study Schedule",       false);
  pdf.save("study_plan.pdf");
});

$("am-export-png-btn").addEventListener("click", async () => {
  const el = $("calendar-block");
  if (!el) return;
  const canvas = await html2canvas(el, { backgroundColor: "#f8f5f5", scale: 2 });
  Object.assign(document.createElement("a"), {
    download: "study_plan_calendar.png",
    href:     canvas.toDataURL("image/png"),
  }).click();
});
