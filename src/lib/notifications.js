import emailjs from '@emailjs/browser';

// In a real app, keep keys secure. For hackathon, public key is used.
emailjs.init('PUBLIC_KEY_PLACEHOLDER');

const EMAIL_TEMPLATES = {
  goal_submitted: 'template_submitted',
  goal_approved: 'template_approved',
  goal_returned: 'template_returned',
  checkin_reminder: 'template_reminder'
};

export async function sendEmailNotification(type, data) {
  try {
    // If not configured, just log to console (useful for development)
    if (EMAIL_TEMPLATES[type] === 'template_submitted' || EMAIL_TEMPLATES[type]) {
      console.log('Would send email:', type, data);
    }
    
    // Simulate real Email JS sending for demo purposes if keys were valid
    // await emailjs.send('default_service', EMAIL_TEMPLATES[type], {
    //   to_name: data.recipientName,
    //   to_email: data.recipientEmail,
    //   employee_name: data.employeeName,
    //   cycle_name: data.cycleName || 'Current Cycle',
    //   portal_url: window.location.origin,
    //   message: data.message || ''
    // });
    
    // Also trigger Teams notification
    await sendTeamsNotification(type, data);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false; // Don't throw, let app continue
  }
}

// Microsoft Teams Bot / Webhook Integration (Mocked for Hackathon)
export async function sendTeamsNotification(type, data) {
  try {
    const webhookUrl = 'https://nexus.webhook.office.com/webhookb2/...'; // Mock Webhook URL
    
    // Construct Adaptive Card
    const cardPayload = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "5B5FFF",
      "summary": `Nexus Alert: ${type}`,
      "sections": [{
        "activityTitle": `Nexus Performance Update`,
        "activitySubtitle": data.message || `Action required regarding ${data.employeeName}`,
        "facts": [
          { "name": "Employee:", "value": data.employeeName || 'N/A' },
          { "name": "Event:", "value": type.replace(/_/g, ' ').toUpperCase() },
          { "name": "Cycle:", "value": data.cycleName || 'Active Cycle' }
        ],
        "markdown": true
      }],
      "potentialAction": [{
        "@type": "OpenUri",
        "name": "Open in Nexus Portal",
        "targets": [{ "os": "default", "uri": `${window.location.origin}/dashboard-manager` }]
      }]
    };

    console.log(`[TEAMS WEBHOOK] Would send Adaptive Card to Teams Channel for ${data.recipientName}:`, cardPayload);
    
    // In production, we would use fetch to POST to the webhookUrl
    // await fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(cardPayload)
    // });

    return true;
  } catch (err) {
    console.error('Teams notification failed', err);
    return false;
  }
}
