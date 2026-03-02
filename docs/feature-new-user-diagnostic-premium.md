# New User Diagnostic Exam and Premium Trial Feature

## Overview
This document outlines the implementation plan for the feature that grants new users a 3-day premium trial and access to a one-time diagnostic exam. Based on the exam results, users will be recommended premium plans of varying durations.

## Tasks

1. **User Model Update**
   - Add a new boolean field `hasTakenDiagnosticExam` to the User type to track if the diagnostic exam has been taken.

2. **User Registration and Trial Granting**
   - Update the user registration flow to:
     - Grant a 3-day premium trial.
     - Set `hasTakenDiagnosticExam` to `false`.

3. **Profile Header UI**
   - Modify `ProfileHeaderCard.tsx` to:
     - Add an "Examen Diagnóstico" button next to the "Hazte Premium" button.
     - Show this button only if `hasTakenDiagnosticExam` is `false`.
     - Clicking the button navigates to the diagnostic exam.

4. **Diagnostic Exam Handling**
   - In the exam completion logic:
     - Detect if the completed exam is the diagnostic exam.
     - Calculate the number of wrong answers.
     - Based on wrong answers, recommend and set premium plan duration:
       - 0-10 wrong: 7 days
       - 11-20 wrong: 15 days
       - >20 wrong: 30 days
     - Update the user document to set `hasTakenDiagnosticExam` to `true`.
     - Remove access to the diagnostic exam.

5. **Testing**
   - Test new user registration and trial granting.
   - Test visibility and functionality of the "Examen Diagnóstico" button.
   - Test diagnostic exam completion and premium plan recommendation.
   - Verify premium access is granted correctly and diagnostic exam access is revoked.

## Notes
- The diagnostic exam should be created in Firebase with a known ID (e.g., `diagnostic-exam`).
- UI/UX should clearly communicate the premium plan recommendation after exam completion.

---

This plan ensures a smooth onboarding experience for new users, encouraging premium subscription through personalized recommendations based on diagnostic exam performance.
