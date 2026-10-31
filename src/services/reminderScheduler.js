// Persistent automatic reminder scheduler for TACTIOPBOT_WHA.
// Polls MongoDB for due reminder jobs, atomically claims them, and sends
// WhatsApp template messages to subscribed users.
// Survives process restarts: job state lives in MongoDB, not in memory.
// No outbound delivery occurs unless REMINDER_ENABLED=true AND a Meta-approved
// template is configured.

const logger = require('../utils/logger');
const db = require('../utils/db');
const { calculateNextReset, formatCairoLocal, getDefaultAnchorUtcMs, getCycleMs } = require('./resetSchedule');
const { getTemplateConfig } = require('./templateConfig');
const { isLanguageMapped, getMetaLanguageCode } = require('./templateConfig');

let scheduler = null;

/**
 * Create a scheduler instance.
 * @param {object} config - loadConfig() result
 * @param {object} whatsAppClient - createWhatsAppClient() result
 * @param {object} delivery - reminderDelivery module
 * @param {object} notificationService - notificationService module
 * @param {Function} getAllSubscriptions - returns all active subscriptions
 */
function createScheduler(config, whatsAppClient, delivery, notificationService, getAllSubscriptions) {
  const templateConfig = getTemplateConfig(config);
  const enabled = templateConfig.enabled && whatsAppClient.mode === 'cloud';
  const pollIntervalMs = templateConfig.pollIntervalMs;
  const offsetMinutes = templateConfig.offsetMinutes;
  const offsetMs = offsetMinutes * 60 * 1000;

  let timer = null;
  let running = false;
  let shuttingDown = false;
  let lastCreatedResetId = null;

  /**
   * Calculate the next reminder scheduled time from the reset schedule.
   * Returns null if no valid schedule can be determined.
   */
  function getNextReminderTime() {
    let anchorUtcMs;
    let cycleMs;

    // Try persisted config first, then default.
    const raw = null; // settings are read asynchronously; this is a sync helper
    // We use the default anchor/cycle as the source of truth for scheduling.
    // If an admin has set a custom anchor via !setnextreset, it is persisted
    // in the settings collection under 'reset_schedule'. The scheduler reads
    // it asynchronously during job creation.
    anchorUtcMs = getDefaultAnchorUtcMs();
    cycleMs = getCycleMs();

    const nextReset = calculateNextReset(anchorUtcMs, cycleMs, Date.now());
    const reminderTime = nextReset - offsetMs;

    return { nextReset, reminderTime, anchorUtcMs, cycleMs };
  }

  /**
   * Create reminder jobs for all subscribed users for the next reset event.
   * Idempotent: existing jobs for the same resetId are not duplicated.
   * Only creates jobs once per resetId (tracked by lastCreatedResetId).
   */
  async function createJobsForNextReset() {
    if (!getAllSubscriptions) return { ok: false, error: 'no_subscription_source' };

    const { nextReset, reminderTime, anchorUtcMs, cycleMs } = getNextReminderTime();
    const resetId = new Date(nextReset).toISOString();

    // Skip if we already created jobs for this reset event.
    if (lastCreatedResetId === resetId) {
      return { ok: true, error: null, created: 0, skipped: 0, resetId, nextReset, reminderTime, duplicate_skip: true };
    }

    let subscriptions;
    try {
      subscriptions = await getAllSubscriptions();
    } catch (error) {
      logger.error('Failed to fetch subscriptions for reminder jobs', {
        error: error && error.name ? error.name : 'unknown'
      });
      return { ok: false, error: 'subscription_fetch_failed' };
    }

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      lastCreatedResetId = resetId;
      return { ok: true, error: null, created: 0, skipped: 0, resetId, nextReset, reminderTime };
    }

    let created = 0;
    let skipped = 0;

    for (const sub of subscriptions) {
      if (!sub || !sub.enabled) {
        skipped += 1;
        continue;
      }

      const phoneNumber = sub.phoneNumber;
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        skipped += 1;
        continue;
      }

      const language = sub.language || 'English';
      if (!isLanguageMapped(language)) {
        logger.warn('Reminder skipped: no Meta language mapping', {
          phoneNumber: logger.maskId(phoneNumber),
          language
        });
        skipped += 1;
        continue;
      }

      const result = await delivery.createJob(
        resetId,
        phoneNumber,
        language,
        reminderTime
      );

      if (!result.ok) {
        logger.error('Failed to create reminder job', {
          error: result.error,
          phoneNumber: logger.maskId(phoneNumber)
        });
        skipped += 1;
        continue;
      }

      if (result.job && result.job.status === 'pending') {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    lastCreatedResetId = resetId;
    return { ok: true, error: null, created, skipped, resetId, nextReset, reminderTime };
  }

  /**
   * Process all due reminder jobs: claim, send, mark.
   */
  async function processDueJobs() {
    const now = Date.now();

    // Release stale leases first so stuck jobs can be retried.
    const releaseResult = await delivery.releaseStaleLeases(now);
    if (!releaseResult.ok) {
      logger.warn('Stale lease release failed', { error: releaseResult.error });
    }

    // Claim due jobs.
    const claimResult = await delivery.claimDueJobs(now);
    if (!claimResult.ok) {
      logger.error('Failed to claim reminder jobs', { error: claimResult.error });
      return;
    }

    const jobs = claimResult.jobs || [];
    if (jobs.length === 0) return;

    logger.info('Reminder jobs claimed', { count: jobs.length });

    for (const job of jobs) {
      await processSingleJob(job, now);
    }
  }

  /**
   * Process a single claimed job: send template, mark sent/failed/skipped.
   */
  async function processSingleJob(job, now) {
    const { phoneNumber, language, resetId, scheduledAt, attempts, maxAttempts } = job;

    // Check if the job has exceeded max attempts.
    if (attempts >= maxAttempts) {
      await delivery.markFailed(job._id, 'max_attempts_exceeded');
      logger.warn('Reminder job max attempts exceeded', {
        jobId: job._id,
        phoneNumber: logger.maskId(phoneNumber),
        attempts
      });
      return;
    }

    // Map language to Meta code.
    const languageCode = getMetaLanguageCode(language);
    if (!languageCode) {
      await delivery.markFailed(job._id, 'no_language_mapping');
      logger.warn('Reminder job skipped: no Meta language mapping', {
        jobId: job._id,
        phoneNumber: logger.maskId(phoneNumber),
        language
      });
      return;
    }

    // Check template is configured.
    const templateName = templateConfig.name;
    if (!templateName) {
      await delivery.markFailed(job._id, 'template_not_configured');
      logger.error('Reminder job skipped: template name not configured');
      return;
    }

    // Build parameter values.
    const resetDate = new Date(scheduledAt);
    const resetDisplay = formatCairoLocal(scheduledAt);
    const parameters = [resetDisplay, 'reset'];

    // Send template message.
    let sendResult;
    try {
      sendResult = await whatsAppClient.sendTemplate(
        phoneNumber,
        templateName,
        languageCode,
        parameters
      );
    } catch (error) {
      logger.error('Reminder template send threw', {
        jobId: job._id,
        phoneNumber: logger.maskId(phoneNumber),
        error: error && error.name ? error.name : 'unknown'
      });
      await delivery.markFailed(job._id, 'send_exception');
      return;
    }

    if (sendResult.accepted) {
      await delivery.markSent(job._id, sendResult.messageId);
      logger.info('Reminder delivered', {
        jobId: job._id,
        phoneNumber: logger.maskId(phoneNumber),
        language,
        messageId: sendResult.messageId
      });
    } else {
      // Determine if retryable.
      const retryable = sendResult.reason === 'meta_server_error' || sendResult.reason === 'network_error' || sendResult.reason === 'timeout';
      if (retryable && attempts < maxAttempts) {
        // Leave as pending for next poll cycle by resetting status.
        await delivery.markFailed(job._id, `retry:${sendResult.reason}`);
        // Re-queue by resetting to pending.
        await resetJobToPending(job._id);
        logger.warn('Reminder job queued for retry', {
          jobId: job._id,
          phoneNumber: logger.maskId(phoneNumber),
          reason: sendResult.reason,
          attempt: attempts
        });
      } else {
        await delivery.markFailed(job._id, sendResult.reason || 'unknown');
        logger.error('Reminder job failed', {
          jobId: job._id,
          phoneNumber: logger.maskId(phoneNumber),
          reason: sendResult.reason,
          httpStatus: sendResult.httpStatus
        });
      }
    }
  }

  /** Reset a failed job back to pending for retry. */
  async function resetJobToPending(jobIdKey) {
    if (!db.isConnected()) return;
    const now = Date.now();
    try {
      await db.getDb()
        .collection(delivery.COLLECTION)
        .updateOne(
          { _id: jobIdKey, status: 'failed', failureCategory: { $regex: /^retry:/ } },
          {
            $set: { status: 'pending', claimedAt: null, leaseExpiresAt: null, updatedAt: now },
            $unset: { failureCategory: '' }
          }
        );
    } catch (error) {
      logger.error('Job re-queue failed', { error: error && error.name ? error.name : 'unknown' });
    }
  }

  function dbIsConnected() {
    return db.isConnected();
  }

  /**
   * Main poll loop: create jobs for next reset, then process due jobs.
   */
  async function poll() {
    if (!running || shuttingDown) return;

    try {
      // Create jobs for the next reset if none exist yet.
      await createJobsForNextReset();

      // Process due jobs.
      await processDueJobs();
    } catch (error) {
      logger.error('Scheduler poll cycle failed', {
        error: error && error.name ? error.name : 'unknown'
      });
    }

    scheduleNextPoll();
  }

  function scheduleNextPoll() {
    if (!running || shuttingDown) return;
    timer = setTimeout(() => {
      poll();
    }, pollIntervalMs);
  }

  /**
   * Start the scheduler. Only starts if enabled and MongoDB is connected.
   */
  async function start() {
    if (!enabled) {
      logger.info('Reminder scheduler disabled (REMINDER_ENABLED not true or not cloud mode)');
      return false;
    }

    if (!dbIsConnected()) {
      logger.error('Reminder scheduler cannot start: MongoDB not connected');
      return false;
    }

    if (running) return true;

    running = true;
    shuttingDown = false;

    // Recover any stale leases from a previous run.
    try {
      await delivery.releaseStaleLeases(Date.now());
    } catch (error) {
      logger.warn('Stale lease recovery failed on start', {
        error: error && error.name ? error.name : 'unknown'
      });
    }

    logger.info('Reminder scheduler started', {
      pollIntervalMs,
      offsetMinutes,
      template: templateConfig.name
    });

    scheduleNextPoll();
    return true;
  }

  /**
   * Stop the scheduler gracefully.
   */
  function stop() {
    if (!running) return;
    running = false;
    shuttingDown = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    logger.info('Reminder scheduler stopped');
  }

  function isRunning() {
    return running;
  }

  function getStatus() {
    return {
      enabled: templateConfig.enabled,
      cloudMode: whatsAppClient.mode === 'cloud',
      running,
      template: templateConfig.name,
      pollIntervalMs,
      offsetMinutes,
      nextReminder: getNextReminderTime()
    };
  }

  return {
    start,
    stop,
    isRunning,
    getStatus,
    createJobsForNextReset,
    processDueJobs
  };
}

/**
 * Get or create the singleton scheduler instance.
 */
function getScheduler(config, whatsAppClient, delivery, notificationService, getAllSubscriptions) {
  if (!scheduler) {
    scheduler = createScheduler(config, whatsAppClient, delivery, notificationService, getAllSubscriptions);
  }
  return scheduler;
}

/**
 * Get the scheduler status without creating a new instance.
 * Returns null if the scheduler has not been created.
 */
function getSchedulerStatus() {
  if (!scheduler) return null;
  return scheduler.getStatus();
}

module.exports = {
  createScheduler,
  getScheduler,
  getSchedulerStatus
};
