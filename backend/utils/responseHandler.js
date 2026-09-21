exports.handleRequest = async (res, callback) => {
  try {
    const result = await callback();
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'An error occurred' });
  }
};
