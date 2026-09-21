// controllers/academicYearController.js
const db = require('../config/db');
const { getCurrentAcademicYearAndTerm, getTerms } = require('../utils/dateHelpers');

/**
 * Get current academic year & term based on date (no DB query)
 */
const getCurrentAcademicYearAndTermFromDate = (date = new Date()) => {
    return getCurrentAcademicYearAndTerm(date);
};

const AcademicYearController = {
    // ========== PUBLIC ROUTES ==========

    /**
     * Get current academic year and term (used by attendance, report card, etc.)
     * Always returns the date‑based value.
     */
    getCurrentAcademicYear: async (req, res) => {
        try {
            const result = getCurrentAcademicYearAndTermFromDate();
            return res.status(200).json({
                academic_year: result.academicYear,
                current_term: result.term,
                is_current: true // always current based on the date
            });
        } catch (error) {
            console.error("Error getting current academic year:", error);
            return res.status(500).json({ error: "Failed to get current academic year" });
        }
    },

    /**
     * Get available academic years (for dropdowns)
     * Generates the last 5 years dynamically.
     */
    getAcademicYears: async (req, res) => {
        try {
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let i = 0; i < 5; i++) {
                const start = currentYear - i;
                years.push(`${start}-${start + 1}`);
            }
            return res.status(200).json(years.map(y => ({ value: y, label: y })));
        } catch (error) {
            console.error("Error getting academic years:", error);
            return res.status(500).json({ error: "Failed to get academic years" });
        }
    },

    /**
     * Get terms for a specific academic year – returns the standard three terms.
     */
    getTermsByAcademicYear: async (req, res) => {
        try {
            const { academic_year } = req.params;
            const terms = getTerms(); // ['Term 1', 'Term 2', 'Term 3', 'Year-End']
            return res.status(200).json({
                academic_year,
                terms: terms.map(term => ({ term, start_date: null, end_date: null }))
            });
        } catch (error) {
            console.error("Error getting terms:", error);
            return res.status(500).json({ error: "Failed to get terms" });
        }
    },

    /**
     * Get complete academic calendar – generate approximate dates for display.
     * The dates are approximate and used only for UI hints.
     */
    getAcademicCalendar: async (req, res) => {
        try {
            const currentYear = new Date().getFullYear();
            const calendar = [];
            // Generate for the last 3 years
            for (let i = 0; i < 3; i++) {
                const start = currentYear - i;
                const year = `${start}-${start + 1}`;
                const terms = getTerms().filter(t => t !== 'Year-End');
                terms.forEach((term) => {
                    let startDate, endDate;
                    // Approximate Cameroonian school calendar dates
                    if (term === 'Term 1') {
                        startDate = `${start}-09-01`;
                        endDate = `${start}-12-15`;
                    } else if (term === 'Term 2') {
                        startDate = `${start + 1}-01-05`;
                        endDate = `${start + 1}-04-10`;
                    } else if (term === 'Term 3') {
                        startDate = `${start + 1}-04-25`;
                        endDate = `${start + 1}-07-30`;
                    }
                    calendar.push({ academic_year: year, term, start_date: startDate, end_date: endDate });
                });
            }
            return res.status(200).json({ calendar });
        } catch (error) {
            console.error("Error getting academic calendar:", error);
            return res.status(500).json({ error: "Failed to get academic calendar" });
        }
    },

    // ========== ADMIN ROUTES (deprecated but kept to avoid breaking routes) ==========

    /**
     * Setup is no longer needed – academic year is auto-calculated.
     */
    setupAcademicYear: async (req, res) => {
        return res.status(400).json({
            error: "Academic year is auto-calculated based on the current date. Manual setup is not supported."
        });
    },

    /**
     * Update term dates – not applicable with date‑based logic.
     */
    updateAcademicTerm: async (req, res) => {
        return res.status(400).json({
            error: "Terms are auto-calculated. Manual updates are not supported."
        });
    },

    /**
     * Archiving is not needed when years are computed on‑the‑fly.
     */
    autoArchiveOldYears: async (req, res) => {
        return res.status(200).json({
            message: "Archiving is not applicable with date‑based academic year calculation."
        });
    },

    /**
     * Delete academic year – not possible with auto‑calculation.
     */
    deleteAcademicYear: async (req, res) => {
        return res.status(400).json({
            error: "Cannot delete auto‑calculated academic years."
        });
    }
};

// Export helpers so they can be used by other modules if needed
module.exports = {
    AcademicYearController,
    getCurrentAcademicYearAndTerm: getCurrentAcademicYearAndTermFromDate
};