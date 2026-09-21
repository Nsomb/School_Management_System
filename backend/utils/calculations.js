// utils/calculations.js

/**
 * @file This module contains utility functions for performing various calculations
 * related to student marks, averages, and class performance.
 * These functions are designed to be reusable and keep the controllers
 * focused on request/response handling, while ensuring calculation logic
 * is centralized and easily testable.
 */

/**
 * Calculates a student's average score for a single subject based on their evaluation marks.
 * It iterates through specified evaluation types (e.g., Eval1, Eval2, Exam) and
 * sums up valid marks, then divides by the count of valid marks to get the average.
 *
 * @param {Array<string>} evaluationTypes - An array of strings representing the types
 * of evaluations to consider (e.g., ['Eval1', 'Eval2', 'Exam']). This order
 * might be important if your grading system has specific weighting or sequence.
 * @param {object} evaluations - An object where keys are evaluation types (e.g., 'Eval1')
 * and values are the corresponding mark values (numbers). Example: { Eval1: 15, Eval2: 18, Exam: null }.
 * @param {number} coefficient - The coefficient for the subject. While not directly
 * used in this average calculation, it's included for context if future
 * weighting changes are needed within this function, or for clarity in calling contexts.
 * @returns {number|null} The calculated average mark for the subject. Returns `null`
 * if no valid numeric marks are found for the specified evaluation types,
 * preventing division by zero errors. The average is assumed to be out of 20
 * if marks are out of 20, but this function just calculates the average value.
 */
const calculateStudentAverage = (evaluationTypes, evaluations, coefficient) => {
    let totalScore = 0;
    let count = 0;

    // Iterate through each expected evaluation type
    evaluationTypes.forEach(type => {
        const mark = evaluations[type];
        // Check if the mark is a valid number (not null, undefined, or non-numeric)
        // and if it's a non-negative value (marks typically aren't negative)
        if (typeof mark === 'number' && mark >= 0) {
            totalScore += mark;
            count++;
        }
    });

    // If no valid marks were found, return null to indicate no average could be calculated.
    if (count === 0) {
        return null;
    }

    // Return the average score for the subject.
    return totalScore / count;
};

/**
 * Calculates the overall term average for a single student.
 * It takes an array of subject averages (each with its coefficient)
 * and computes a weighted average for the entire term.
 *
 * @param {Array<object>} subjectAverages - An array of objects, where each object
 * represents a subject's average for the student and its coefficient.
 * Example: [{ average: 14.5, coefficient: 3 }, { average: 16.0, coefficient: 4 }].
 * Each object should have `average` (a number or null) and `coefficient` (a number).
 * @returns {number|null} The calculated weighted term average for the student.
 * Returns `null` if no valid subject averages with corresponding coefficients
 * can be used for calculation (e.g., all averages are null or all coefficients are zero).
 */
const calculateTermAverage = (subjectAverages) => {
    let totalWeightedScore = 0;
    let totalCoefficient = 0;

    // Iterate through each subject's average and coefficient
    subjectAverages.forEach(subj => {
        // Ensure both average and coefficient are valid numbers before including in calculation
        if (typeof subj.average === 'number' && subj.average !== null && typeof subj.coefficient === 'number') {
            totalWeightedScore += subj.average * subj.coefficient;
            totalCoefficient += subj.coefficient;
        }
    });

    // Prevent division by zero if no subjects had valid coefficients or averages
    if (totalCoefficient === 0) {
        return null;
    }

    // Return the weighted term average.
    return totalWeightedScore / totalCoefficient;
};

/**
 * Calculates the overall average mark for an entire class for a specific term.
 * It computes the average of individual student term averages for that class.
 *
 * @param {Array<number|null>} studentTermAverages - An array containing the calculated
 * term averages for individual students in the class. Some values might be `null`
 * if a student's term average couldn't be calculated.
 * Example: [15.2, 14.8, null, 16.1].
 * @returns {number|null} The calculated class average. Returns `null` if no valid
 * numeric student term averages are found in the array.
 */
const calculateClassAverage = (studentTermAverages) => {
    let totalAverage = 0;
    let count = 0;

    // Sum up all valid student term averages
    studentTermAverages.forEach(avg => {
        // Only include valid numeric averages in the calculation
        if (typeof avg === 'number' && avg !== null) {
            totalAverage += avg;
            count++;
        }
    });

    // If no valid student averages were found, return null.
    if (count === 0) {
        return null;
    }

    // Return the overall class average.
    return totalAverage / count;
};

// Export the functions to make them available for other modules to import and use.
module.exports = {
    calculateStudentAverage,
    calculateTermAverage,
    calculateClassAverage
};