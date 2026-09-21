// We don't need any models here as the data is from the .env file.
const SchoolInfoController = {
  getSchoolInfo: (req, res) => {
    try {
      // Read the school name from the environment variable.
      const schoolName = process.env.SCHOOL_NAME || 'Default School System';
      
      // Construct the URL for the logo. The path is relative to the base URL
      // once Express is configured to serve static files from the 'assets' folder.
      const logoUrl = '/assets/logo.png';
      
      // Send the data as a JSON response.
      res.json({
        schoolName,
        logoUrl
      });
    } catch (error) {
      console.error("Error in SchoolInfoController:", error);
      res.status(500).json({ error: "An internal server error occurred." });
    }
  },
};

module.exports = SchoolInfoController;