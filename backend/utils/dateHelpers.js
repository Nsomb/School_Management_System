// utils/dateHelpers.js

const getCurrentAcademicYearAndTerm = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    let academicYear, term;

    // Cameroon School Calendar
    if (month >= 9 && month <= 12) {
        academicYear = `${year}/${year + 1}`;
        term = 'Term 1';
    } else if (month >= 1 && month <= 4) {
        academicYear = `${year - 1}/${year}`;
        term = 'Term 2';
    } else if (month >= 5 && month <= 6) {
        academicYear = `${year - 1}/${year}`;
        term = 'Term 3';
    } else {
        // July - August: Holidays - show year-end summary
        academicYear = `${year - 1}/${year}`;
        term = 'Year-End';
    }

    return { academicYear, term };
};

const getEvaluationTypesForTerm = (term) => {
    const mapping = {
        'Term 1': ['1st Evaluation', '2nd Evaluation', 'Term 1 Evaluation 1', 'Term 1 Evaluation 2'],
        'Term 2': ['3rd Evaluation', '4th Evaluation', 'Term 2 Evaluation 3', 'Term 2 Evaluation 4'],
        'Term 3': ['5th Evaluation', '6th Evaluation', 'Term 3 Evaluation 5', 'Term 3 Evaluation 6'],
        'Year-End': ['1st Evaluation', '2nd Evaluation', '3rd Evaluation', '4th Evaluation', '5th Evaluation', '6th Evaluation'],
        'All Terms': ['1st Evaluation', '2nd Evaluation', '3rd Evaluation', '4th Evaluation', '5th Evaluation', '6th Evaluation'],
    };
    return mapping[term] || [];
};

const getTerms = () => ['Term 1', 'Term 2', 'Term 3', 'Year-End'];

module.exports = {
    getCurrentAcademicYearAndTerm,
    getEvaluationTypesForTerm,
    getTerms
};