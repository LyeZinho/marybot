import { Worker } from 'worker_threads';
import { eventBus } from '../index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Worker Manager - Handles background job processing
 */
export class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.jobQueue = [];
    this.maxWorkers = 4;
    this.setupEventListeners();
  }

  setupEventListeners() {
    eventBus.on('schedule_job', this.scheduleJob.bind(this));
    eventBus.on('worker_request', this.handleWorkerRequest.bind(this));
  }

  async scheduleJob(jobData) {
    const { type, payload, priority = 'normal', delay = 0 } = jobData;
    
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority,
      scheduledAt: Date.now() + delay,
      attempts: 0,
      maxAttempts: 3
    };

    this.jobQueue.push(job);
    this.jobQueue.sort((a, b) => {
      // Sort by priority and scheduled time
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.scheduledAt - b.scheduledAt;
    });

    console.log(`📋 Job scheduled: ${job.id} (${type})`);
    
    // Try to process immediately if workers available
    this.processJobs();
    
    return job.id;
  }

  async processJobs() {
    const now = Date.now();
    
    while (this.jobQueue.length > 0 && this.workers.size < this.maxWorkers) {
      const job = this.jobQueue.find(j => j.scheduledAt <= now);
      if (!job) break;

      // Remove job from queue
      this.jobQueue = this.jobQueue.filter(j => j.id !== job.id);
      
      await this.executeJob(job);
    }
  }

  async executeJob(job) {
    try {
      const workerPath = this.getWorkerPath(job.type);
      if (!workerPath) {
        console.error(`❌ No worker found for job type: ${job.type}`);
        return;
      }

      const worker = new Worker(workerPath, {
        workerData: {
          job: job.payload,
          jobId: job.id,
          jobType: job.type
        }
      });

      this.workers.set(job.id, {
        worker,
        job,
        startTime: Date.now()
      });

      worker.on('message', (result) => {
        this.handleWorkerResult(job.id, result);
      });

      worker.on('error', (error) => {
        this.handleWorkerError(job.id, error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ Worker ${job.id} exited with code ${code}`);
        }
        this.cleanupWorker(job.id);
      });

      console.log(`🔧 Started worker for job ${job.id} (${job.type})`);

    } catch (error) {
      console.error(`❌ Failed to start worker for job ${job.id}:`, error);
      this.retryJob(job);
    }
  }

  handleWorkerResult(jobId, result) {
    const workerInfo = this.workers.get(jobId);
    if (!workerInfo) return;

    const { job } = workerInfo;
    const duration = Date.now() - workerInfo.startTime;

    console.log(`✅ Job ${jobId} completed in ${duration}ms`);

    // Broadcast job completion
    eventBus.broadcast('job_completed', {
      jobId,
      jobType: job.type,
      result,
      duration
    });

    // Handle specific job results
    this.handleJobResult(job.type, result);

    this.cleanupWorker(jobId);
    
    // Process next jobs
    setTimeout(() => this.processJobs(), 100);
  }

  handleWorkerError(jobId, error) {
    const workerInfo = this.workers.get(jobId);
    if (!workerInfo) return;

    const { job } = workerInfo;
    
    console.error(`❌ Worker error for job ${jobId}:`, error);

    this.cleanupWorker(jobId);
    this.retryJob(job);
  }

  retryJob(job) {
    job.attempts++;
    
    if (job.attempts < job.maxAttempts) {
      // Exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000;
      job.scheduledAt = Date.now() + delay;
      
      this.jobQueue.push(job);
      console.log(`🔄 Retrying job ${job.id} in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`);
    } else {
      console.error(`💀 Job ${job.id} failed after ${job.maxAttempts} attempts`);
      
      eventBus.broadcast('job_failed', {
        jobId: job.id,
        jobType: job.type,
        attempts: job.attempts,
        finalError: 'Max retries exceeded'
      });
    }
  }

  cleanupWorker(jobId) {
    const workerInfo = this.workers.get(jobId);
    if (workerInfo) {
      workerInfo.worker.terminate();
      this.workers.delete(jobId);
    }
  }

  getWorkerPath(jobType) {
    const workerPaths = {
      'data_analysis': path.join(__dirname, '../workers/dataAnalysisWorker.js'),
      'image_processing': path.join(__dirname, '../workers/imageProcessingWorker.js'),
      'notification_batch': path.join(__dirname, '../workers/notificationWorker.js'),
      'database_cleanup': path.join(__dirname, '../workers/databaseWorker.js'),
      'report_generation': path.join(__dirname, '../workers/reportWorker.js'),
      'backup_task': path.join(__dirname, '../workers/backupWorker.js')
    };

    return workerPaths[jobType];
  }

  handleJobResult(jobType, result) {
    switch (jobType) {
      case 'data_analysis':
        eventBus.broadcast('analytics_updated', result);
        break;
      case 'notification_batch':
        eventBus.broadcast('notifications_sent', result);
        break;
      case 'database_cleanup':
        eventBus.broadcast('database_cleaned', result);
        break;
      case 'report_generation':
        eventBus.broadcast('report_generated', result);
        break;
      case 'backup_task':
        eventBus.broadcast('backup_completed', result);
        break;
      default:
        console.log(`📊 Job result for ${jobType}:`, result);
    }
  }

  async handleWorkerRequest(data) {
    const { type, payload, options = {} } = data;
    
    return await this.scheduleJob({
      type,
      payload,
      priority: options.priority || 'normal',
      delay: options.delay || 0
    });
  }

  // Get worker statistics
  getStats() {
    return {
      activeWorkers: this.workers.size,
      queuedJobs: this.jobQueue.length,
      maxWorkers: this.maxWorkers,
      workers: Array.from(this.workers.entries()).map(([id, info]) => ({
        jobId: id,
        jobType: info.job.type,
        runtime: Date.now() - info.startTime
      })),
      queue: this.jobQueue.map(job => ({
        id: job.id,
        type: job.type,
        priority: job.priority,
        scheduledAt: new Date(job.scheduledAt).toISOString(),
        attempts: job.attempts
      }))
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down worker manager...');
    
    // Wait for current jobs to complete or timeout after 30 seconds
    const timeout = setTimeout(() => {
      console.log('⚠️ Timeout reached, forcefully terminating workers');
      for (const [jobId] of this.workers) {
        this.cleanupWorker(jobId);
      }
    }, 30000);

    // Wait for all workers to complete
    while (this.workers.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    clearTimeout(timeout);
    console.log('✅ Worker manager shutdown complete');
  }
}

// Initialize the worker manager
export const workerManager = new WorkerManager();