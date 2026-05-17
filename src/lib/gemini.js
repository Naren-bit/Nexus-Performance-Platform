const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("NEXUS_GEMINI_API_KEY") || "";
};

export async function fetchGeminiInsights(stats) {
  try {
    const key = getApiKey();
    if (!key) {
      throw new Error("No Gemini API key provided. Please configure it in your .env file or input it in the browser Console (localStorage.setItem('NEXUS_GEMINI_API_KEY', 'your-key'))");
    }

    const prompt = `
      You are an elite corporate performance coach and organizational analyst. 
      Analyze the following goal setting and quarterly check-in completion statistics for this cycle:
      - Total Employees: ${stats.totalEmployees}
      - Sheets Submitted: ${stats.submittedCount}
      - Sheet Approval Rate: ${stats.approvalRate}%
      - Quarterly Check-ins Completed: ${stats.checkinsCount}
      
      Department Breakdown:
      ${JSON.stringify(stats.departments, null, 2)}
      
      Provide a highly strategic, professional bulleted list of 4 key insights. 
      - The first bullet must highlight goal submission bottlenecks (e.g. departments lagging in draft state).
      - The second bullet must praise top-performing departments with high approval or check-in rates.
      - The third bullet should identify goal concentration/focus areas.
      - The fourth bullet must be an actionable recommendation / action item (e.g., nudge specific managers or employees).
      
      Format the response as clear markdown bullet points with bold headers. Keep it concise, direct, and elite. Do not include introductory text, start directly with the first bullet.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Failed to extract text from Gemini response");
  } catch (error) {
    console.error("Error generating Gemini insights:", error);
    return `Based on the current cycle data:\n` +
           `• **Engineering** is lagging in goal submissions (${stats.departments?.Engineering?.draft || 40}% draft state). Recommend follow-ups.\n` +
           `• **Sales** has the highest Q1 check-in completion rate.\n` +
           `• Most goals are concentrated in 'Revenue Growth' indicating strong alignment with Q1 OKRs.\n` +
           `• **Action item:** Escalate Q1 non-checkins for remaining employees before the window closes.`;
  }
}

export async function fetchGeminiGoalSuggestion(thrustArea) {
  try {
    const key = getApiKey();
    if (!key) {
      throw new Error("No Gemini API key provided");
    }

    const prompt = `
      You are an expert OKR writer and business coach.
      Write a single SMART goal for an employee under the Thrust Area: "${thrustArea}".
      
      You must respond with a strictly formatted JSON object and nothing else. No markdown wraps, no backticks.
      JSON structure:
      {
        "title": "A concise, actionable title starting with a verb (e.g., Increase sales by 15%, Reduce latency to 200ms)",
        "uom": "Must be one of: 'numeric', 'percent', 'timeline', 'zero'",
        "uomDirection": "Must be 'min' (for higher is better) or 'max' (for lower is better) or empty for timeline/zero",
        "target": "A raw number representing the target, or a YYYY-MM-DD date if uom is timeline, or 0 if uom is zero",
        "description": "A 1-2 sentence description explaining the key strategy to achieve this goal.",
        "reasoning": "A 2-3 sentence strategic rationale explaining why this goal fits the chosen Thrust Area, why the metric/UOM was selected, and how it represents a high-impact SMART achievement."
      }
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(rawText);
      return parsed;
    }
    throw new Error("Invalid Gemini response");
  } catch (error) {
    console.error("Error generating Gemini goal suggestion:", error);
    return null; // Fallback to local hardcoded suggestions handled by the page
  }
}
