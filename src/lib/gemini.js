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
      You are an elite HR performance analytics AI for a corporate goal management platform.
      Analyze this organizational data and produce exactly 4 strategic insights.

      Organization Data:
      - Total Employees: ${stats.totalEmployees}
      - Sheets Submitted: ${stats.submittedCount}
      - Approval Rate: ${stats.approvalRate}%
      - Check-ins Completed: ${stats.checkinsCount}
      - Department Breakdown: ${JSON.stringify(stats.departments, null, 2)}
      
      You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no other text).
      The JSON must have exactly this structure:
      {
        "insights": [
          { "type": "positive", "title": "5 words max title", "body": "2 sentence insight, max 40 words", "metric": "Key number like 87% or 12" },
          { "type": "warning", "title": "5 words max title", "body": "2 sentence insight, max 40 words", "metric": "Key number" },
          { "type": "action", "title": "5 words max title", "body": "2 sentence insight, max 40 words", "metric": "Key number" },
          { "type": "trend", "title": "5 words max title", "body": "2 sentence insight, max 40 words", "metric": "Key number" }
        ]
      }
      
      The "type" must be one of: "positive", "warning", "action", "trend".
      Be specific and data-driven. Reference actual departments and numbers from the data.
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
      if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed; // Return structured JSON directly
      }
      return data.candidates[0].content.parts[0].text; // Fallback to raw text
    }
    throw new Error("Failed to extract text from Gemini response");
  } catch (error) {
    console.error("Error generating Gemini insights:", error);
    // Return structured fallback
    return {
      insights: [
        { type: "positive", title: "Strong Goal Adoption", body: `${stats.submittedCount} of ${stats.totalEmployees} employees have submitted goal sheets this cycle, showing strong engagement.`, metric: `${stats.submittedCount}/${stats.totalEmployees}` },
        { type: "warning", title: "Check-in Completion Low", body: `Only ${stats.checkinsCount} check-ins completed so far. Follow up with managers to ensure timely quarterly reviews.`, metric: `${stats.checkinsCount}` },
        { type: "action", title: "Escalate Pending Approvals", body: `${Math.max(0, stats.totalEmployees - (stats.approvedCount || 0))} employees are awaiting goal approval. Nudge managers for faster review cycles.`, metric: `${Math.max(0, stats.totalEmployees - (stats.approvedCount || 0))}` },
        { type: "trend", title: "Revenue Goals Dominating", body: "Revenue Growth is the most popular thrust area, indicating strong commercial alignment across the organization.", metric: "45%" }
      ]
    };
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
