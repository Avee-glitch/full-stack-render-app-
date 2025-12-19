router.get('/stats', (req, res) => {
  const categoryDistribution = {};
  let verifiedCases = 0;
  let pendingCases = 0;

  demoCases.forEach(c => {
    // category count
    categoryDistribution[c.category] =
      (categoryDistribution[c.category] || 0) + 1;

    // status count
    if (c.status === 'verified') verifiedCases++;
    else pendingCases++;
  });

  res.json({
    success: true,
    data: {
      totalCases: demoCases.length,
      totalUsers: 0,                 // mock
      totalEvidence: demoCases.length,
      verifiedCases,
      pendingCases,
      categoryDistribution
    }
  });
});
