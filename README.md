# Student Productivity Platform

[![Python](https://img.shields.io/badge/python-3.10%2B-0A66C2?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![JavaScript](https://img.shields.io/badge/javascript-000000?style=flat&logo=javascript&logoColor=F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/github/license/RitiGrover/Timetable-AI?style=flat)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/RitiGrover/Timetable-AI?style=flat)](https://github.com/RitiGrover/Timetable-AI/commits)
[![Repo Size](https://img.shields.io/github/repo-size/RitiGrover/Timetable-AI?style=flat)](https://github.com/RitiGrover/Timetable-AI)

A constraint-driven scheduling system that generates conflict-free exam timetables using Constraint Satisfaction Problem (CSP) techniques, with an integrated academic mode for structured study planning.

---

## Overview

The project models exam scheduling as a formal CSP, where subjects are assigned to time slots under strict conflict constraints derived from shared student enrollments or explicitly defined relationships. The solver guarantees that no conflicting subjects are placed in the same slot, producing a valid timetable whenever a solution exists.

Alongside scheduling, the system includes an academic planning layer that distributes study sessions across available time in a controlled and balanced manner, taking into account exam timelines and subject difficulty.

---

## Approach

The scheduling engine is built around a backtracking search with heuristic improvements. Variable selection is guided by the Minimum Remaining Values (MRV) strategy, while forward checking is used to prune invalid assignments early and reduce the search space. Constraints are enforced incrementally, ensuring consistency at every step of the assignment process.

The academic planner operates on top of this structure, treating study sessions as allocatable slots and applying distribution rules to avoid clustering while maintaining a consistent workload.

---

## System

The backend is implemented using FastAPI in Python, with the CSP solver and graph construction handled as modular components. The frontend is a minimal interface built with HTML, CSS, and JavaScript, focused on clarity and direct interaction with the scheduling engine.

---

## Structure

```
.
├── app.py
├── csp.py
├── graph.py
├── metrics.py
└── static/
    ├── index.html
    ├── styles.css
    └── app.js
```

