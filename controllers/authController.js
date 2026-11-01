export const agentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const validEmail = process.env.AGENT_EMAIL || 'agent@verdant.co';
    const validPassword = process.env.AGENT_PASSWORD || 'verdant-agent-2026';

    if (email === validEmail && password === validPassword) {
      return res.json({
        success: true,
        message: 'Agent authenticated successfully',
        agent: {
          email,
          name: 'Verdant Support Specialist',
          role: 'support_agent'
        },
        token: `mock_agent_token_${Date.now()}`
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Use agent@verdant.co / verdant-agent-2026'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
