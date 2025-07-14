import React, { useState, useEffect } from "react";
import { useAPI } from "../services/api";

const ExportPanel = ({ plan, drills, feedback, sportProgram, rosterDetails }) => {
  const [exportFormat, setExportFormat] = useState("pdf");
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [calendarEvent, setCalendarEvent] = useState(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState("google");
  const [shareOptions, setShareOptions] = useState({
    includeDrills: true,
    includeFeedback: false,
    includeRoster: false,
    includeNotes: true
  });
  const apiService = useAPI();

  const totalDuration = drills.reduce((sum, drill) => sum + (drill.duration || 0), 0);
  const totalDrills = drills.length;

  // Generate calendar event data
  useEffect(() => {
    if (plan.length > 0 && drills.length > 0) {
      const eventData = {
        title: `${sportProgram} Practice`,
        description: generateEventDescription(),
        duration: totalDuration,
        startTime: new Date(),
        endTime: new Date(Date.now() + totalDuration * 60000),
        location: "Practice Field",
        attendees: rosterDetails.map(player => player.email).filter(Boolean)
      };
      setCalendarEvent(eventData);
    }
  }, [plan, drills, sportProgram, rosterDetails, totalDuration]);

  const generateEventDescription = () => {
    let description = `Practice Plan: ${totalDrills} drills, ${totalDuration} minutes\n\n`;
    description += "Drills:\n";
    drills.forEach((drill, index) => {
      description += `${index + 1}. ${drill.name} (${drill.duration}min)\n`;
    });
    return description;
  };

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const response = await apiService.exportPracticePlan("current", "pdf");
      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      // Fallback to text download
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(generatePlanText());
      link.download = `practice-plan-${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const generateShareableLink = async () => {
    setIsExporting(true);
    try {
      const response = await apiService.generateShareableLink("current", {
        includeDrills: shareOptions.includeDrills,
        includeFeedback: shareOptions.includeFeedback,
        includeRoster: shareOptions.includeRoster,
        includeNotes: shareOptions.includeNotes
      });
      setGeneratedLink(response.url);
    } catch (error) {
      console.error("Link generation failed:", error);
      // Fallback to mock link
      const mockLink = `https://coachcore.ai/practice-plan/${Date.now()}`;
      setGeneratedLink(mockLink);
    } finally {
      setIsExporting(false);
    }
  };

  const sendEmail = async () => {
    if (!shareEmail.trim()) {
      alert("Please enter an email address");
      return;
    }
    
    setIsExporting(true);
    try {
      await apiService.sharePracticePlan("current", {
        email: shareEmail,
        message: shareMessage,
        format: "email",
        options: shareOptions
      });
      alert(`Practice plan sent to ${shareEmail}`);
      setShareEmail("");
      setShareMessage("");
    } catch (error) {
      console.error("Email sending failed:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const sendSMS = async () => {
    setIsExporting(true);
    try {
      await apiService.sharePracticePlan("current", {
        format: "sms",
        options: shareOptions
      });
      alert("Practice plan summary sent via SMS");
    } catch (error) {
      console.error("SMS sending failed:", error);
      alert("Failed to send SMS. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const addToCalendar = async () => {
    if (!calendarEvent) return;

    setIsExporting(true);
    try {
      let calendarUrl = "";
      
      switch (selectedCalendar) {
        case "google":
          calendarUrl = generateGoogleCalendarUrl(calendarEvent);
          break;
        case "outlook":
          calendarUrl = generateOutlookCalendarUrl(calendarEvent);
          break;
        case "apple":
          calendarUrl = generateAppleCalendarUrl(calendarEvent);
          break;
        default:
          calendarUrl = generateGoogleCalendarUrl(calendarEvent);
      }

      window.open(calendarUrl, '_blank');
    } catch (error) {
      console.error("Calendar integration failed:", error);
      alert("Failed to add to calendar. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const generateGoogleCalendarUrl = (event) => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDateForCalendar(event.startTime)}/${formatDateForCalendar(event.endTime)}`,
      details: event.description,
      location: event.location,
      trp: 'false'
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  };

  const generateOutlookCalendarUrl = (event) => {
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: event.startTime.toISOString(),
      enddt: event.endTime.toISOString(),
      body: event.description,
      location: event.location
    });
    return `https://outlook.live.com/calendar/0/${params}`;
  };

  const generateAppleCalendarUrl = (event) => {
    const params = new URLSearchParams({
      title: event.title,
      description: event.description,
      location: event.location,
      start: event.startTime.toISOString(),
      end: event.endTime.toISOString()
    });
    return `data:text/calendar;charset=utf8,${encodeURIComponent(generateICSContent(event))}`;
  };

  const generateICSContent = (event) => {
    return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
DTSTART:${formatDateForICS(event.startTime)}
DTEND:${formatDateForICS(event.endTime)}
END:VEVENT
END:VCALENDAR`;
  };

  const formatDateForCalendar = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const formatDateForICS = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const generatePlanText = () => {
    let text = `${sportProgram} Practice Plan\n`;
    text += `Generated on: ${new Date().toLocaleDateString()}\n`;
    text += `Total Duration: ${totalDuration} minutes\n`;
    text += `Total Drills: ${totalDrills}\n\n`;
    
    if (shareOptions.includeRoster && rosterDetails.length > 0) {
      text += "ROSTER:\n";
      rosterDetails.forEach(player => {
        text += `- ${player.name} (${player.position})\n`;
      });
      text += "\n";
    }
    
    text += "PRACTICE PERIODS:\n";
    plan.forEach((period, index) => {
      text += `${index + 1}. ${period.name} - ${period.minutes} minutes\n`;
    });
    
    text += "\nSCHEDULED DRILLS:\n";
    drills.forEach((drill, index) => {
      text += `${index + 1}. ${drill.name} - ${drill.duration} minutes`;
      if (drill.timeSlot !== undefined) {
        text += ` (at ${Math.floor(drill.timeSlot / 60)}:${(drill.timeSlot % 60).toString().padStart(2, '0')})`;
      }
      text += "\n";
    });
    
    if (shareOptions.includeFeedback && Object.keys(feedback).length > 0) {
      text += "\nFEEDBACK:\n";
      Object.entries(feedback).forEach(([drillId, feedbackData]) => {
        const drill = drills.find(d => d.id === parseInt(drillId));
        if (drill) {
          text += `${drill.name}: ${feedbackData.rating}/5 - ${feedbackData.notes || 'No notes'}\n`;
        }
      });
    }
    
    return text;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  const shareToSlack = async () => {
    setIsExporting(true);
    try {
      await apiService.sharePracticePlan("current", {
        platform: "slack",
        options: shareOptions
      });
      alert("Practice plan shared to Slack");
    } catch (error) {
      console.error("Slack sharing failed:", error);
      alert("Failed to share to Slack. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const shareToTeams = async () => {
    setIsExporting(true);
    try {
      await apiService.sharePracticePlan("current", {
        platform: "teams",
        options: shareOptions
      });
      alert("Practice plan shared to Microsoft Teams");
    } catch (error) {
      console.error("Teams sharing failed:", error);
      alert("Failed to share to Teams. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-2xl">📤</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Export Practice Plan</h3>
            <p className="text-gray-600">Share your practice plan in multiple formats</p>
          </div>
        </div>
        
        {/* Plan Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Duration</div>
            <div className="text-lg font-semibold text-blue-600">{totalDuration} min</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Drills</div>
            <div className="text-lg font-semibold text-green-600">{totalDrills}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Periods</div>
            <div className="text-lg font-semibold text-purple-600">{plan.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Sport</div>
            <div className="text-lg font-semibold text-orange-600">{sportProgram}</div>
          </div>
        </div>
      </div>

      {/* Share Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-800 mb-4">Share Options</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={shareOptions.includeDrills}
              onChange={(e) => setShareOptions({...shareOptions, includeDrills: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm">Include Drills</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={shareOptions.includeFeedback}
              onChange={(e) => setShareOptions({...shareOptions, includeFeedback: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm">Include Feedback</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={shareOptions.includeRoster}
              onChange={(e) => setShareOptions({...shareOptions, includeRoster: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm">Include Roster</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={shareOptions.includeNotes}
              onChange={(e) => setShareOptions({...shareOptions, includeNotes: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm">Include Notes</span>
          </label>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Export */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-2xl">📄</div>
            <h4 className="text-lg font-medium text-gray-800">PDF Export</h4>
          </div>
          <p className="text-gray-600 mb-4">
            Download a professional PDF version of your practice plan
          </p>
          <button
            onClick={generatePDF}
            disabled={isExporting}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <span>📄</span>
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>

        {/* Shareable Link */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-2xl">🔗</div>
            <h4 className="text-lg font-medium text-gray-800">Shareable Link</h4>
          </div>
          <p className="text-gray-600 mb-4">
            Create a link to share your practice plan with others
          </p>
          {generatedLink ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setGeneratedLink("")}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Generate New Link
              </button>
            </div>
          ) : (
            <button
              onClick={generateShareableLink}
              disabled={isExporting}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Link...</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Generate Link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-2xl">📅</div>
          <h4 className="text-lg font-medium text-gray-800">Calendar Integration</h4>
        </div>
        <p className="text-gray-600 mb-4">
          Add this practice to your calendar
        </p>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedCalendar}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="google">Google Calendar</option>
              <option value="outlook">Outlook Calendar</option>
              <option value="apple">Apple Calendar</option>
            </select>
            <button
              onClick={addToCalendar}
              disabled={isExporting || !calendarEvent}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <span>📅</span>
                  <span>Add to Calendar</span>
                </>
              )}
            </button>
          </div>
          {calendarEvent && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-2">Event Preview:</h5>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Title:</strong> {calendarEvent.title}</div>
                <div><strong>Duration:</strong> {calendarEvent.duration} minutes</div>
                <div><strong>Location:</strong> {calendarEvent.location}</div>
                <div><strong>Attendees:</strong> {calendarEvent.attendees.length} players</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Communication Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Share */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-2xl">📧</div>
            <h4 className="text-lg font-medium text-gray-800">Email Share</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message (Optional)</label>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <button
              onClick={sendEmail}
              disabled={isExporting || !shareEmail.trim()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>📧</span>
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SMS Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-2xl">📱</div>
            <h4 className="text-lg font-medium text-gray-800">SMS Summary</h4>
          </div>
          <p className="text-gray-600 mb-4">
            Send a quick summary of your practice plan via SMS
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h5 className="font-medium text-gray-800 mb-2">Preview:</h5>
            <p className="text-sm text-gray-700">
              {sportProgram} Practice: {totalDuration}min, {totalDrills} drills. 
              {plan.map((p, i) => `${p.name}(${p.minutes}m)${i < plan.length - 1 ? ', ' : ''}`)}
            </p>
          </div>
          <button
            onClick={sendSMS}
            disabled={isExporting}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>📱</span>
                <span>Send SMS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Team Communication */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-800 mb-4">Team Communication</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={shareToSlack}
            disabled={isExporting}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <span>💬</span>
            <span>Slack</span>
          </button>
          <button
            onClick={shareToTeams}
            disabled={isExporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <span>💼</span>
            <span>Teams</span>
          </button>
          <button
            onClick={() => copyToClipboard(generatePlanText())}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Copy Text</span>
          </button>
          <button
            onClick={() => window.print()}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-800 mb-4">Quick Actions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => {
              const dataStr = JSON.stringify({ plan, drills, feedback }, null, 2);
              const dataBlob = new Blob([dataStr], {type: 'application/json'});
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'practice-plan.json';
              link.click();
            }}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            💾 JSON Export
          </button>
          <button
            onClick={() => {
              const csv = generateCSV();
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'practice-plan.csv';
              link.click();
            }}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            📊 CSV Export
          </button>
          <button
            onClick={() => {
              const icsContent = generateICSContent(calendarEvent);
              const blob = new Blob([icsContent], { type: 'text/calendar' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'practice-plan.ics';
              link.click();
            }}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            📅 ICS Export
          </button>
          <button
            onClick={() => {
              const markdown = generateMarkdown();
              const blob = new Blob([markdown], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'practice-plan.md';
              link.click();
            }}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            📝 Markdown
          </button>
        </div>
      </div>
    </div>
  );
};

const generateCSV = () => {
  const headers = ['Drill Name', 'Duration', 'Category', 'Intensity', 'Time Slot'];
  const rows = drills.map(drill => [
    drill.name,
    drill.duration,
    drill.category || 'N/A',
    drill.intensity || 'N/A',
    drill.timeSlot !== undefined ? `${Math.floor(drill.timeSlot / 60)}:${(drill.timeSlot % 60).toString().padStart(2, '0')}` : 'N/A'
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const generateMarkdown = () => {
  let markdown = `# ${sportProgram} Practice Plan\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleDateString()}\n`;
  markdown += `**Duration:** ${totalDuration} minutes\n`;
  markdown += `**Drills:** ${totalDrills}\n\n`;
  
  markdown += `## Practice Periods\n\n`;
  plan.forEach((period, index) => {
    markdown += `${index + 1}. **${period.name}** - ${period.minutes} minutes\n`;
  });
  
  markdown += `\n## Scheduled Drills\n\n`;
  drills.forEach((drill, index) => {
    markdown += `${index + 1}. **${drill.name}** - ${drill.duration} minutes`;
    if (drill.timeSlot !== undefined) {
      markdown += ` (at ${Math.floor(drill.timeSlot / 60)}:${(drill.timeSlot % 60).toString().padStart(2, '0')})`;
    }
    markdown += `\n`;
  });
  
  return markdown;
};

export default ExportPanel; 