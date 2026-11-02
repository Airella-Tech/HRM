
export const EMAIL_LOGS_KEY = "hrm_interview_email_logs";
export const EMAIL_LOGS_UPDATED_EVENT =
  "hrm-interview-email-logs-updated";

export const readInterviewEmailLogs = () => {
  try {
    const stored = localStorage.getItem(EMAIL_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Unable to read interview email logs:", error);
    return [];
  }
};

export const saveInterviewEmailLog = (log) => {
  try {
    const logs = readInterviewEmailLogs();

    const newLog = {
      ...log,
      id: log.id || `email-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      EMAIL_LOGS_KEY,
      JSON.stringify([newLog, ...logs])
    );

    window.dispatchEvent(
      new Event(EMAIL_LOGS_UPDATED_EVENT)
    );

    return newLog;
  } catch (error) {
    console.error("Unable to save interview email log:", error);
    return null;
  }
};

export const updateInterviewEmailLog = (id, changes) => {
  const logs = readInterviewEmailLogs();

  const updatedLogs = logs.map((log) =>
    String(log.id) === String(id)
      ? { ...log, ...changes }
      : log
  );

  localStorage.setItem(
    EMAIL_LOGS_KEY,
    JSON.stringify(updatedLogs)
  );

  window.dispatchEvent(
    new Event(EMAIL_LOGS_UPDATED_EVENT)
  );

  return updatedLogs;
};
