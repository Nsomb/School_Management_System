// config/evaluationConfig.js
const EvaluationConfig = {
    // Map term identifiers (as used in academic_calendar) to evaluation types
    termEvaluationMapping: {
        "1": ["1st Evaluation", "2nd Evaluation"],
        "2": ["3rd Evaluation", "4th Evaluation"],
        "3": ["5th Evaluation", "6th Evaluation"]
    },

    // Convert teacher entry to report card display format (if needed)
    normalizeEvaluationType: (evalType) => {
        const mappings = {
            "1st Evaluation": "Evaluation 1",
            "2nd Evaluation": "Evaluation 2",
            "3rd Evaluation": "Evaluation 3",
            "4th Evaluation": "Evaluation 4",
            "5th Evaluation": "Evaluation 5",
            "6th Evaluation": "Evaluation 6"
        };
        return mappings[evalType] || evalType;
    },

    // Determine term from evaluation type
    getTermFromEvaluationType: (evalType) => {
        if (["1st Evaluation", "2nd Evaluation"].includes(evalType)) return "1";
        if (["3rd Evaluation", "4th Evaluation"].includes(evalType)) return "2";
        if (["5th Evaluation", "6th Evaluation"].includes(evalType)) return "3";
        return "1"; // default
    },

    // Get evaluation types for a given term (returns array)
    getEvaluationTypes: (termKey) => {
        const types = EvaluationConfig.termEvaluationMapping[termKey];
        return types || [];
    },

    // Validate teacher input
    validateEvaluationType: (evaluation_type) => {
        const validTypes = [
            "1st Evaluation", "2nd Evaluation", "3rd Evaluation",
            "4th Evaluation", "5th Evaluation", "6th Evaluation"
        ];
        if (!validTypes.includes(evaluation_type)) {
            throw new Error(`Invalid evaluation type. Must be one of: ${validTypes.join(', ')}`);
        }
    },

    // Get all valid evaluation types
    getValidEvaluationTypes: () => {
        return [
            "1st Evaluation", "2nd Evaluation", "3rd Evaluation",
            "4th Evaluation", "5th Evaluation", "6th Evaluation"
        ];
    },

    // Check if a term key is valid
    isValidTerm: (termKey) => {
        return Object.keys(EvaluationConfig.termEvaluationMapping).includes(termKey);
    },

    // Get current academic year (fallback)
    getCurrentAcademicYear: () => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }
};

module.exports = EvaluationConfig;